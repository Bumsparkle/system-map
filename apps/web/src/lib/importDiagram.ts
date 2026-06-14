import {
  type SaveDiagramInput,
  directionSchema,
  flowTypeSchema,
  nodeTypeSchema,
  saveEdgeSchema,
  saveLayerSchema,
  saveNodeSchema,
  saveViewSchema,
} from '@system-map/shared'
import { nanoid } from 'nanoid'
import { z } from 'zod'

// Burnt-sienna accent, matching the auto-created "Main" layer on the server.
const DEFAULT_LAYER_COLOR = '#D4471F'

/**
 * Prompt the user copies into an LLM (ChatGPT/Claude/etc.) to turn a plain
 * description of their architecture into the simple import JSON. Kept in sync
 * with simpleSchema + the node/flow type enums below.
 */
export const AI_IMPORT_PROMPT = `I want to create a system architecture map. From my description below, output a single JSON object that describes it as nodes (the things) and edges (how they connect).

Output ONLY the JSON — no explanation and no markdown code fences. Match this shape exactly:

{
  "name": "Short map name",
  "nodes": [
    { "label": "Stripe", "type": "app", "category": "Payments" }
  ],
  "edges": [
    { "from": "Billing Service", "to": "Stripe", "label": "charge", "type": "api" }
  ]
}

Rules:
- node "type" is one of: app (a third-party SaaS/vendor, e.g. Stripe, Salesforce), system (an internal service or component), data_source (a database, warehouse or feed), external_entity (a person or organisation, e.g. a customer or broker), cash (money, revenue or cost), group (a container), custom. Use "app" if unsure.
- edge "type" is one of: data, api, cash (money movement), manual (an offline/manual step), event (async event or message), custom. Use "data" if unsure.
- "category" on a node is optional and groups related nodes, e.g. "Frontend", "Payments".
- Every edge "from" and "to" must exactly match a node "label".
- Keep each label to the real product/component name, and include every connection.

My system:
[Describe your apps, services, databases, external parties, and how requests, data and money flow between them.]`

export type ParsedImport = {
  name: string
  description: string | null
  format: 'export' | 'simple'
  payload: SaveDiagramInput
  warnings: string[]
}

/* ------------------------------------------------------------------ */
/* Simple, hand-authorable format: { name?, nodes:[{label,type?}], … } */
/* ------------------------------------------------------------------ */

const simpleNodeSchema = z.object({
  label: z.string().min(1),
  type: nodeTypeSchema.optional(),
  category: z.string().optional(),
  description: z.string().optional(),
})

const simpleEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
  type: flowTypeSchema.optional(),
  direction: directionSchema.optional(),
})

const simpleSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  nodes: z.array(simpleNodeSchema).min(1),
  edges: z.array(simpleEdgeSchema).optional(),
})

/* ------------------------------------------------------------------ */
/* Round-trip format: exactly what `Export → JSON` produces            */
/* ------------------------------------------------------------------ */

const exportSchema = z.object({
  version: z.string().optional(),
  diagram: z
    .object({ name: z.string().optional(), description: z.string().nullable().optional() })
    .optional(),
  layers: z.array(saveLayerSchema),
  nodes: z.array(saveNodeSchema),
  edges: z.array(saveEdgeSchema),
  views: z.array(saveViewSchema).optional(),
})

function firstIssue(err: z.ZodError): string {
  const issue = err.issues[0]
  if (!issue) return 'unrecognised shape.'
  const path = issue.path.join('.')
  return path ? `${path} — ${issue.message}` : issue.message
}

/**
 * Parse an uploaded JSON value into a diagram ready to create. Auto-detects the
 * app's export format (has a top-level `layers`/`version`/`diagram`) vs the
 * simple authorable format. Throws an Error with a friendly message on bad input.
 */
export function parseImport(raw: unknown): ParsedImport {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('The file must be a JSON object.')
  }
  if ('layers' in raw || 'version' in raw || 'diagram' in raw) return parseExport(raw)
  return parseSimple(raw)
}

function parseExport(raw: unknown): ParsedImport {
  const result = exportSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`This looks like an export file, but ${firstIssue(result.error)}`)
  }
  const data = result.data
  const warnings: string[] = []

  // Regenerate every id so re-importing an export never collides with — or
  // steals rows from — the original diagram (ids are global primary keys).
  const layerMap = new Map(data.layers.map((l) => [l.id, nanoid()]))
  const nodeMap = new Map(data.nodes.map((n) => [n.id, nanoid()]))

  const layers = data.layers.map((l) => ({ ...l, id: layerMap.get(l.id) as string }))
  // Guarantee a layer exists for nodes to attach to.
  let fallbackLayerId = layers[0]?.id
  if (!fallbackLayerId) {
    fallbackLayerId = nanoid()
    layers.push({
      id: fallbackLayerId,
      name: 'Main',
      color: DEFAULT_LAYER_COLOR,
      order: 0,
      visible: true,
    })
  }

  const nodes = data.nodes.map((n) => ({
    ...n,
    id: nodeMap.get(n.id) as string,
    layerId: layerMap.get(n.layerId) ?? fallbackLayerId,
  }))

  const edges = data.edges
    .filter((e) => nodeMap.has(e.sourceNodeId) && nodeMap.has(e.targetNodeId))
    .map((e) => ({
      ...e,
      id: nanoid(),
      sourceNodeId: nodeMap.get(e.sourceNodeId) as string,
      targetNodeId: nodeMap.get(e.targetNodeId) as string,
    }))
  const droppedEdges = data.edges.length - edges.length
  if (droppedEdges > 0) {
    warnings.push(`${droppedEdges} edge${droppedEdges > 1 ? 's' : ''} skipped (missing endpoints).`)
  }

  // Keep saved views, remapping their layer references to the new ids.
  const views = (data.views ?? []).map((v) => ({
    id: nanoid(),
    name: v.name,
    isDefault: v.isDefault,
    filter: {
      ...v.filter,
      layerIds: v.filter.layerIds.map((id) => layerMap.get(id)).filter((id): id is string => !!id),
    },
  }))

  const name = data.diagram?.name?.trim() || 'Imported diagram'
  const description = data.diagram?.description ?? null
  return {
    name,
    description,
    format: 'export',
    warnings,
    payload: { name, description, layers, nodes, edges, views },
  }
}

