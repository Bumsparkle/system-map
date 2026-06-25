import { type SMEdge, type SMNode, toFlowEdge, toFlowNode } from '@/lib/flow'
import { nextLayerColor } from '@/lib/layerColors'
import { NODE_DEFAULT_LABEL } from '@/lib/nodeRegistry'
import type { PreviewDelta } from '@/lib/previewDelta'
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
import { temporal } from 'zundo'
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
  applyPreview: (delta: PreviewDelta) => void
  duplicateSelected: () => void
  applyLayout: (
    positions: Record<string, { x: number; y: number }>,
    edgeHandles?: Record<string, { sourceHandle: string; targetHandle: string }>,
  ) => void
  selectNode: (id: string) => void

  updateEdgeData: (id: string, patch: Partial<EdgeData>) => void
  setEdgeFlowType: (id: string, flowType: FlowType) => void
  setEdgeLabel: (id: string, label: string) => void
  removeEdge: (id: string) => void
}

// The slice tracked for undo/redo (transient fields like selection are excluded).
type TrackedState = {
  name: string
  description: string | null
  layers: Layer[]
  views: View[]
  nodes: Pick<SMNode, 'id' | 'type' | 'position' | 'width' | 'height' | 'data'>[]
  edges: Pick<
    SMEdge,
    'id' | 'source' | 'target' | 'sourceHandle' | 'targetHandle' | 'type' | 'label' | 'data'
  >[]
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

export const useDiagramStore = create<DiagramStore>()(
  temporal<DiagramStore, [], [], TrackedState>(
    (set, get) => ({
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
          // Group nodes are sized containers; everything else is auto-sized.
          ...(type === 'group' ? { width: 280, height: 180 } : {}),
          data: {
            label: data?.label ?? NODE_DEFAULT_LABEL[type],
            fields: {},
            // A freshly-dropped App node opens straight into vendor search (spec v1.2 §4.2).
            ...(type === 'app' ? { awaitingVendor: true } : {}),
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

      // Commit a resolved AI-suggestion preview in a single step (one undo entry,
      // reversible with Cmd+Z). Adds/removes nodes & edges and re-types flows;
      // new nodes get fresh ids and their ghost-edge refs are re-pointed.
      applyPreview: (delta) =>
        set((s) => {
          const layerId = s.activeLayerId ?? s.layers[0]?.id ?? ''
          const idMap = new Map<string, string>()
          const newNodes: SMNode[] = delta.addNodes.map((n) => {
            const id = nanoid()
            idMap.set(n.tempId, id)
            return {
              id,
              type: n.type,
              position: n.position,
              selected: false,
              ...(n.type === 'group' ? { width: 280, height: 180 } : {}),
              data: { label: n.label, fields: {}, layerId },
            }
          })

          const removeNodeSet = new Set(delta.removeNodeIds)
          const removeEdgeSet = new Set(delta.removeEdgeIds)
          const newFlowById = new Map(delta.updateEdges.map((u) => [u.id, u.newFlow]))

          const keptNodes = s.nodes
            .filter((n) => !removeNodeSet.has(n.id))
            .map((n) => (n.selected ? { ...n, selected: false } : n))
          const nodes = [...keptNodes, ...newNodes]

          // Resolve a ghost ref to a real id (new node tempId → fresh id, else as-is).
          const resolve = (ref: string) => idMap.get(ref) ?? ref
          const finalIds = new Set(nodes.map((n) => n.id))
          const newEdges: SMEdge[] = delta.addEdges.flatMap((e) => {
            const source = resolve(e.sourceRef)
            const target = resolve(e.targetRef)
            if (!finalIds.has(source) || !finalIds.has(target) || source === target) return []
            return [
              {
                id: nanoid(),
                source,
                target,
                type: e.flow,
                ...(e.label ? { label: e.label } : {}),
                data: { direction: 'one_way' as const },
              },
            ]
          })

          const keptEdges = s.edges
            .filter(
              (e) =>
                !removeEdgeSet.has(e.id) &&
                !removeNodeSet.has(e.source) &&
                !removeNodeSet.has(e.target),
            )
            .map((e) => {
              const next = newFlowById.get(e.id)
              const retyped = next ? { ...e, type: next } : e
              return retyped.selected ? { ...retyped, selected: false } : retyped
            })

          return { nodes, edges: [...keptEdges, ...newEdges] }
        }),

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

      duplicateSelected: () =>
        set((s) => {
          const selected = s.nodes.filter((n) => n.selected)
          if (selected.length === 0) return {}
          const clones = selected.map((n) => ({
            ...n,
            id: nanoid(),
            position: { x: n.position.x + 28, y: n.position.y + 28 },
            selected: true,
          }))
          return { nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), ...clones] }
        }),

      // Auto-layout (Tidy) sets positions, and optionally re-points each edge to
      // the sides that face each other. Manual handle choices are otherwise left
      // alone — only the "Tidy" action re-routes. One set() ⇒ one undo step.
      applyLayout: (positions, edgeHandles) =>
        set((s) => ({
          nodes: s.nodes.map((n) => {
            const p = positions[n.id]
            return p ? { ...n, position: p } : n
          }),
          edges: edgeHandles
            ? s.edges.map((e) => {
                const h = edgeHandles[e.id]
                return h ? { ...e, sourceHandle: h.sourceHandle, targetHandle: h.targetHandle } : e
              })
            : s.edges,
        })),

      selectNode: (id) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.selected === (n.id === id) ? n : { ...n, selected: n.id === id },
          ),
          edges: s.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
        })),
    }),
    {
      // Undo/redo history (spec §6/§11). Only persistable fields are tracked, so
      // selecting/hovering a node never creates an undo step.
      limit: 50,
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      partialize: (state) => ({
        name: state.name,
        description: state.description,
        layers: state.layers,
        views: state.views,
        nodes: state.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          width: n.width,
          height: n.height,
          data: n.data,
        })),
        edges: state.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
          label: e.label,
          data: e.data,
        })),
      }),
    },
  ),
)
