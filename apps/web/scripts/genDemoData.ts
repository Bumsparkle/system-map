// Generate static demo fixtures (apps/web/src/lib/demoData.ts) from the live DB
// so the VITE_DEMO=1 GitHub Pages build shows the real diagrams with no backend.
// Copies referenced vendor logos into public/ so they ship with the static site.
//   API must be running, then: pnpm exec tsx apps/web/scripts/genDemoData.ts
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.env.API_URL ?? 'http://localhost:3001'
const here = dirname(fileURLToPath(import.meta.url)) // apps/web/scripts
const repoRoot = resolve(here, '../../..')
const LOGO_SRC = resolve(repoRoot, 'apps/api/uploads/vendor-logos')
const LOGO_DEST = resolve(repoRoot, 'apps/web/public/uploads/vendor-logos')
const OUT = resolve(repoRoot, 'apps/web/src/lib/demoData.ts')

// Diagrams to ship, in dashboard display order.
const KEEP_NAMES = ['Project Atlantic', 'Payments platform', 'Onboarding flow']

const json = (path: string) => fetch(`${API}${path}`).then((r) => r.json())

const companies = await json('/api/companies')
const acme = companies.find(
  (c: { slug?: string; id: string }) => c.slug === 'acme' || c.id === 'demo-co',
)
if (!acme) throw new Error('demo company (Acme/demo-co) not found')

const list: { id: string; name: string }[] = await json(`/api/companies/${acme.id}/diagrams`)
const diagrams = KEEP_NAMES.map((name) => list.find((d) => d.name === name)).filter(Boolean)

const detailsById: Record<string, unknown> = {}
const logoFiles = new Set<string>()
for (const d of diagrams as { id: string }[]) {
  const detail = await json(`/api/diagrams/${d.id}`)
  detailsById[d.id] = detail
  for (const n of detail.nodes as { data?: { vendor?: { logoUrl?: string | null } } }[]) {
    const u = n.data?.vendor?.logoUrl
    if (u?.startsWith('/uploads/vendor-logos/')) {
      const file = u.split('/').pop()
      if (file) logoFiles.add(file)
    }
  }
}

// Wipe the dest first so re-seeds (new nanoid filenames) don't leave orphans.
rmSync(LOGO_DEST, { recursive: true, force: true })
mkdirSync(LOGO_DEST, { recursive: true })
let copied = 0
for (const f of logoFiles) {
  try {
    cpSync(resolve(LOGO_SRC, f), resolve(LOGO_DEST, f))
    copied++
  } catch {
    console.warn(`! missing logo file: ${f}`)
  }
}

const file = `/**
 * AUTO-GENERATED demo fixtures (apps/web/scripts/genDemoData.ts).
 * Used when built with VITE_DEMO=1 (the GitHub Pages build): the dashboard +
 * editor render these real diagrams with no backend. Editing works in-session
 * via the Zustand store but nothing persists — refresh resets to this seed.
 * Logos are bundled under public/uploads. Regenerate after changing the seed.
 */
import type { Company, Diagram, DiagramDetail } from '@system-map/shared'

export const demoCompanies: Company[] = ${JSON.stringify([acme], null, 2)}

export const demoDiagrams: Diagram[] = ${JSON.stringify(diagrams, null, 2)}

const detailsById: Record<string, DiagramDetail> = ${JSON.stringify(detailsById, null, 2)}

/** Falls back to the first diagram so any id resolves to something. */
export function getDemoDiagram(id: string): DiagramDetail {
  return detailsById[id] ?? (Object.values(detailsById)[0] as DiagramDetail)
}
`

writeFileSync(OUT, file)
console.log(`Wrote ${OUT}: ${diagrams.length} diagrams, ${copied}/${logoFiles.size} logos copied.`)
process.exit(0)
