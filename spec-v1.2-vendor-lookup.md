# System Map — Vendor Lookup via Clearbit (v1.2)

Follow-on spec. Adds a live vendor lookup to the App node, powered by Clearbit's Logo API and Wikipedia. Designed so the demo feels instant and never breaks.

Stack, design tokens, and conventions from spec.md still apply. TS strict, no `any`, commit per phase, ask before substituting.

---

## 0. The pitch this enables

When the user drops an "App" node onto the canvas, instead of a blank node with a text field, they get a vendor search. They type "guide" and see Guidewire with logo + description. Click → node populates. Looks like a Magellan integration; isn't (yet).

For the demo conversation: "This pulls from Clearbit and Wikipedia today. The production version pulls from Magellan with your proprietary maturity tiers and analyst notes."

---

## 1. Architecture overview

Three layers, each with caching:

```
User types "guidewire"
       ↓
[Frontend typeahead]  ←  debounced 250ms, hits backend
       ↓
[Backend /api/vendors/lookup]  →  checks Postgres cache
       ↓                            (7-day TTL)
   Cache miss?
       ↓
   Parallel fetch:
     - Clearbit logo (logo.clearbit.com/{domain})
     - Wikipedia summary (REST API)
     - Static insurance metadata (JSON lookup in code)
       ↓
   Merge → write to cache → return to frontend
       ↓
[Frontend renders node]  ←  skeleton state for ~300ms, then fills in
```

---

## 2. Backend changes

### 2.1 New table: `vendor_cache`

```ts
vendor_cache {
  id: text PK                    // nanoid
  query: text UNIQUE NOT NULL    // normalised search query, lowercased
  resolved_name: text            // "Guidewire Software"
  domain: text                   // "guidewire.com"
  logo_url: text                 // mirrored URL on our side (see §2.4)
  description: text              // one-paragraph summary
  category: text                 // from static metadata, nullable
  maturity: text                 // 'established' | 'growth' | 'emerging' | null
  source: text NOT NULL          // 'clearbit+wiki' | 'static' | 'fallback'
  fetched_at: timestamp NOT NULL
  expires_at: timestamp NOT NULL // fetched_at + 7 days
}
```

Index on `query`. Don't bother with full-text search on this table — it's a lookup cache, not the search index.

### 2.2 New endpoints

```
GET  /api/vendors/search?q=guide        # typeahead suggestions, fast path
GET  /api/vendors/lookup?q=guidewire    # full lookup, returns enriched data
POST /api/vendors/cache/warm            # admin: pre-warm cache for demo
```

#### `GET /api/vendors/search?q={query}`

Returns up to 8 suggestions. **This is the typeahead path — must be fast (<200ms).**

Logic:
1. Check `vendor_cache` for any rows where `query LIKE '{q}%'` (prefix match, lowercased) — return those first
2. If fewer than 8 results, call Wikipedia OpenSearch API: `https://en.wikipedia.org/w/api.php?action=opensearch&search={q}&limit=8&format=json`
3. Merge results, dedupe by name, return as:

```ts
type VendorSuggestion = {
  name: string
  hint?: string        // category if known, else nothing
  source: 'cache' | 'wikipedia'
}
```

The frontend uses this for the dropdown list. Don't fetch logos or full descriptions for suggestions — that's what `/lookup` does after the user picks one.

#### `GET /api/vendors/lookup?q={query}`

Returns the full enriched vendor data. **Called once per node creation. Allowed to be slower (up to 1s p95).**

Logic:
1. Normalise `q`: lowercase, trim, replace spaces with hyphens for cache key
2. Check `vendor_cache` — if hit and not expired, return cached row
3. Check static insurance metadata file — if `q` matches a known vendor, get `{category, maturity, domain}`
4. Parallel-fetch:
   - **Wikipedia**: `https://en.wikipedia.org/api/rest_v1/page/summary/{encodeURIComponent(q)}` — returns `{title, extract, thumbnail, content_urls}`. Use `extract` (one paragraph) as description.
   - **Domain resolution**: if static metadata gave us a domain, use it. Otherwise, derive from Wikipedia's `content_urls.desktop.page` infobox if possible, OR fall back to a guess: `{normalisedName}.com` (works ~80% of the time for SaaS).
   - **Clearbit logo**: `https://logo.clearbit.com/{domain}` — Clearbit returns the image directly, no JSON.
