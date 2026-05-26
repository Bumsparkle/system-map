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

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Cache key: normalised query with spaces hyphenated (spec §2.2). */
function cacheKey(q: string): string {
  return normaliseVendorQuery(q).replace(/ /g, '-')
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
  source: VendorCacheSource
}

/**
 * Resolve a vendor from static metadata. Phase 2 extends this with live
 * Wikipedia + logo.dev enrichment; for now it's static-only / fallback.
 * Must never throw — the lookup endpoint can never produce a broken state.
 */
async function enrichVendor(q: string): Promise<Enriched> {
  const meta = findVendorMetadata(q)
  if (meta) {
    return {
      resolvedName: meta.name,
      domain: meta.domain,
      logoUrl: null,
      description: null,
      category: meta.category,
      maturity: meta.maturity,
      source: 'static-only',
    }
  }
  return {
    resolvedName: q.trim(),
    domain: null,
    logoUrl: null,
    description: null,
    category: null,
    maturity: null,
    source: 'fallback',
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
