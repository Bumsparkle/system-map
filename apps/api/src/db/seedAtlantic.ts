import type {
  Direction,
  EdgeData,
  EdgeLifecycle,
  FlowType,
  NodeCost,
  NodeData,
  NodeLifecycle,
  NodeType,
  VendorLookup,
} from '@system-map/shared'
import { eq } from 'drizzle-orm'
import { db, queryClient, schema } from './client.js'

/**
 * Seed the "Project Atlantic" demo diagram (spec v1.3 §6): a Lloyd's syndicate
 * target operating model as ONE diagram with per-node lifecycle + monthly cost.
 * The Current/Future/Delta toggle drives state — no separate state layers.
 * App nodes enrich live via /api/vendors/lookup, so logos bake into the node
 * data. Run after the API is up (and a logo.dev token is set, for logos):
 *   pnpm --filter @system-map/api db:seed:atlantic
 */

const API = process.env.API_URL ?? 'http://localhost:3001'
const COMPANY_ID = 'demo-co'
const DIAGRAM_ID = 'project-atlantic'
const L_CORE = 'l-atl-core'
const L_UW = 'l-atl-uw'
const L_DATA = 'l-atl-data'

async function lookup(q: string): Promise<VendorLookup | null> {
  try {
    const res = await fetch(`${API}/api/vendors/lookup?q=${encodeURIComponent(q)}&fresh=1`)
    if (!res.ok) return null
    return (await res.json()) as VendorLookup
  } catch {
    return null
  }
}

const gbp = (
  pounds: number,
  confidence: NodeCost['confidence'] = 'known',
  basis?: string,
): NodeCost => ({
  monthlyAmount: pounds * 100,
  currency: 'GBP',
  confidence,
  ...(basis ? { basis } : {}),
})

type Extra = {
  lifecycle?: NodeLifecycle
  cost?: NodeCost
  lifecycleNotes?: string
  replacedByNodeId?: string
}

type PlainNode = {
  id: string
  layerId: string
  type: NodeType
  x: number
  y: number
  data: NodeData
}

async function appNode(
  id: string,
  layerId: string,
  query: string,
  x: number,
  y: number,
  extra: Extra,
): Promise<PlainNode> {
  const v = await lookup(query)
  const data: NodeData = {
    label: v?.name ?? query,
    fields: {},
    ...(v?.category ? { category: v.category } : {}),
    vendor: v ?? { name: query },
    ...extra,
  }
  return { id, layerId, type: 'app', x, y, data }
}

function plainNode(
  id: string,
  layerId: string,
  type: NodeType,
  label: string,
  x: number,
  y: number,
  category: string | undefined,
  extra: Extra,
): PlainNode {
  return {
    id,
    layerId,
    type,
    x,
    y,
    data: { label, fields: {}, ...(category ? { category } : {}), ...extra },
  }
}

type SeedEdge = {
  id: string
  source: string
  target: string
  flowType: FlowType
  label: string
  lifecycle: EdgeLifecycle
}
const edge = (
  id: string,
  source: string,
  target: string,
  flowType: FlowType,
  label: string,
  lifecycle: EdgeLifecycle,
): SeedEdge => ({ id, source, target, flowType, label, lifecycle })

