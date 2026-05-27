// Pre-warm the vendor cache before a demo (spec v1.2 §5) so every search/lookup
// is a hit (<10ms) and logos are already mirrored to disk.
//   pnpm --filter @system-map/api warm
import { VENDOR_METADATA } from '../data/vendor-metadata'

const API = process.env.API_URL ?? 'http://localhost:3001'
const queries = Object.keys(VENDOR_METADATA)

let warmed = 0
for (const q of queries) {
  try {
    // fresh=1 forces a re-fetch so logos/descriptions populate even over a
    // previously-warmed (logo-less) cache entry.
    const res = await fetch(`${API}/api/vendors/lookup?q=${encodeURIComponent(q)}&fresh=1`)
    const data = (await res.json()) as { logoUrl?: string | null; description?: string | null }
    const tags = [data.logoUrl ? 'logo' : null, data.description ? 'wiki' : null].filter(Boolean)
    console.log(`✓ ${q}${tags.length ? ` (${tags.join(', ')})` : ''}`)
    warmed++
  } catch (err) {
    console.log(`✗ ${q}: ${String(err)}`)
  }
}

console.log(`\nWarmed ${warmed}/${queries.length} vendors against ${API}`)
process.exit(0)
