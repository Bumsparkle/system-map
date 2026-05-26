import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FLOW_TYPES } from '@/lib/edgeRegistry'
import type { SMEdge } from '@/lib/flow'
import { cn } from '@/lib/utils'
import { useDiagramStore } from '@/stores/diagramStore'
import type { Direction, EdgeRouting } from '@system-map/shared'
import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

function Field({
  label,
  htmlFor,
  children,
}: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'one_way', label: 'One-way' },
  { value: 'two_way', label: 'Two-way' },
]

const ROUTINGS: { value: EdgeRouting; label: string }[] = [
  { value: 'bezier', label: 'Bezier' },
  { value: 'smoothstep', label: 'Smoothstep' },
  { value: 'straight', label: 'Straight' },
  { value: 'step', label: 'Step' },
]

export function EdgeInspector({ edge }: { edge: SMEdge }) {
  const setEdgeFlowType = useDiagramStore((s) => s.setEdgeFlowType)
  const setEdgeLabel = useDiagramStore((s) => s.setEdgeLabel)
  const updateEdgeData = useDiagramStore((s) => s.updateEdgeData)
  const removeEdge = useDiagramStore((s) => s.removeEdge)

  const direction = edge.data?.direction ?? 'one_way'
  const labelValue = typeof edge.label === 'string' ? edge.label : ''

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          Flow
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => removeEdge(edge.id)}
          aria-label="Delete edge"
        >
          <Trash2 className="h-4 w-4 text-ink-muted" />
        </Button>
      </div>

      <Field label="Flow type">
        <div className="grid grid-cols-3 gap-1.5">
          {FLOW_TYPES.map((f) => (
            <button
              key={f.type}
              type="button"
              onClick={() => setEdgeFlowType(edge.id, f.type)}
              className={cn(
                'flex items-center gap-1.5 rounded-[6px] border px-2 py-1.5 text-[13px] transition-colors duration-[120ms] ease-out',
                edge.type === f.type
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-border text-ink-muted hover:bg-surface-2',
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: f.color }}
              />
              {f.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Label" htmlFor="edge-label">
        <Input
          id="edge-label"
          value={labelValue}
          placeholder="e.g. Subscription revenue"
          onChange={(e) => setEdgeLabel(edge.id, e.target.value)}
        />
      </Field>

      <Field label="Direction">
        <div className="flex rounded-[6px] border border-border p-0.5">
          {DIRECTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => updateEdgeData(edge.id, { direction: d.value })}
              className={cn(
                'flex-1 rounded-[4px] px-2 py-1 text-[13px] transition-colors duration-[120ms] ease-out',
                direction === d.value
                  ? 'bg-accent text-white'
                  : 'text-ink-muted hover:bg-surface-2',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Style" htmlFor="edge-style">
        <select
          id="edge-style"
          value={edge.data?.routing ?? ''}
          onChange={(e) =>
            updateEdgeData(edge.id, {
              routing: (e.target.value || undefined) as EdgeRouting | undefined,
            })
          }
          className="h-9 w-full rounded-[6px] border border-border bg-surface px-2 text-sm text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <option value="">Default</option>
          {ROUTINGS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notes" htmlFor="edge-notes">
        <Textarea
          id="edge-notes"
          value={edge.data?.notes ?? ''}
          placeholder="Anything worth noting about this flow?"
          onChange={(e) => updateEdgeData(edge.id, { notes: e.target.value || undefined })}
        />
      </Field>
    </div>
  )
}
