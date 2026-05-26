import { FLOW_TYPES } from '@/lib/edgeRegistry'
import { useDiagramStore } from '@/stores/diagramStore'
import { Check, Trash2 } from 'lucide-react'
import { useEffect } from 'react'

export function ContextMenu({
  x,
  y,
  edgeId,
  onClose,
}: {
  x: number
  y: number
  edgeId: string
  onClose: () => void
}) {
  const edge = useDiagramStore((s) => s.edges.find((e) => e.id === edgeId))
  const setEdgeFlowType = useDiagramStore((s) => s.setEdgeFlowType)
  const updateEdgeData = useDiagramStore((s) => s.updateEdgeData)
  const removeEdge = useDiagramStore((s) => s.removeEdge)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!edge) return null
  const direction = edge.data?.direction ?? 'one_way'

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <div
        className="fixed z-50 w-48 rounded-[8px] border border-border bg-surface p-1 shadow-[0_8px_30px_rgba(20,20,20,0.12)]"
        style={{ left: x, top: y }}
      >
        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          Flow type
        </div>
        {FLOW_TYPES.map((f) => (
          <button
            key={f.type}
            type="button"
            onClick={() => {
              setEdgeFlowType(edge.id, f.type)
              onClose()
            }}
            className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-sm text-ink transition-colors duration-[120ms] ease-out hover:bg-surface-2"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
            <span className="flex-1 text-left">{f.label}</span>
            {edge.type === f.type && <Check className="h-3.5 w-3.5 text-accent" />}
          </button>
        ))}
        <div className="my-1 h-px bg-border" />
        <button
          type="button"
          onClick={() => {
            updateEdgeData(edge.id, { direction: direction === 'two_way' ? 'one_way' : 'two_way' })
            onClose()
          }}
          className="flex w-full items-center rounded-[5px] px-2 py-1.5 text-sm text-ink transition-colors duration-[120ms] ease-out hover:bg-surface-2"
        >
          {direction === 'two_way' ? 'Make one-way' : 'Make two-way'}
        </button>
        <div className="my-1 h-px bg-border" />
        <button
          type="button"
          onClick={() => {
            removeEdge(edge.id)
            onClose()
          }}
          className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-sm text-red-600 transition-colors duration-[120ms] ease-out hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete edge
        </button>
      </div>
    </>
  )
}
