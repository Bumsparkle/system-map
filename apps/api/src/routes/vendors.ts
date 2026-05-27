import type {
  VendorCacheSource,
  VendorLookup,
  VendorLookupSource,
  VendorMaturity,
  VendorSuggestion,
} from '@system-map/shared'
import { eq, like } from 'drizzle-orm'
import type { FastifyBaseLogger, FastifyPluginAsync } from 'fastify'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { VENDOR_METADATA, findVendorMetadata, normaliseVendorQuery } from '../data/vendor-metadata'
import { db, schema } from '../db/client'
import { mirrorLogo } from '../lib/logoMirror'
import { fetchWikipediaOpenSearch, fetchWikipediaSummary } from '../lib/wikipedia'

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Cache key: normalised query with spaces hyphenated (spec §2.2). */
function cacheKey(q: string): string {
  return normaliseVendorQuery(q).replace(/ /g, '-')
}

/** Title-case for Wikipedia lookups — its titles only auto-capitalise the first
 *  letter, so a typed-lowercase "octo telematics" must become "Octo Telematics". */
function toTitleCase(q: string): string {
  return q.trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

type VendorRow = typeof schema.vendorCache.$inferSelect

function rowToLookup(row: VendorRow, source: VendorLookupSource): VendorLookup {
  return {
    name: row.resolvedName ?? '',
    domain: row.domain ?? null,
    logoUrl: row.logoUrl ?? null,
    description: row.description ?? null,
    category: row.category ?? null,
    maturity: row.maturity ?? null,
    wikipediaUrl: row.wikipediaUrl ?? null,
    source,
    fetchedAt: row.fetchedAt.toISOString(),
  }
}

type Enriched = {
  resolvedName: string
  domain: string | null
  logoUrl: string | null
  description: string | null
  category: string | null
  maturity: VendorMaturity | null
  wikipediaUrl: string | null
  source: VendorCacheSource
}

/**
 * Resolve a vendor: static metadata for category/maturity/domain, plus live
 * Wikipedia (description) and logo.dev (mirrored logo), fetched in parallel
 * with hard timeouts. Must never throw — the lookup endpoint can never produce
 * a broken state, only a sparser one.
 */
async function enrichVendor(q: string): Promise<Enriched> {
  const meta = findVendorMetadata(q)
  // Logo domain: static metadata, else a best-effort guess (right ~80% for SaaS).
  const domain = meta?.domain ?? `${normaliseVendorQuery(q).replace(/ /g, '')}.com`
  // Wikipedia only for curated vendors with a known-good title, or for unknowns
  // (title-cased so multi-word names resolve; the helper rejects disambiguation).
  const wikiQuery = meta ? meta.wikiTitle : toTitleCase(q)

  const [wiki, logoUrl] = await Promise.all([
    wikiQuery ? fetchWikipediaSummary(wikiQuery) : Promise.resolve(null),
    mirrorLogo(domain),
  ])

  const description = wiki?.description ?? null
  // Best name: curated canonical name, else the resolved Wikipedia title, else the typed text.
  const resolvedName = meta?.name ?? wiki?.title ?? q.trim()
  const source: VendorCacheSource =
    description || logoUrl ? 'live' : meta ? 'static-only' : 'fallback'

  return {
    resolvedName,
    // Only expose a domain we trust: a curated one, or a guess that resolved a logo.
    domain: meta?.domain ?? (logoUrl ? domain : null),
    logoUrl,
    description,
    category: meta?.category ?? null,
    maturity: meta?.maturity ?? null,
    wikipediaUrl: wiki?.pageUrl ?? null,
    source,
  }
}

/** Full lookup: cache-first, else enrich + write-through. Reused by /lookup and
 *  /cache/warm. Never throws on enrichment; cache writes are best-effort. */
async function resolveVendor(q: string, log: FastifyBaseLogger): Promise<VendorLookup> {
  const key = cacheKey(q)

  const [cached] = await db
    .select()
    .from(schema.vendorCache)
    .where(eq(schema.vendorCache.query, key))
    .limit(1)
  if (cached && cached.expiresAt > new Date()) return rowToLookup(cached, 'cache')

  const enriched = await enrichVendor(q)
  const now = new Date()
  const row = {
    id: cached?.id ?? nanoid(),
    query: key,
    resolvedName: enriched.resolvedName,
    domain: enriched.domain,
    logoUrl: enriched.logoUrl,
    description: enriched.description,
    category: enriched.category,
    maturity: enriched.maturity,
    wikipediaUrl: enriched.wikipediaUrl,
    source: enriched.source,
    fetchedAt: now,
    expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
  }

  try {
    await db
      .insert(schema.vendorCache)
      .values(row)
      .onConflictDoUpdate({
        target: schema.vendorCache.query,
        set: {
          resolvedName: row.resolvedName,
          domain: row.domain,
          logoUrl: row.logoUrl,
          description: row.description,
          category: row.category,
          maturity: row.maturity,
          wikipediaUrl: row.wikipediaUrl,
          source: row.source,
          fetchedAt: row.fetchedAt,
          expiresAt: row.expiresAt,
        },
      })
  } catch (err) {
    log.warn({ err }, 'vendor cache write failed')
  }

  return rowToLookup(row, enriched.source)
}

/** Typeahead suggestions: curated static metadata + cache prefix-matches first
 *  (instant), topped up from Wikipedia OpenSearch. Deduped by name, max 8. */
async function searchVendors(q: string): Promise<VendorSuggestion[]> {
  const norm = normaliseVendorQuery(q)
  const out: VendorSuggestion[] = []
  const seen = new Set<string>()
  const add = (name: string, hint: string | undefined, source: VendorSuggestion['source']) => {
    const dedupe = name.toLowerCase()
    if (!name || seen.has(dedupe) || out.length >= 8) return
    seen.add(dedupe)
    out.push(hint ? { name, hint, source } : { name, source })
  }

  // 1. Curated metadata (prefix match on key, name, or alias) — instant + on-brand.
  for (const meta of Object.values(VENDOR_METADATA)) {
    const hay = [meta.name, ...(meta.aliases ?? [])].map(normaliseVendorQuery)
    if (hay.some((h) => h.startsWith(norm))) add(meta.name, meta.category, 'cache')
  }

  // 2. Cache prefix matches (warmed vendors, incl. previously-looked-up unknowns).
  if (out.length < 8) {
    const rows = await db
      .select({ name: schema.vendorCache.resolvedName, category: schema.vendorCache.category })
      .from(schema.vendorCache)
      .where(like(schema.vendorCache.query, `${cacheKey(q)}%`))
      .limit(8)
    for (const r of rows) if (r.name) add(r.name, r.category ?? undefined, 'cache')
  }

  // 3. Top up from Wikipedia OpenSearch.
  if (out.length < 8) {
    const titles = await fetchWikipediaOpenSearch(q, 8)
    for (const t of titles) add(t, undefined, 'wikipedia')
  }

  return out.slice(0, 8)
}

const lookupQuery = z.object({ q: z.string().min(1).max(120) })
const searchQuery = z.object({ q: z.string().min(1).max(120) })
const warmBody = z.object({ queries: z.array(z.string().min(1).max(120)).max(200) })

export const vendorRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/vendors/lookup?q= — full enriched record (cache-first). Never 4xx/5xx
  // beyond a missing query param; enrichment failures degrade to a sparse node.
  app.get('/vendors/lookup', async (req) => {
    const { q } = lookupQuery.parse(req.query)
    return resolveVendor(q, req.log)
  })

  // GET /api/vendors/search?q= — fast typeahead suggestions (cache-first).
  app.get('/vendors/search', async (req) => {
    const { q } = searchQuery.parse(req.query)
    return searchVendors(q)
  })

  // POST /api/vendors/cache/warm — admin: pre-warm the cache before a demo so
  // every search is a hit. Body: { queries: string[] }. No auth (don't deploy).
  app.post('/vendors/cache/warm', async (req) => {
    const { queries } = warmBody.parse(req.body)
    let warmed = 0
    for (const q of queries) {
      try {
        await resolveVendor(q, req.log)
        warmed++
      } catch (err) {
        req.log.warn({ err, q }, 'warm failed for query')
      }
    }
    return { warmed, total: queries.length }
  })
}
