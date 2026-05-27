import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useUrlSync } from '@/hooks/useUrlSync'
import { buildDisplayGraph } from '@/lib/displayGraph'
import { DND_MIME } from '@/lib/dnd'
import { edgeTypes } from '@/lib/edgeRegistry'
import type { SMEdge, SMNode } from '@/lib/flow'
import { nodeTypes } from '@/lib/nodeRegistry'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import type { NodeType } from '@system-map/shared'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  type Edge,
  type EdgeChange,
  MiniMap,
  type Node,
  type NodeChange,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react'
import { type DragEvent, type MouseEvent, useCallback, useMemo, useRef, useState } from 'react'
import { ContextMenu } from './ContextMenu'
import { ZoomControls } from './controls/ZoomControls'
import { EdgeMarkers } from './edges/BaseEdge'

type MenuState = { x: number; y: number; edgeId: string }

export function Canvas() {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const layers = useDiagramStore((s) => s.layers)
  const views = useDiagramStore((s) => s.views)
  const activeViewId = useDiagramStore((s) => s.activeViewId)
  const onNodesChange = useDiagramStore((s) => s.onNodesChange)
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange)
  const onConnect = useDiagramStore((s) => s.onConnect)
  const addNode = useDiagramStore((s) => s.addNode)
  const dotGrid = useUiStore((s) => s.dotGrid)
  const showMinimap = useUiStore((s) => s.showMinimap)
  const flashNode = useUiStore((s) => s.flashNode)
  const focusEnabled = useUiStore((s) => s.focusEnabled)
  const hoverNodeId = useUiStore((s) => s.hoverNodeId)
  const setHoverNode = useUiStore((s) => s.setHoverNode)
  const presenting = useUiStore((s) => s.presenting)
  const highlightOrphans = useUiStore((s) => s.highlightOrphans)
  const setHighlightOrphans = useUiStore((s) => s.setHighlightOrphans)
  const setEditingNode = useUiStore((s) => s.setEditingNode)
  const paletteDragType = useUiStore((s) => s.paletteDragType)
  const diagramState = useUiStore((s) => s.diagramState)
  const { screenToFlowPosition } = useReactFlow()
  const [menu, setMenu] = useState<MenuState | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useKeyboardShortcuts()
  useUrlSync()

  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId) ?? null,
    [views, activeViewId],
  )
  const display = useMemo(
    () => buildDisplayGraph(nodes, edges, layers, activeView, diagramState),
    [nodes, edges, layers, activeView, diagramState],
  )

  // Focus origin = hovered node, or the single selected node when nothing is hovered.
  const selectedId = useMemo(() => {
    const sel = nodes.filter((n) => n.selected)
    return sel.length === 1 ? (sel[0]?.id ?? null) : null
  }, [nodes])
  const focusOrigin = focusEnabled ? (hoverNodeId ?? selectedId) : null

  const focusSets = useMemo(() => {
    if (!focusOrigin) return null
    const nodeSet = new Set<string>([focusOrigin])
    const edgeSet = new Set<string>()
    for (const e of edges) {
      if (e.source === focusOrigin) {
        nodeSet.add(e.target)
        edgeSet.add(e.id)
      } else if (e.target === focusOrigin) {
        nodeSet.add(e.source)
        edgeSet.add(e.id)
      }
    }
    return { nodeSet, edgeSet }
  }, [focusOrigin, edges])

  // "Find orphans" (spec v1.1 §8): nodes with no incident edge (groups excluded).
  const orphanIds = useMemo(() => {
    if (!highlightOrphans) return null
    const connected = new Set<string>()
    for (const e of edges) {
      connected.add(e.source)
      connected.add(e.target)
    }
    const ids = new Set(
      nodes.filter((n) => n.type !== 'group' && !connected.has(n.id)).map((n) => n.id),
    )
    return ids.size > 0 ? ids : null
  }, [highlightOrphans, nodes, edges])

  const rfNodes = useMemo(() => {
    if (orphanIds) {
      return display.nodes.map((n) => ({
        ...n,
        className: orphanIds.has(n.id) ? 'sm-focused' : 'sm-dimmed',
      }))
    }
    if (!focusSets || !focusOrigin) return display.nodes
    return display.nodes.map((n) => ({
      ...n,
      className:
        n.id === focusOrigin ? undefined : focusSets.nodeSet.has(n.id) ? 'sm-focused' : 'sm-dimmed',
    }))
  }, [display.nodes, focusSets, focusOrigin, orphanIds])

  // Delta view only: a dashed grey "replaces" arrow from each replacing node to
  // its replacement (spec v1.3 §3.3). Synthetic — never stored in the DB.
  const replacesEdges = useMemo<Edge[]>(() => {
    if (diagramState !== 'delta') return []
    const visible = new Set(display.nodes.filter((n) => !n.hidden).map((n) => n.id))
    return nodes
      .filter(
        (n) =>
          n.data.lifecycle === 'replacing' &&
          n.data.replacedByNodeId &&
          visible.has(n.id) &&
          visible.has(n.data.replacedByNodeId),
      )
      .map((n) => ({
        id: `__replaces_${n.id}`,
        source: n.id,
        target: n.data.replacedByNodeId as string,
        type: 'custom',
        label: 'replaces',
        data: { direction: 'one_way', color: 'var(--color-ink-subtle)', strokeStyle: 'dashed' },
        selectable: false,
        deletable: false,
      }))
  }, [diagramState, nodes, display.nodes])

  const rfEdges = useMemo(() => {
    // In orphan mode every edge connects non-orphans, so dim them all.
    let styled: Edge[]
    if (orphanIds) styled = display.edges.map((e) => ({ ...e, className: 'sm-dimmed' }))
    else if (!focusSets) styled = display.edges
    else
      styled = display.edges.map((e) => ({
        ...e,
        className: focusSets.edgeSet.has(e.id) ? 'sm-focused' : 'sm-dimmed',
      }))
    return replacesEdges.length ? [...styled, ...replacesEdges] : styled
  }, [display.edges, focusSets, orphanIds, replacesEdges])

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      if (presenting) return
      const type = event.dataTransfer.getData(DND_MIME) as NodeType
      if (!type) return
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const id = addNode(type, { x: position.x - 80, y: position.y - 20 })
      flashNode(id)
    },
    [screenToFlowPosition, addNode, flashNode, presenting],
  )

  const onEdgeContextMenu = useCallback(
    (event: MouseEvent, edge: Edge) => {
      event.preventDefault()
      if (presenting) return
      setMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id })
    },
    [presenting],
  )

  const onNodeMouseEnter = useCallback(
    (_event: MouseEvent, node: Node) => {
      if (!focusEnabled) return
      clearTimeout(hoverTimer.current)
      hoverTimer.current = setTimeout(() => setHoverNode(node.id), 200)
    },
    [focusEnabled, setHoverNode],
  )

  const onNodeMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setHoverNode(null)
  }, [setHoverNode])

  const onNodeDoubleClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      if (!presenting) setEditingNode(node.id)
    },
    [presenting, setEditingNode],
  )

  const onPaneClick = useCallback(() => {
    setMenu(null)
    setEditingNode(null)
    if (highlightOrphans) setHighlightOrphans(false)
  }, [highlightOrphans, setHighlightOrphans, setEditingNode])

  return (
    <div className="relative h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      {paletteDragType && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-accent-soft/30 ring-2 ring-inset ring-accent/40" />
      )}
      <EdgeMarkers />
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={(changes) => onNodesChange(changes as NodeChange<SMNode>[])}
        onEdgesChange={(changes) => onEdgesChange(changes as EdgeChange<SMEdge>[])}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        onEdgeContextMenu={onEdgeContextMenu}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={!presenting}
        nodesConnectable={!presenting}
        deleteKeyCode={presenting ? null : ['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Shift']}
        selectionKeyCode={null}
        connectionLineStyle={{ stroke: 'var(--color-accent)', strokeWidth: 2 }}
        panOnScroll
        panActivationKeyCode="Space"
        selectNodesOnDrag={false}
      >
        {dotGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="var(--color-border)"
          />
        )}
        {showMinimap && (
          <MiniMap
            pannable
            zoomable
            className="overflow-hidden rounded-[8px] border border-border !bg-surface shadow-node"
            maskColor="rgba(20, 20, 20, 0.06)"
            nodeColor="var(--color-border-strong)"
          />
        )}
        {!presenting && <ZoomControls />}
      </ReactFlow>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} edgeId={menu.edgeId} onClose={() => setMenu(null)} />
      )}
    </div>
  )
}