async function main() {
  await db.delete(schema.diagrams).where(eq(schema.diagrams.id, DIAGRAM_ID))

  await db.insert(schema.diagrams).values({
    id: DIAGRAM_ID,
    companyId: COMPANY_ID,
    name: 'Project Atlantic',
    description: "Lloyd's syndicate target operating model — current vs. future state.",
  })

  // Functional layers (state is per-node, not per-layer).
  await db.insert(schema.layers).values([
    {
      id: L_CORE,
      diagramId: DIAGRAM_ID,
      name: 'Core platform',
      color: '#475569',
      order: 0,
      visible: true,
    },
    {
      id: L_UW,
      diagramId: DIAGRAM_ID,
      name: 'Underwriting & claims',
      color: '#b45309',
      order: 1,
      visible: true,
    },
    {
      id: L_DATA,
      diagramId: DIAGRAM_ID,
      name: 'Data & distribution',
      color: '#047857',
      order: 2,
      visible: true,
    },
  ])

  const nodes: PlainNode[] = [
    // Distribution
    plainNode('atl-brokers', L_DATA, 'external_entity', 'Brokers', 40, 220, 'Distribution', {
      lifecycle: 'existing',
    }),
    await appNode('atl-salesforce', L_DATA, 'salesforce', 40, 380, {
      lifecycle: 'existing',
      cost: gbp(2000, 'known', 'Broker portal'),
      lifecycleNotes: 'Broker portal — stays.',
    }),
    await appNode('atl-snowflake', L_DATA, 'snowflake', 900, 220, {
      lifecycle: 'modifying',
      cost: gbp(1500, 'known'),
      lifecycleNotes: 'Scaling for new data sources.',
    }),

    // Underwriting & claims
    await appNode('atl-excel', L_UW, 'microsoft 365', 320, 70, {
      lifecycle: 'retiring',
      cost: gbp(200, 'known', 'Excel + M365 licences'),
      lifecycleNotes: 'Spreadsheet pricing — retired in favour of hyperexponential.',
    }),
    await appNode('atl-send', L_UW, 'send', 320, 210, {
      lifecycle: 'new',
      cost: gbp(6000, 'estimated'),
      lifecycleNotes: 'Underwriter workbench.',
    }),
    plainNode('atl-claims', L_UW, 'custom', 'Manual claims', 320, 360, 'Claims handlers', {
      lifecycle: 'existing',
    }),
    await appNode('atl-shift', L_UW, 'shift technology', 320, 510, {
      lifecycle: 'new',
      cost: gbp(3000, 'estimated'),
      lifecycleNotes: 'Claims fraud detection.',
    }),
    await appNode('atl-hx', L_UW, 'hyperexponential', 600, 430, {
      lifecycle: 'new',
      cost: gbp(8000, 'estimated'),
      lifecycleNotes: 'Pricing & rating.',
    }),

    // Core platform — the replacement chain
    await appNode('atl-sapiens', L_CORE, 'sapiens', 600, 100, {
      lifecycle: 'replacing',
      replacedByNodeId: 'atl-guidewire',
      cost: gbp(4000, 'known'),
      lifecycleNotes: 'Legacy policy admin — being replaced by Guidewire.',
    }),
    await appNode('atl-guidewire', L_CORE, 'guidewire', 600, 250, {
      lifecycle: 'new',
      cost: gbp(12000, 'estimated'),
      lifecycleNotes: 'Modern policy admin core.',
    }),
  ]

  await db.insert(schema.nodes).values(
    nodes.map((n) => ({
      id: n.id,
      diagramId: DIAGRAM_ID,
      layerId: n.layerId,
      type: n.type,
      positionX: n.x,
      positionY: n.y,
      data: n.data,
    })),
  )

  const oneWay: Direction = 'one_way'
  const edges: SeedEdge[] = [
    // Current-state flows (hidden in Future once their legacy endpoints drop out).
    edge('atl-e1', 'atl-brokers', 'atl-sapiens', 'manual', 'submissions', 'existing'),
    edge('atl-e2', 'atl-excel', 'atl-sapiens', 'manual', 'rates', 'retiring'),
    edge('atl-e3', 'atl-claims', 'atl-sapiens', 'manual', 'claims', 'retiring'),
    edge('atl-e4', 'atl-sapiens', 'atl-snowflake', 'data', 'policies', 'existing'),
    edge('atl-e5', 'atl-salesforce', 'atl-brokers', 'api', 'portal', 'existing'),
    // Future-state flows (new integrations).
    edge('atl-e6', 'atl-brokers', 'atl-send', 'api', 'submissions', 'new'),
    edge('atl-e7', 'atl-send', 'atl-hx', 'api', 'price', 'new'),
    edge('atl-e8', 'atl-send', 'atl-guidewire', 'api', 'bind', 'new'),
    edge('atl-e9', 'atl-shift', 'atl-guidewire', 'event', 'fraud signal', 'new'),
    edge('atl-e10', 'atl-guidewire', 'atl-snowflake', 'data', 'policies', 'new'),
  ]
  await db.insert(schema.edges).values(
    edges.map((e) => ({
      id: e.id,
      diagramId: DIAGRAM_ID,
      sourceNodeId: e.source,
      targetNodeId: e.target,
      flowType: e.flowType,
      label: e.label,
      data: { direction: oneWay, lifecycle: e.lifecycle } satisfies EdgeData,
    })),
  )

  const logos = nodes.filter((n) => n.data.vendor?.logoUrl).length
  console.log(
    `Seeded "Project Atlantic": ${nodes.length} nodes, ${edges.length} edges, 3 layers, lifecycle + costs (${logos} logos).`,
  )
}

await main()
await queryClient.end()
process.exit(0)
