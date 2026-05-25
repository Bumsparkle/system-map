import type {
  DiagramEdge,
  DiagramNode,
  EdgeData,
  FlowType,
  NodeData,
  NodeType,
} from '@system-map/shared'
import type { Edge, Node } from '@xyflow/react'

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
    data: e.data ?? { direction: 'one_way' },
  }
}
