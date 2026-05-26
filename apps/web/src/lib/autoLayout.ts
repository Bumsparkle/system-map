import type { Edge, Node } from '@xyflow/react'
import ELK, { type ElkNode } from 'elkjs/lib/elk-api.js'
// Spawn ELK's worker via Vite's worker pipeline (the inline Blob worker in
// elk.bundled.js can fail to initialize under some bundler/preview setups).
import ElkWorker from 'elkjs/lib/elk-worker.min.js?worker'

const elk = new ELK({ workerFactory: () => new ElkWorker() })

// Spec §2: layered, left-to-right, 50px between nodes in a layer, 120px between layers.
const LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '50',
  'elk.layered.spacing.edgeNodeBetweenLayers': '40',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
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
