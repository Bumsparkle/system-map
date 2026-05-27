import type {
  Direction,
  EdgeData,
  FlowType,
  NodeData,
  NodeType,
  VendorLookup,
} from '@system-map/shared'
import { eq } from 'drizzle-orm'
import { db, queryClient, schema } from './client'

/**
 * Seed the "Project Atlantic" demo diagram (spec v1.2 §6): a Lloyd's syndicate
 * target operating model with a painful Current state and a modern Future state
 * on two toggleable layers. App nodes are enriched live via /api/vendors/lookup
 * so logos bake into the node data — run AFTER the API is up (and after a
 * logo.dev token is set, for logos):
 *   pnpm --filter @system-map/api db:seed:atlantic
 */

const API = process.env.API_URL ?? 'http://localhost:3001'
const COMPANY_ID = 'demo-co'
const DIAGRAM_ID = 'project-atlantic'
const L_CURRENT = 'l-atl-current'
const L_FUTURE = 'l-atl-future'

const ALL_FLOWS: FlowType[] = ['data', 'cash', 'api', 'manual', 'event', 'custom']
const ALL_NODE_TYPES: NodeType[] = [
  'app',
  'system',
  'data_source',
  'external_entity',
  'cash',
  'group',
  'custom',
]

async function lookup(q: string): Promise<VendorLookup | null> {
  try {
    const res = await fetch(`${API}/api/vendors/lookup?q=${encodeURIComponent(q)}&fresh=1`)
    if (!res.ok) return null
    return (await res.json()) as VendorLookup
  } catch {
    return null
  }
}

type PlainNode = {
  id: string
  layerId: string
  type: NodeType
  x: number
  y: number
  data: NodeData
}

// A vendor-backed App node: enrich live, embed the lookup on the node.
async function appNode(
  id: string,
  layerId: string,
  query: string,
  x: number,
  y: number,
): Promise<PlainNode> {
  const v = await lookup(query)
  const data: NodeData = {
    label: v?.name ?? query,
    fields: {},
    ...(v?.category ? { category: v.category } : {}),
    vendor: v ?? { name: query },
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
  category?: string,
): PlainNode {
  return { id, layerId, type, x, y, data: { label, fields: {}, ...(category ? { category } : {}) } }
}

type SeedEdge = {
  id: string
  source: string
  target: string
  flowType: FlowType
  label: string
}
const edge = (
  id: string,
  source: string,
  target: string,
  flowType: FlowType,
  label: string,
): SeedEdge => ({
  id,
  source,
  target,
  flowType,
  label,
})

async function main() {
  // Idempotent: drop and rebuild just this diagram (cascades layers/nodes/edges/views).
  await db.delete(schema.diagrams).where(eq(schema.diagrams.id, DIAGRAM_ID))

  await db.insert(schema.diagrams).values({
    id: DIAGRAM_ID,
    companyId: COMPANY_ID,
    name: 'Project Atlantic',
    description: "Lloyd's syndicate target operating model — current vs. future state.",
  })

  await db.insert(schema.layers).values([
    {
      id: L_CURRENT,
      diagramId: DIAGRAM_ID,
      name: 'Current state',
      color: '#94918A',
      order: 0,
      visible: true,
    },
    {
      id: L_FUTURE,
      diagramId: DIAGRAM_ID,
      name: 'Future state',
      color: '#047857',
      order: 1,
      visible: true,
    },
  ])

  // Current state — legacy core, manual underwriting, broken integrations.
  const current: PlainNode[] = [
    plainNode('atl-broker-c', L_CURRENT, 'external_entity', 'Brokers', 20, 60, 'Distribution'),
    plainNode('atl-excel', L_CURRENT, 'custom', 'Excel + email', 300, 60, 'Manual underwriting'),
    plainNode('atl-sharedrive', L_CURRENT, 'data_source', 'Shared drive', 580, 150, 'Documents'),
    plainNode('atl-mainframe', L_CURRENT, 'system', 'Mainframe', 860, 30, 'Legacy core'),
    await appNode('atl-sapiens', L_CURRENT, 'sapiens', 580, 20),
  ]

  // Future state — modern integrated stack.
  const future: PlainNode[] = [
    plainNode('atl-broker-f', L_FUTURE, 'external_entity', 'Brokers', 20, 500, 'Distribution'),
    await appNode('atl-send', L_FUTURE, 'send', 300, 480),
    await appNode('atl-cytora', L_FUTURE, 'cytora', 300, 620),
    await appNode('atl-hx', L_FUTURE, 'hyperexponential', 580, 420),
    await appNode('atl-guidewire', L_FUTURE, 'guidewire', 580, 540),
    await appNode('atl-shift', L_FUTURE, 'shift technology', 580, 660),
    await appNode('atl-snowflake', L_FUTURE, 'snowflake', 860, 500),
    await appNode('atl-aws', L_FUTURE, 'aws', 1120, 500),
  ]

  const nodes = [...current, ...future]
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

  const oneWay: EdgeData = { direction: 'one_way' as Direction }
  const edges: SeedEdge[] = [
    // Current — manual, brittle.
    edge('atl-e1', 'atl-broker-c', 'atl-excel', 'manual', 'submissions'),
    edge('atl-e2', 'atl-excel', 'atl-sapiens', 'manual', 'rekey'),
    edge('atl-e3', 'atl-excel', 'atl-sharedrive', 'manual', 'docs'),
    edge('atl-e4', 'atl-sapiens', 'atl-mainframe', 'data', 'nightly batch'),
    // Future — integrated, typed.
    edge('atl-e5', 'atl-broker-f', 'atl-send', 'api', 'submissions'),
    edge('atl-e6', 'atl-cytora', 'atl-send', 'data', 'risk data'),
    edge('atl-e7', 'atl-send', 'atl-hx', 'api', 'price'),
    edge('atl-e8', 'atl-send', 'atl-guidewire', 'api', 'bind'),
    edge('atl-e9', 'atl-shift', 'atl-guidewire', 'event', 'fraud signal'),
    edge('atl-e10', 'atl-guidewire', 'atl-snowflake', 'data', 'policies'),
    edge('atl-e11', 'atl-snowflake', 'atl-aws', 'data', 'warehoused'),
  ]
  await db.insert(schema.edges).values(
    edges.map((e) => ({
      id: e.id,
      diagramId: DIAGRAM_ID,
      sourceNodeId: e.source,
      targetNodeId: e.target,
      flowType: e.flowType,
      label: e.label,
      data: oneWay,
    })),
  )

  await db.insert(schema.views).values([
    {
      id: 'v-atl-current',
      diagramId: DIAGRAM_ID,
      name: 'Current state',
      filter: { layerIds: [L_CURRENT], flowTypes: ALL_FLOWS, nodeTypes: ALL_NODE_TYPES },
      isDefault: true,
    },
    {
      id: 'v-atl-future',
      diagramId: DIAGRAM_ID,
      name: 'Future state',
      filter: { layerIds: [L_FUTURE], flowTypes: ALL_FLOWS, nodeTypes: ALL_NODE_TYPES },
      isDefault: false,
    },
  ])

  const withLogos = nodes.filter((n) => n.data.vendor?.logoUrl).length
  console.log(
    `Seeded "Project Atlantic": ${nodes.length} nodes, ${edges.length} edges, 2 layers/views (${withLogos} logos).`,
  )
}

await main()
await queryClient.end()
process.exit(0)
