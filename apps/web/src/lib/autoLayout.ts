import type { Edge, Node } from '@xyflow/react'
import ELK, { type ElkNode } from 'elkjs/lib/elk-api.js'
// Spawn ELK's worker via Vite's worker pipeline (the inline Blob worker in
// elk.bundled.js can fail to initialize under some bundler/preview setups).
import ElkWorker from 'elkjs/lib/elk-worker.min.js?worker'

const elk = new ELK({ workerFactory: () => new ElkWorker() })

// Layered, left-to-right flow. Brandes–Köpf with BALANCED alignment averages the
// four alignment passes, so a node sits centred between its branches (symmetric
// fan-outs read cleanly); model order keeps sibling nodes stably top-to-bottom.
const LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '124',
  'elk.spacing.nodeNode': '46',
  'elk.layered.spacing.edgeNodeBetweenLayers': '32',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
}

function size(n: Node): { width: number; height: number } {
  return {
    width: n.measured?.width ?? n.width ?? 180,
    height: n.measured?.height ?? n.height ?? 52,
  }
}

/** Run ELK over the given nodes/edges and return new top-left positions by id. */
export async function layoutNodes(
  nodes: Node[],
  edges: Edge[],
): Promise<Record<string, { x: number; y: number }>> {
  if (nodes.length < 2) return {}
  const ids = new Set(nodes.map((n) => n.id))
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: LAYOUT_OPTIONS,
    children: nodes.map((n) => ({ id: n.id, ...size(n) })),
    edges: edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  }

  const result = await elk.layout(graph)
  const positions: Record<string, { x: number; y: number }> = {}
  for (const child of result.children ?? []) {
    if (typeof child.x === 'number' && typeof child.y === 'number') {
      positions[child.id] = { x: child.x, y: child.y }
    }
  }
  return positions
}
