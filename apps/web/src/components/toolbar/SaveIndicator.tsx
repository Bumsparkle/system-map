import { useUiStore } from '@/stores/uiStore'
import { Check, CloudOff, Loader2 } from 'lucide-react'

export function SaveIndicator() {
  const status = useUiStore((s) => s.saveStatus)

  if (status === 'idle') return null

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-ink-subtle">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-red-600">
        <CloudOff className="h-3.5 w-3.5" />
        Save failed
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 text-[13px] text-ink-subtle">
      <Check className="h-3.5 w-3.5 text-flow-cash" />
      Saved
    </span>
  )
}