function parseSimple(raw: unknown): ParsedImport {
  const result = simpleSchema.safeParse(raw)
  if (!result.success) throw new Error(`Couldn't read that JSON: ${firstIssue(result.error)}`)
  const data = result.data
  const warnings: string[] = []

  const layerId = nanoid()
  const layers = [
    { id: layerId, name: 'Main', color: DEFAULT_LAYER_COLOR, order: 0, visible: true },
  ]

  // Edges reference nodes by label; first occurrence of a label wins.
  const idByLabel = new Map<string, string>()
  const nodes = data.nodes.map((n) => {
    const id = nanoid()
    if (!idByLabel.has(n.label)) idByLabel.set(n.label, id)
    return {
      id,
      layerId,
      type: n.type ?? 'app',
      positionX: 0,
      positionY: 0,
      data: {
        label: n.label,
        fields: {},
        ...(n.category ? { category: n.category } : {}),
        ...(n.description ? { description: n.description } : {}),
      },
    }
  })

  const rawEdges = data.edges ?? []
  const edges = rawEdges.flatMap((e) => {
    const sourceNodeId = idByLabel.get(e.from)
    const targetNodeId = idByLabel.get(e.to)
    if (!sourceNodeId || !targetNodeId) return []
    return [
      {
        id: nanoid(),
        sourceNodeId,
        targetNodeId,
        sourceHandle: 'right',
        targetHandle: 'left',
        flowType: e.type ?? 'data',
        label: e.label ?? null,
        data: { direction: e.direction ?? 'one_way' },
      },
    ]
  })
  const droppedEdges = rawEdges.length - edges.length
  if (droppedEdges > 0) {
    warnings.push(
      `${droppedEdges} edge${droppedEdges > 1 ? 's' : ''} skipped (unknown node label).`,
    )
  }

  // Give the hand-authored map a readable left-to-right layout; the user can
  // refine it with "Tidy" in the editor.
  const positions = layeredPositions(
    nodes.map((n) => n.id),
    edges.map((e) => ({ source: e.sourceNodeId, target: e.targetNodeId })),
  )
  for (const node of nodes) {
    const p = positions.get(node.id)
    if (p) {
      node.positionX = p.x
      node.positionY = p.y
    }
  }

  const name = data.name?.trim() || 'Imported diagram'
  const description = data.description ?? null
  return {
    name,
    description,
    format: 'simple',
    warnings,
    payload: { name, description, layers, nodes, edges, views: [] },
  }
}

/* ------------------------------------------------------------------ */
/* Lightweight left-to-right layered layout (longest-path columns)     */
/* ------------------------------------------------------------------ */

const COL_GAP = 260
const ROW_GAP = 110
const ORIGIN = 40

function layeredPositions(
  ids: string[],
  edges: { source: string; target: string }[],
): Map<string, { x: number; y: number }> {
  const adjacency = new Map<string, string[]>(ids.map((id) => [id, []]))
  const indegree = new Map<string, number>(ids.map((id) => [id, 0]))
  for (const e of edges) {
    if (!adjacency.has(e.source) || !indegree.has(e.target) || e.source === e.target) continue
    adjacency.get(e.source)?.push(e.target)
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1)
  }

  const column = new Map<string, number>(ids.map((id) => [id, 0]))
  const remaining = new Map(indegree)
  const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0)
  const queued = new Set(queue)
  while (queue.length > 0) {
    const id = queue.shift() as string
    const here = column.get(id) ?? 0
    for (const next of adjacency.get(id) ?? []) {
      column.set(next, Math.max(column.get(next) ?? 0, here + 1))
      remaining.set(next, (remaining.get(next) ?? 0) - 1)
      if ((remaining.get(next) ?? 0) <= 0 && !queued.has(next)) {
        queued.add(next)
        queue.push(next)
      }
    }
  }

  const rowInColumn = new Map<number, number>()
  const positions = new Map<string, { x: number; y: number }>()
  for (const id of ids) {
    const col = column.get(id) ?? 0
    const row = rowInColumn.get(col) ?? 0
    rowInColumn.set(col, row + 1)
    positions.set(id, { x: ORIGIN + col * COL_GAP, y: ORIGIN + row * ROW_GAP })
  }
  return positions
}
