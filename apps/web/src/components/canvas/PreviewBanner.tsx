import { Button } from '@/components/ui/button'
import { summarizeDelta } from '@/lib/previewDelta'
import { useDiagramStore } from '@/stores/diagramStore'
import { toast } from '@/stores/toastStore'
import { useUiStore } from '@/stores/uiStore'
import { Check, Sparkles, X } from 'lucide-react'

/**
 * Floating control shown while an AI suggestion's "after" state is previewed on
 * the canvas (faded ghost). Apply commits the change (one undo step); Discard
 * clears the overlay. Mounted over the canvas in the editor.
 */
export function PreviewBanner() {
  const previewDelta = useUiStore((s) => s.previewDelta)
  const setPreviewDelta = useUiStore((s) => s.setPreviewDelta)
  const applyPreview = useDiagramStore((s) => s.applyPreview)

  if (!previewDelta) return null

  const summary = summarizeDelta(previewDelta)

  function discard() {
    setPreviewDelta(null)
  }

  function apply() {
    if (!previewDelta) return
    applyPreview(previewDelta)
    setPreviewDelta(null)
    toast({ message: 'Suggestion applied — Cmd+Z to undo' })
  }

  return (
    <div className="-translate-x-1/2 pointer-events-auto absolute top-4 left-1/2 z-20 flex max-w-[min(92vw,640px)] items-center gap-3 rounded-[10px] border border-border bg-surface/95 px-3 py-2 shadow-[0_8px_40px_rgba(20,20,20,0.12)] backdrop-blur-sm">
      <Sparkles className="h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0">
        <p className="truncate font-medium text-ink text-sm">Preview · {previewDelta.title}</p>
        <p className="text-[11px] text-ink-subtle">
          {summary ? `${summary} — faded on the canvas` : 'No structural change to draw'}
        </p>
      </div>
      <div className="ml-1 flex shrink-0 items-center gap-1.5">
        <Button size="sm" variant="ghost" onClick={discard}>
          <X className="h-4 w-4" />
          Discard
        </Button>
        <Button size="sm" onClick={apply} disabled={!summary}>
          <Check className="h-4 w-4" />
          Apply
        </Button>
      </div>
    </div>
  )
}
