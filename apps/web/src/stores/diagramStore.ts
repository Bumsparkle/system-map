import { type SMEdge, type SMNode, toFlowEdge, toFlowNode } from '@/lib/flow'
import { NODE_DEFAULT_LABEL } from '@/lib/nodeRegistry'
import type {
  DiagramDetail,
  EdgeData,
  FlowType,
  Layer,
  NodeData,
  NodeType,
  View,
} from '@system-map/shared'
import {
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react'
import { nanoid } from 'nanoid'
import { create } from 'zustand'

type DiagramStore = {
  diagramId: string | null
  companyId: string | null
  name: string
  description: string | null
  layers: Layer[]
  activeLayerId: string | null
  nodes: SMNode[]
  edges: SMEdge[]
  views: View[]
  hydrated: boolean

  hydrate: (detail: DiagramDetail) => void
  reset: () => void
  setName: (name: string) => void
  setActiveLayer: (layerId: string) => void

  onNodesChange: (changes: NodeChange<SMNode>[]) => void
  onEdgesChange: (changes: EdgeChange<SMEdge>[]) => void
  onConnect: (connection: Connection) => void

  addNode: (type: NodeType, position: XYPosition, data?: Partial<NodeData>) => string
  updateNodeData: (id: string, patch: Partial<NodeData>) => void
  removeNode: (id: string) => void

  updateEdgeData: (id: string, patch: Partial<EdgeData>) => void
  setEdgeFlowType: (id: string, flowType: FlowType) => void
  setEdgeLabel: (id: string, label: string) => void
  removeEdge: (id: string) => void
}

const initialState = {
  diagramId: null,
  companyId: null,
  name: '',
  description: null,
  layers: [] as Layer[],
  activeLayerId: null,
  nodes: [] as SMNode[],
  edges: [] as SMEdge[],
  views: [] as View[],
  hydrated: false,
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  ...initialState,

  hydrate: (detail) => {
    const layers = [...detail.layers].sort((a, b) => a.order - b.order)
    set({
      diagramId: detail.id,
      companyId: detail.companyId,
      name: detail.name,
      description: detail.description,
      layers,
      activeLayerId: layers[0]?.id ?? null,
      nodes: detail.nodes.map(toFlowNode),
      edges: detail.edges.map(toFlowEdge),
      views: detail.views,
      hydrated: true,
    })
  },

  reset: () => set({ ...initialState }),

  setName: (name) => set({ name }),
  setActiveLayer: (activeLayerId) => set({ activeLayerId }),

  onNodesChange: (changes) => set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) => set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (connection) => {
    const { source, target } = connection
    if (!source || !target || source === target) return
    const edge: SMEdge = {
      id: nanoid(),
      source,
      target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      type: 'data',
      data: { direction: 'one_way' },
      selected: true,
    }
    set((s) => ({
      edges: [...s.edges.map((e) => ({ ...e, selected: false })), edge],
      nodes: s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
    }))
  },

  addNode: (type, position, data) => {
    const { layers, activeLayerId, nodes } = get()
    const layerId = activeLayerId ?? layers[0]?.id ?? ''
    const id = nanoid()
    const node: SMNode = {
      id,
      type,
      position,
      selected: true,
      data: {
        label: data?.label ?? NODE_DEFAULT_LABEL[type],
        fields: {},
        ...data,
        layerId,
      },
    }
    set({ nodes: [...nodes.map((n) => ({ ...n, selected: false })), node] })
    return id
  },

  updateNodeData: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    })),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  updateEdgeData: (id, patch) =>
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === id ? { ...e, data: { ...(e.data ?? { direction: 'one_way' }), ...patch } } : e,
      ),
    })),

  setEdgeFlowType: (id, flowType) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, type: flowType } : e)),
    })),

  setEdgeLabel: (id, label) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, label: label || undefined } : e)),
    })),

  removeEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),
}))
