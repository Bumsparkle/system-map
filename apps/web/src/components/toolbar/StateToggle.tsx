import { cn } from '@/lib/utils'
import { type DiagramStateView, useUiStore } from '@/stores/uiStore'

const STATES: { value: DiagramStateView; label: string }[] = [
  { value: 'current', label: 'Current' },
  { value: 'future', label: 'Future' },
  { value: 'delta', label: 'Delta' },
]

/** Current / Future / Delta state toggle (spec v1.3 §3). */
export function StateToggle() {
  const state = useUiStore((s) => s.diagramState)
  const setState = useUiStore((s) => s.setDiagramState)

  return (
    <div className="flex shrink-0 rounded-[7px] border border-border bg-surface p-0.5">
      {STATES.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => setState(s.value)}
          className={cn(
            'rounded-[5px] px-2.5 py-1 text-[13px] font-medium transition-colors duration-[120ms] ease-out',
            state === s.value
              ? 'bg-accent text-white'
              : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
