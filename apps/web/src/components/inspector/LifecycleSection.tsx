import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SMNode } from '@/lib/flow'
import { cn } from '@/lib/utils'
import { useDiagramStore } from '@/stores/diagramStore'
import type { NodeLifecycle } from '@system-map/shared'
import { useMemo } from 'react'

const LIFECYCLES: { value: NodeLifecycle; label: string }[] = [
  { value: 'existing', label: 'Existing' },
  { value: 'new', label: 'New' },
  { value: 'retiring', label: 'Retiring' },
  { value: 'replacing', label: 'Replacing' },
  { value: 'modifying', label: 'Modifying' },
]

/** Lifecycle controls for the current/future-state model (spec v1.3 §4). */
export function LifecycleSection({ node }: { node: SMNode }) {
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const nodes = useDiagramStore((s) => s.nodes)
  const lifecycle = node.data.lifecycle ?? 'existing'
  const replacedByNodeId = node.data.replacedByNodeId ?? ''
  const notes = node.data.lifecycleNotes ?? ''

  // Candidate replacements: other nodes marked 'new'.
  const newNodes = useMemo(
    () => nodes.filter((n) => n.id !== node.id && n.data.lifecycle === 'new'),
    [nodes, node.id],
  )

  return (
    <div className="border-t border-border pt-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        Lifecycle
      </span>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {LIFECYCLES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => updateNodeData(node.id, { lifecycle: l.value })}
            className={cn(
              'rounded-[6px] border px-2 py-1 text-[12px] transition-colors duration-[120ms] ease-out',
              lifecycle === l.value
                ? 'border-accent bg-accent-soft text-ink'
                : 'border-border text-ink-muted hover:bg-surface-2',
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      {lifecycle === 'replacing' && (
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor="replaced-by">Replaced by</Label>
          {newNodes.length > 0 ? (
            <select
              id="replaced-by"
              value={replacedByNodeId}
              onChange={(e) =>
                updateNodeData(node.id, { replacedByNodeId: e.target.value || undefined })
              }
              className="h-9 w-full rounded-[6px] border border-border bg-surface px-2 text-sm text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <option value="">Select a node…</option>
              {newNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.data.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[12px] leading-snug text-ink-subtle">
              Add a node marked <span className="font-medium text-ink-muted">New</span> to set it as
              the replacement.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1.5">
        <Label htmlFor="lifecycle-notes">Why is this changing?</Label>
        <Textarea
          id="lifecycle-notes"
          value={notes}
          maxLength={500}
          placeholder="Consultant rationale (optional)"
          onChange={(e) => updateNodeData(node.id, { lifecycleNotes: e.target.value || undefined })}
        />
      </div>
    </div>
  )
}
