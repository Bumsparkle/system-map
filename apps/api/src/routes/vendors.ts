import type {
  VendorCacheSource,
  VendorLookup,
  VendorLookupSource,
  VendorMaturity,
} from '@system-map/shared'
import { eq } from 'drizzle-orm'
import type { FastifyPluginAsync } from 'fastify'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { findVendorMetadata, normaliseVendorQuery } from '../data/vendor-metadata'
import { db, schema } from '../db/client'
import { mirrorLogo } from '../lib/logoMirror'
import { fetchWikipediaSummary } from '../lib/wikipedia'

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

const lookupQuery = z.object({ q: z.string().min(1).max(120) })

export const vendorRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/vendors/lookup?q= — full enriched record (cache-first). Never 4xx/5xx
  // beyond a missing query param; enrichment failures degrade to a sparse node.
  app.get('/vendors/lookup', async (req) => {
    const { q } = lookupQuery.parse(req.query)
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

    // Cache write is best-effort: never let a DB hiccup break the lookup.
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
      req.log.warn({ err }, 'vendor cache write failed')
    }

    return rowToLookup({ ...row }, enriched.source)
  })
}
