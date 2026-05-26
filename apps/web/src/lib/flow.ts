import type {
  DiagramEdge,
  DiagramNode,
  EdgeData,
  FlowType,
  NodeData,
  NodeType,
  SaveDiagramInput,
} from '@system-map/shared'
import type { Edge, Node } from '@xyflow/react'

type SaveNode = SaveDiagramInput['nodes'][number]
type SaveEdge = SaveDiagramInput['edges'][number]

/** React Flow node data = domain NodeData plus the owning layer id (for the indicator). */
export type SMNodeData = NodeData & { layerId: string }
export type SMNode = Node<SMNodeData, NodeType>

export type SMEdgeData = EdgeData
export type SMEdge = Edge<SMEdgeData, FlowType>

export function toFlowNode(n: DiagramNode): SMNode {
  return {
    id: n.id,
    type: n.type,
    position: { x: n.positionX, y: n.positionY },
    data: { ...n.data, layerId: n.layerId },
  }
}

export function toFlowEdge(e: DiagramEdge): SMEdge {
  return {
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    type: e.flowType,
    label: e.label ?? undefined,
    data: e.data ?? { direction: 'one_way' },
  }
}

/** Map a React Flow node back to the bulk-save shape (layerId is a column, not data). */
export function fromFlowNode(n: SMNode): SaveNode {
  const { layerId, ...data } = n.data
  return {
    id: n.id,
    layerId,
    type: n.type ?? 'custom',
    positionX: n.position.x,
    positionY: n.position.y,
    width: n.width ?? null,
    height: n.height ?? null,
    data,
  }
}

export function fromFlowEdge(e: SMEdge): SaveEdge {
  return {
    id: e.id,
    sourceNodeId: e.source,
    targetNodeId: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    flowType: e.type ?? 'data',
    label: typeof e.label === 'string' ? e.label : null,
    data: e.data ?? { direction: 'one_way' },
  }
}
