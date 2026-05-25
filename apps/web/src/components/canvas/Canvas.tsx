import { DND_MIME } from '@/lib/dnd'
import { nodeTypes } from '@/lib/nodeRegistry'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import type { NodeType } from '@system-map/shared'
import { Background, BackgroundVariant, ReactFlow, useReactFlow } from '@xyflow/react'
import { type DragEvent, useCallback } from 'react'
import { ZoomControls } from './controls/ZoomControls'

export function Canvas() {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const onNodesChange = useDiagramStore((s) => s.onNodesChange)
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange)
  const addNode = useDiagramStore((s) => s.addNode)
  const dotGrid = useUiStore((s) => s.dotGrid)
  const flashNode = useUiStore((s) => s.flashNode)
  const { screenToFlowPosition } = useReactFlow()

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

  return (
    <div className="h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Shift']}
        selectionKeyCode={null}
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
    </div>
  )
}