5. Validate Clearbit response: if status 404 or content-type isn't `image/*`, mark logo as null (frontend will use a fallback icon).
6. Mirror the logo: download the image, store to `/uploads/vendor-logos/{nanoid}.png` on disk (or S3/R2 if you're feeling fancy — disk is fine for demo). Save the local URL as `logo_url`. This insulates the demo from Clearbit going down.
7. Merge into one response:

```ts
type VendorLookup = {
  name: string              // best resolved name
  domain: string | null
  logoUrl: string | null    // YOUR mirrored URL, not Clearbit's
  description: string | null
  category: string | null
  maturity: 'established' | 'growth' | 'emerging' | null
  source: 'cache' | 'live' | 'static-only' | 'fallback'
  fetchedAt: string         // ISO
}
```

8. Write to `vendor_cache`, return.

#### `POST /api/vendors/cache/warm`

Body: `{ queries: string[] }`. Iterates through each, calls the same lookup logic, populates the cache. No auth for now — just don't expose this in production. **Run this once before any demo** with the list of vendors you expect to search.

### 2.3 Static insurance metadata

Create `apps/api/src/data/vendor-metadata.ts`:

```ts
export const VENDOR_METADATA: Record<string, {
  domain: string
  category: string
  maturity: 'established' | 'growth' | 'emerging'
  aliases?: string[]
}> = {
  'guidewire': {
    domain: 'guidewire.com',
    category: 'Policy Admin',
    maturity: 'established',
    aliases: ['guidewire software']
  },
  'duck creek': {
    domain: 'duckcreek.com',
    category: 'Policy Admin',
    maturity: 'established',
    aliases: ['duck creek technologies']
  },
  'sapiens': {
    domain: 'sapiens.com',
    category: 'Policy Admin',
    maturity: 'established'
  },
  'shift technology': {
    domain: 'shift-technology.com',
    category: 'Claims · Fraud',
    maturity: 'growth'
  },
  'tractable': {
    domain: 'tractable.ai',
    category: 'Claims · Damage Assessment',
    maturity: 'growth'
  },
  // ... ~30-50 entries
  // See §3 for the full curated list
}

// Normalisation helper for matching
export function normaliseVendorQuery(q: string): string {
  return q.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')
}

export function findVendorMetadata(q: string) {
  const norm = normaliseVendorQuery(q)
  // Direct match
  if (VENDOR_METADATA[norm]) return VENDOR_METADATA[norm]
  // Alias match
  for (const [key, value] of Object.entries(VENDOR_METADATA)) {
    if (value.aliases?.some(a => normaliseVendorQuery(a) === norm)) {
      return VENDOR_METADATA[key]
    }
  }
  return null
}
```

This is the file you keep updating as you find missing vendors. **Treat the demo prep as iteratively adding to this file.**

### 2.4 Logo mirroring

When fetching from Clearbit, download to disk and serve from your own backend. Reasons:
- Clearbit could rate-limit, change pricing, or shut the free API down
- Demo works offline if needed
- Faster on second load (your CDN/server > clearbit.com over their TLS)

Implementation:
```ts
// apps/api/src/lib/logoMirror.ts
async function mirrorLogo(domain: string): Promise<string | null> {
  const clearbitUrl = `https://logo.clearbit.com/${domain}`
  try {
    const response = await fetch(clearbitUrl, { 
      signal: AbortSignal.timeout(2000)  // hard timeout
    })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type')
    if (!contentType?.startsWith('image/')) return null
    
    const buffer = Buffer.from(await response.arrayBuffer())
    const filename = `${nanoid()}.${contentType.split('/')[1]}`
    const path = `./uploads/vendor-logos/${filename}`
    await fs.writeFile(path, buffer)
    return `/uploads/vendor-logos/${filename}`
  } catch {
    return null
  }
}
```

Serve `/uploads/*` as a static directory via Fastify's `@fastify/static` plugin.

### 2.5 Fallback chain

If everything fails:
1. Clearbit timeout/404 → `logoUrl: null`, frontend renders type-default icon
2. Wikipedia timeout/404 → `description: null`, frontend hides the description line
3. Static metadata miss + Wikipedia miss → still return `{name: q, logoUrl: null, description: null, source: 'fallback'}`. Frontend creates the node with just the typed name.

**Never** return a 4xx/5xx from the lookup endpoint. The demo cannot have a broken state. Worst case is a sparse node, which still looks intentional.

---

## 3. The curated metadata list

Hand-curate the following ~50 vendors into `vendor-metadata.ts`. Spend ~30 min on this — the categorisation should *look* like Magellan's taxonomy.

**Policy Admin / Core Systems**: Guidewire, Duck Creek, Sapiens, Insurity, Majesco, EIS Group, INSTANDA, Socotra, hyperexponential

**Underwriter Workbench**: Send, Artificial Labs, Cytora, Concirrus, Akur8, Atticus.ai, Quotech

**Claims**: Shift Technology, Tractable, Sprout.ai, Snapsheet, ClaimVantage, FRISS

**Distribution / Broker tech**: Whitespace, PPL, Acturis, Applied Systems, Vertafore, Novidea

**Lloyd's-specific**: Whitespace, PPL, ECF (Electronic Claims File), DXC's London Market platform, Lloyd's Blueprint Two artifacts

**Pricing & Rating**: hyperexponential, Akur8, Earnix, Quantee

**Data & Analytics (horizontals)**: Snowflake, Databricks, dbt Labs, Fivetran, Looker

**Cloud / Infra (horizontals)**: AWS, Azure, GCP, Cloudflare

**Productivity (horizontals)**: Salesforce, Microsoft 365, Slack, Zoom, DocuSign

**Compliance / Risk**: OneTrust, ServiceNow GRC, Resolver, LogicGate

For each: name (canonical), domain, category (use the bucket above as the category string), maturity tier, 1-2 aliases.

**Maturity tagging principles** (so it looks deliberate):
- `established`: 15+ years old, dominant market position, public or huge private (Guidewire, Salesforce, Snowflake, Acturis)
- `growth`: 5-15 years old, Series B+ or profitable, real market traction (Shift, Tractable, Cytora, Send)
- `emerging`: <5 years or pre-Series B, interesting but unproven (newer InsurTechs)

Don't make this too granular. Three tiers, applied consistently, is exactly what makes it feel like analyst-curated data.

---

## 4. Frontend changes

### 4.1 New component: `VendorSearchInput`

Used inside the App node when it's first dropped onto the canvas (i.e. when `data.vendorName` is empty).

Visual:
- Borderless input, 14px Geist, placeholder "Search vendor…"
- Below: dropdown of suggestions, max 8 rows
- Each row: vendor name (left), category chip (right, muted)
- Keyboard nav: arrows + enter, escape closes
- Highlighted row: `--color-accent-soft` background

Behaviour:
- Debounce 250ms before hitting `/api/vendors/search`
- Show typing indicator only if response takes >400ms (avoid flicker for fast cache hits)
- On select: call `/api/vendors/lookup` with the resolved name → optimistically update node with skeleton state → swap in real data when response arrives

### 4.2 App node states

The App node now has three visual states:

**Empty (just dropped)**:
- Shows the `VendorSearchInput`
- Node width is fixed at 220px during search, expands to content after
- Cursor auto-focuses the input

**Loading (vendor picked, data fetching)**:
- Logo area: 32x32 shimmer placeholder (use a CSS `@keyframes` shimmer on `--color-surface-2`)
- Name: real vendor name shows immediately (we know it from the suggestion)
- Description: 2 shimmer lines
- Category chip: shimmer placeholder
- This state typically lasts 200-500ms — must look intentional, not glitchy

**Loaded**:
- 32x32 logo, left-aligned
- Vendor name (Geist Medium 14px)
- Category chip below name (Geist 11px, in a `--color-surface-2` rounded-sm chip)
- Maturity dot: 6px circle, top-right corner of node, color-coded:
  - established: `--color-ink-muted`
  - growth: `--color-accent` (burnt sienna — your existing accent)
  - emerging: `#7B6BC4` (a calm purple, distinct from accent)
  - Tooltip on hover: "Established / Growth / Emerging"
- Description: shown in inspector only, NOT on the node face (keeps node small)

### 4.3 Inspector updates

The NodeInspector for App nodes gains a "Vendor" section above "Appearance":

- Logo (64x64) + name + category chip
- Maturity tier with the colored dot
- Description (the Wikipedia paragraph)
- "View on Wikipedia" link (only if source includes wiki data)
- "Re-fetch from source" button (clears cache for this vendor, re-runs lookup) — useful when demoing and a stale logo annoys you

### 4.4 The "feels-like-Magellan" tell

In the inspector, add a small data source line at the bottom of the Vendor section:

> Source: Clearbit · Wikipedia · [demo data] — *In production, this would pull from Magellan.*

This is doing two jobs: (1) tells partners honestly what's powering it, (2) primes them for the upgrade pitch. Don't hide the seams — *use* them. Make it muted (text-xs, `--color-ink-subtle`), not loud.

---

## 5. Performance — hide the latency obsessively

This is the entire game. If the partner sees a spinner, the demo fails.

### Tactics:

1. **Pre-warm before every demo.** Run `POST /api/vendors/cache/warm` with the full list of ~50 curated vendors before walking into the room. Logos download to disk, descriptions cache to Postgres. Every demo search is now a cache hit (<10ms).

2. **Typeahead uses cache-first.** The `/search` endpoint hits the local cache before Wikipedia. After pre-warming, typing "guide" returns Guidewire instantly without any external call.

3. **Optimistic node placement.** When user picks a vendor from suggestions, the node appears on canvas *before* the `/lookup` response arrives, with the name filled in. The logo and description swap in 200ms later. This makes the placement feel instant even on cold lookups.

4. **Skeleton shimmer, not spinners.** Use a CSS shimmer animation on placeholder boxes. Spinners signal "waiting"; skeletons signal "loading and almost done." Big psychological difference.

5. **Two-second hard timeouts on external calls.** Clearbit slow? Wikipedia slow? Cut the call, return what we have. Don't let one slow API hold the response.

6. **Pre-load fonts and CSS.** Make sure Geist is preloaded in the HTML head; first-paint of the suggestion dropdown should never wait for a font swap.

### Pre-warm script

Add `apps/api/src/scripts/warmCache.ts`:

```ts
// pnpm tsx apps/api/src/scripts/warmCache.ts
import { VENDOR_METADATA } from '../data/vendor-metadata'

const queries = Object.keys(VENDOR_METADATA)
for (const q of queries) {
  await fetch(`http://localhost:3001/api/vendors/lookup?q=${encodeURIComponent(q)}`)
  console.log(`✓ ${q}`)
}
console.log(`Warmed ${queries.length} vendors`)
```

Run this as the first step of the demo morning. Should take ~30-60 seconds.

---

## 6. The demo diagram (preload this too)

Don't open the demo to an empty canvas. Pre-build a sample diagram called **"Project Atlantic — Lloyd's syndicate target operating model"** with 12-15 vendors already placed, on two layers: "Current state" and "Future state" (toggle between them).

Current state shows: legacy policy admin (something tired-looking — Sapiens or similar), Excel-heavy underwriting (mark a "Manual" node), one workbench attempt, broken integrations.

Future state shows: modern stack — hyperexponential for pricing, Send or Artificial for workbench, Shift for fraud, Snowflake for data warehouse, all integrated with typed flows.

This isn't part of the Clearbit work but it's what *sells* the Clearbit work. The partner sees a finished-looking artifact, not an empty canvas. Spend half a day on it.

---

## 7. Phasing

Do these in order, commit per phase.

**Phase 1 — Backend foundation** (~half day)
- Drizzle migration for `vendor_cache` table
- Static metadata file with first 20 vendors
- `/api/vendors/lookup` endpoint with cache + static metadata only (no live calls yet)
- Test: lookup for "guidewire" returns category and maturity

**Phase 2 — Live data** (~half day)
- Wikipedia REST API integration
- Clearbit logo fetch + disk mirroring
- Hard timeouts, fallback chain
- Test: lookup for an unknown vendor like "Concirrus" returns Wikipedia description and a logo

**Phase 3 — Typeahead** (~2 hours)
- `/api/vendors/search` endpoint with Wikipedia OpenSearch
- Cache-first ordering

**Phase 4 — Frontend integration** (~half day)
- `VendorSearchInput` component
- App node empty/loading/loaded states with shimmer
- Inspector vendor section

**Phase 5 — Polish & demo prep** (~half day)
- Pre-warm script
- Curate full list to ~50 vendors
- Build the "Project Atlantic" demo diagram
- Test the full demo flow on the laptop you'll demo from, on Oxbow's Wi-Fi if possible

Total: ~2.5 days of focused work.

---

## 8. Acceptance check before the demo

Walk through this on the demo laptop, on the demo network, the day before:

1. Cold cache (truncate `vendor_cache` table) — pre-warm script runs in under 60s and reports all vendors warmed
2. Drop an App node onto canvas → search input focuses automatically
3. Type "guide" → dropdown shows Guidewire within 300ms with category chip
4. Click Guidewire → node placed immediately with name, logo appears within 500ms
5. Inspector opens → shows logo, category, maturity dot, Wikipedia description, source line
6. Type something obscure that's not in static metadata (e.g. "Octo Telematics") → Wikipedia fills the description, Clearbit fills the logo, source shows `live`, no maturity badge
7. Type pure nonsense ("xyzqq123") → node still created with just the typed name, no error, no crash
8. Disconnect network, drop another known vendor (cache hit) → still works perfectly
9. Disconnect network, drop an unknown vendor → falls back gracefully to name-only node
10. Visual: shimmer state never flashes for less than 100ms (no flicker) and never lasts more than 1.5s (no waiting)
11. Demo diagram "Project Atlantic" opens with all logos already loaded — no loading state visible to the user
12. Maturity dots: established = grey, growth = burnt sienna, emerging = calm purple

If all 12 pass: the demo will hold up.

---

## 9. The Magellan upgrade story (for the conversation, not code)

When the partner asks "so what would the real version look like?" — your answer:

> "Same data model, different source. Right now `/api/vendors/lookup` hits Clearbit and Wikipedia. The production version hits a Magellan adapter — same response shape, your data underneath. We'd cache the full Magellan dataset locally on each customer instance, refresh nightly. The category taxonomy in the demo is loosely modelled on Magellan's so the UI doesn't need to change."

That's the upsell, baked into the architecture. The cache table, the static metadata fallback, the source field on every response — they're all there because they'd be there in the real version too. The Clearbit version is genuinely the same shape as a Magellan version, just with worse data. That's why this approach beats faking it with a hardcoded JSON: it scales to the real product.

---

## 10. Out of scope (don't build)

- Authenticated Clearbit Enrichment API (paid, not needed)
- Crunchbase / Pitchbook integration
- A vendor admin UI for editing static metadata (just edit the file)
- Bulk vendor import from CSV
- Vendor "favourites" or starred lists
- Multi-language Wikipedia
- Image optimisation / format conversion (PNG is fine for the demo)
- Auth on the cache-warm endpoint (just don't deploy it)
