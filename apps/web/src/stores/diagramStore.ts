import { type SMEdge, type SMNode, toFlowEdge, toFlowNode } from '@/lib/flow'
import { nextLayerColor } from '@/lib/layerColors'
import { NODE_DEFAULT_LABEL } from '@/lib/nodeRegistry'
import type {
  DiagramDetail,
  EdgeData,
  FlowType,
  Layer,
  NodeData,
  NodeType,
  View,
  ViewFilter,
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
  activeViewId: string | null
  hydrated: boolean

  hydrate: (detail: DiagramDetail) => void
  reset: () => void
  setName: (name: string) => void
  setActiveLayer: (layerId: string) => void

  addLayer: () => string
  updateLayer: (id: string, patch: Partial<Pick<Layer, 'name' | 'color' | 'visible'>>) => void
  toggleLayerVisible: (id: string) => void
  moveLayer: (id: string, dir: 'up' | 'down') => void
  removeLayer: (id: string) => void
  setNodeLayer: (nodeId: string, layerId: string) => void

  setActiveView: (id: string | null) => void
  addView: (input: { name: string; filter: ViewFilter; isDefault?: boolean }) => string
  removeView: (id: string) => void
  setDefaultView: (id: string) => void

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
  activeViewId: null,
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
      activeViewId: detail.views.find((v) => v.isDefault)?.id ?? null,
      hydrated: true,
    })
  },

  reset: () => set({ ...initialState }),

  setName: (name) => set({ name }),
  setActiveLayer: (activeLayerId) => set({ activeLayerId }),

  addLayer: () => {
    const id = nanoid()
    const { layers, diagramId } = get()
    if (!diagramId) return id
    const maxOrder = layers.reduce((m, l) => Math.max(m, l.order), -1)
    const layer: Layer = {
      id,
      diagramId,
      name: `Layer ${layers.length + 1}`,
      color: nextLayerColor(layers.length),
      order: maxOrder + 1,
      visible: true,
    }
    set({ layers: [...layers, layer], activeLayerId: id })
    return id
  },

  updateLayer: (id, patch) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

  toggleLayerVisible: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    })),

  moveLayer: (id, dir) =>
    set((s) => {
      const sorted = [...s.layers].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((l) => l.id === id)
      const swapWith = dir === 'up' ? idx - 1 : idx + 1
      if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return {}
      const a = sorted[idx]
      const b = sorted[swapWith]
      if (!a || !b) return {}
      const reordered = s.layers.map((l) => {
        if (l.id === a.id) return { ...l, order: b.order }
        if (l.id === b.id) return { ...l, order: a.order }
        return l
      })
      return { layers: reordered }
    }),

  removeLayer: (id) =>
    set((s) => {
      if (s.layers.length <= 1) return {} // always keep at least one layer
      const remaining = s.layers.filter((l) => l.id !== id)
      const fallback = [...remaining].sort((a, b) => a.order - b.order)[0]
      if (!fallback) return {}
      // reassign the deleted layer's nodes to the fallback (don't lose them)
      const nodes = s.nodes.map((n) =>
        n.data.layerId === id ? { ...n, data: { ...n.data, layerId: fallback.id } } : n,
      )
      const activeLayerId = s.activeLayerId === id ? fallback.id : s.activeLayerId
      return { layers: remaining, nodes, activeLayerId }
    }),

  setNodeLayer: (nodeId, layerId) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, layerId } } : n)),
    })),

  setActiveView: (id) => set({ activeViewId: id }),

  addView: (input) => {
    const id = nanoid()
    const { diagramId, views } = get()
    if (!diagramId) return id
    const isDefault = input.isDefault ?? false
    const view: View = { id, diagramId, name: input.name, filter: input.filter, isDefault }
    const nextViews = isDefault
      ? [...views.map((v) => ({ ...v, isDefault: false })), view]
      : [...views, view]
    set({ views: nextViews, activeViewId: id })
    return id
  },

  removeView: (id) =>
    set((s) => ({
      views: s.views.filter((v) => v.id !== id),
      activeViewId: s.activeViewId === id ? null : s.activeViewId,
    })),

  setDefaultView: (id) =>
    set((s) => ({ views: s.views.map((v) => ({ ...v, isDefault: v.id === id })) })),

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
