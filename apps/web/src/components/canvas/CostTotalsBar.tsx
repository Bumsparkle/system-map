import { formatAmount, rollupCost } from '@/lib/cost'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import { useMemo } from 'react'

const uncostedNote = (n: number) => (n > 0 ? ` (+ ${n} node${n > 1 ? 's' : ''} uncosted)` : '')

/** View-aware monthly-spend rollup, bottom-right of the canvas (spec v1.3 §5.3). */
export function CostTotalsBar() {
  const nodes = useDiagramStore((s) => s.nodes)
  const layers = useDiagramStore((s) => s.layers)
  const state = useUiStore((s) => s.diagramState)

  const { current, future } = useMemo(
    () => ({
      current: rollupCost(nodes, layers, 'current'),
      future: rollupCost(nodes, layers, 'future'),
    }),
    [nodes, layers],
  )

  // No costs anywhere → don't show the bar at all.
  if (!current.totalMinor && !future.totalMinor && !current.uncosted && !future.uncosted) {
    return null
  }

  const shell =
    'nodrag nopan absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-1.5 text-[12px] shadow-node'

  if (state === 'delta') {
    const deltaMinor = future.totalMinor - current.totalMinor
    const pct = current.totalMinor ? Math.round((deltaMinor / current.totalMinor) * 100) : 0
    const sign = deltaMinor > 0 ? '+' : deltaMinor < 0 ? '−' : ''
    // Amber for an increase, green for savings (existing tokens, spec §5.3).
    const color = deltaMinor > 0 ? 'var(--color-flow-manual)' : 'var(--color-flow-cash)'
    return (
      <div className={shell}>
        <span className="text-ink-muted">Current:</span>
        <span className="font-medium text-ink">
          {formatAmount(current.totalMinor, current.currency)}/mo
        </span>
        <span className="text-ink-subtle">→</span>
        <span className="text-ink-muted">Future:</span>
        <span className="font-medium text-ink">
          {formatAmount(future.totalMinor, future.currency)}/mo
        </span>
        {deltaMinor !== 0 && (
          <span className="font-medium" style={{ color }}>
            {sign}
            {formatAmount(Math.abs(deltaMinor), future.currency)} ({sign}
            {Math.abs(pct)}%)
          </span>
        )}
      </div>
    )
  }

  const active = state === 'future' ? future : current
  return (
    <div className={shell}>
      <span className="text-ink-muted">
        {state === 'future' ? 'Future spend' : 'Current spend'}:
      </span>
      <span className="font-medium text-ink">
        {formatAmount(active.totalMinor, active.currency)}/mo
      </span>
      {active.uncosted > 0 && (
        <span className="text-ink-subtle">{uncostedNote(active.uncosted)}</span>
      )}
    </div>
  )
}
