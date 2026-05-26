import { apiFetch } from '@/lib/api'
import { type SMEdge, type SMNode, fromFlowEdge, fromFlowNode } from '@/lib/flow'
import type { Layer, SaveDiagramInput, View } from '@system-map/shared'

type DiagramSnapshot = {
  name: string
  description: string | null
  layers: Layer[]
  nodes: SMNode[]
  edges: SMEdge[]
  views: View[]
}

/** Serialize the live diagram state into the bulk-save payload (excludes transient
 *  fields like selection/hidden, so selecting a node never triggers a save). */
export function serializeDiagram(s: DiagramSnapshot): SaveDiagramInput {
  return {
    name: s.name,
    description: s.description,
    layers: s.layers.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      order: l.order,
      visible: l.visible,
    })),
    nodes: s.nodes.map(fromFlowNode),
    edges: s.edges.map(fromFlowEdge),
    views: s.views.map((v) => ({
      id: v.id,
      name: v.name,
      filter: v.filter,
      isDefault: v.isDefault,
    })),
  }
}

export function saveDiagram(id: string, payload: SaveDiagramInput): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/api/diagrams/${id}/save`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
