import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { currencySymbol } from '@/lib/cost'
import type { SMNode } from '@/lib/flow'
import { cn } from '@/lib/utils'
import { useDiagramStore } from '@/stores/diagramStore'
import type { CostConfidence, Currency, NodeCost } from '@system-map/shared'

const CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR']
const CONFIDENCES: { value: CostConfidence; label: string }[] = [
  { value: 'known', label: 'Known' },
  { value: 'estimated', label: 'Estimated' },
  { value: 'unknown', label: 'Unknown' },
]

/** Monthly-cost controls for a node (spec v1.3 §5.1). Collapsed to a single
 *  "Add cost" affordance until a cost exists, to avoid clutter. */
export function CostSection({ node }: { node: SMNode }) {
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const cost = node.data.cost

  if (!cost) {
    return (
      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() =>
            updateNodeData(node.id, {
              cost: { monthlyAmount: 0, currency: 'GBP', confidence: 'estimated' },
            })
          }
          className="text-[13px] text-accent transition-colors duration-[120ms] hover:underline"
        >
          + Add cost
        </button>
      </div>
    )
  }

  const patch = (next: Partial<NodeCost>) => updateNodeData(node.id, { cost: { ...cost, ...next } })

  return (
    <div className="border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          Cost
        </span>
        <button
          type="button"
          onClick={() => updateNodeData(node.id, { cost: undefined })}
          className="text-[11px] text-ink-subtle transition-colors duration-[120ms] hover:text-ink"
        >
          Remove
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cost-currency">Currency</Label>
            <select
              id="cost-currency"
              value={cost.currency}
              onChange={(e) => patch({ currency: e.target.value as Currency })}
              className="h-9 rounded-[6px] border border-border bg-surface px-2 text-sm text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {currencySymbol(c)} {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="cost-amount">Monthly</Label>
            <Input
              id="cost-amount"
              type="number"
              min={0}
              step="any"
              value={cost.monthlyAmount ? cost.monthlyAmount / 100 : ''}
              placeholder="0"
              className="text-right"
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value)
                patch({ monthlyAmount: Number.isFinite(v) ? Math.round(v * 100) : 0 })
              }}
            />
          </div>
        </div>

        {node.data.lifecycle === 'modifying' && (
          <div className="flex flex-col gap-1.5 rounded-[6px] border border-border-strong border-dashed bg-surface-2/40 p-2.5">
            <Label htmlFor="cost-future">Future monthly (after change)</Label>
            <Input
              id="cost-future"
              type="number"
              min={0}
              step="any"
              value={cost.futureMonthlyAmount != null ? cost.futureMonthlyAmount / 100 : ''}
              placeholder={`${cost.monthlyAmount / 100} — same as now`}
              className="text-right"
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  patch({ futureMonthlyAmount: undefined })
                  return
                }
                const v = Number.parseFloat(raw)
                patch({ futureMonthlyAmount: Number.isFinite(v) ? Math.round(v * 100) : undefined })
              }}
            />
            <p className="text-[11px] leading-snug text-ink-subtle">
              Used in <span className="font-medium text-ink-muted">Future</span> view. Leave blank
              to keep it the same as now.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cost-basis">Basis</Label>
          <Input
            id="cost-basis"
            value={cost.basis ?? ''}
            placeholder="e.g. 12 seats @ £20/mo"
            onChange={(e) => patch({ basis: e.target.value || undefined })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Confidence</Label>
          <div className="flex rounded-[6px] border border-border p-0.5">
            {CONFIDENCES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => patch({ confidence: c.value })}
                className={cn(
                  'flex-1 rounded-[4px] px-2 py-1 text-[12px] transition-colors duration-[120ms] ease-out',
                  cost.confidence === c.value
                    ? 'bg-accent text-white'
                    : 'text-ink-muted hover:bg-surface-2',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cost-notes">Notes</Label>
          <Textarea
            id="cost-notes"
            value={cost.notes ?? ''}
            placeholder="Optional"
            onChange={(e) => patch({ notes: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  )
}
