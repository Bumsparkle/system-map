import { DND_MIME } from '@/lib/dnd'
import { edgeTypes } from '@/lib/edgeRegistry'
import type { SMEdge } from '@/lib/flow'
import { nodeTypes } from '@/lib/nodeRegistry'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import type { NodeType } from '@system-map/shared'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react'
import { type DragEvent, type MouseEvent, useCallback, useState } from 'react'
import { ContextMenu } from './ContextMenu'
import { ZoomControls } from './controls/ZoomControls'
import { EdgeMarkers } from './edges/BaseEdge'

type MenuState = { x: number; y: number; edgeId: string }

export function Canvas() {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const onNodesChange = useDiagramStore((s) => s.onNodesChange)
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange)
  const onConnect = useDiagramStore((s) => s.onConnect)
  const addNode = useDiagramStore((s) => s.addNode)
  const dotGrid = useUiStore((s) => s.dotGrid)
  const flashNode = useUiStore((s) => s.flashNode)
  const { screenToFlowPosition } = useReactFlow()
  const [menu, setMenu] = useState<MenuState | null>(null)

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData(DND_MIME) as NodeType
      if (!type) return
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const id = addNode(type, { x: position.x - 80, y: position.y - 20 })
      flashNode(id)
    },
    [screenToFlowPosition, addNode, flashNode],
  )

  const onEdgeContextMenu = useCallback((event: MouseEvent, edge: SMEdge) => {
    event.preventDefault()
    setMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id })
  }, [])

  return (
    <div className="h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      <EdgeMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={() => setMenu(null)}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Shift']}
        selectionKeyCode={null}
        connectionLineStyle={{ stroke: 'var(--color-accent)', strokeWidth: 2 }}
        panOnScroll
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
        <ZoomControls />
      </ReactFlow>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} edgeId={menu.edgeId} onClose={() => setMenu(null)} />
      )}
    </div>
  )
}
