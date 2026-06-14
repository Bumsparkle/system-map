import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSuggestions } from '@/lib/aiApi'
import { makeVisibilityPredicate, nodeInState } from '@/lib/displayGraph'
import { buildPreviewDelta, hasPreview, isPreviewDeltaEmpty } from '@/lib/previewDelta'
import { useDiagramStore } from '@/stores/diagramStore'
import { toast } from '@/stores/toastStore'
import { useUiStore } from '@/stores/uiStore'
import type {
  AiSuggestResponse,
  AiSuggestion,
  AiSuggestionCategory,
  AiSuggestionImpact,
} from '@system-map/shared'
import { Eye, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

const DEMO = import.meta.env.VITE_DEMO === '1'

const CATEGORY: Record<AiSuggestionCategory, { label: string; className: string }> = {
  'ai-agent': { label: 'AI agent', className: 'bg-accent-soft text-accent' },
  automation: { label: 'Automation', className: 'bg-emerald-50 text-emerald-700' },
  integration: { label: 'Integration', className: 'bg-indigo-50 text-indigo-700' },
  consolidation: { label: 'Consolidation', className: 'bg-amber-50 text-amber-700' },
  resilience: { label: 'Resilience', className: 'bg-rose-50 text-rose-700' },
  cost: { label: 'Cost', className: 'bg-teal-50 text-teal-700' },
}

const IMPACT_DOT: Record<AiSuggestionImpact, string> = {
  high: 'bg-accent',
  medium: 'bg-amber-400',
  low: 'bg-border-strong',
}

export function AiSuggestions() {
  const { diagramId } = useParams()
  const [open, setOpen] = useState(false)
  const suggest = useSuggestions(diagramId ?? '')
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const layers = useDiagramStore((s) => s.layers)
  const views = useDiagramStore((s) => s.views)
  const activeViewId = useDiagramStore((s) => s.activeViewId)
  const diagramState = useUiStore((s) => s.diagramState)
  const setPreviewDelta = useUiStore((s) => s.setPreviewDelta)

  // Keep the last result on screen while a regenerate is in flight, so the
  // dialog doesn't flash back to the loading state (the mutation clears its
  // own `data` the moment it re-fires).
  const [shown, setShown] = useState<AiSuggestResponse | null>(null)
  useEffect(() => {
    if (suggest.data) setShown(suggest.data)
  }, [suggest.data])

  // The static demo has no backend to call.
  if (DEMO) return null

  function start() {
    // Clear any ghost still showing from a previous preview before reopening.
    setPreviewDelta(null)
    setOpen(true)
    if (!suggest.data && !suggest.isPending) suggest.mutate()
  }

  // Draw the suggestion's "after" state as a faded ghost on the canvas, and step
  // out of the way so it's visible (the banner takes over from here). Resolve
  // against the *visible* graph so ghosts never reference filtered-out nodes.
  function preview(s: AiSuggestion) {
    const activeView = views.find((v) => v.id === activeViewId) ?? null
    const isVisible = makeVisibilityPredicate(layers, activeView)
    const visibleNodes = nodes.filter(
      (n) => isVisible(n) && nodeInState(n.data.lifecycle ?? 'existing', diagramState),
    )
    const visibleIds = new Set(visibleNodes.map((n) => n.id))
    const visibleEdges = edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))

    const delta = buildPreviewDelta(s, visibleNodes, visibleEdges)
    if (isPreviewDeltaEmpty(delta)) {
      toast({
        message: "This suggestion doesn't map to specific nodes on the current view.",
        variant: 'error',
      })
      return
    }
    setPreviewDelta(delta)
    setOpen(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={start} title="Suggest improvements with AI">
        <Sparkles className="h-4 w-4" />
        Suggest
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              AI suggestions
            </DialogTitle>
            <DialogDescription>
              Ways to automate and improve this map — manual steps and AI-agent opportunities first.
            </DialogDescription>
          </DialogHeader>

          <div className="-mr-2 max-h-[60vh] overflow-y-auto pr-2">
            {/* First load (nothing to fall back to yet). */}
            {suggest.isPending && !shown && (
              <p className="py-10 text-center text-sm text-ink-subtle">Analysing your map…</p>
            )}

            {suggest.isError && !shown && (
              <div className="rounded-[10px] border border-border bg-surface-2 p-4 text-sm text-ink-muted">
                {suggest.error.message}
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => suggest.mutate()}>
                    Try again
                  </Button>
                </div>
              </div>
            )}

            {shown && (
              <div className="flex flex-col gap-3">
                {shown.suggestions.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-subtle">
                    No suggestions — your map looks tidy.
                  </p>
                ) : (
                  shown.suggestions.map((s) => (
                    <SuggestionCard
                      key={`${s.category}:${s.title}`}
                      suggestion={s}
                      onPreview={hasPreview(s) ? () => preview(s) : undefined}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Regenerate: the model is non-deterministic, so a fresh pull can
              surface different ideas. Available once a first result is in. */}
          {shown && (
            <DialogFooter className="items-center justify-between">
              <span className="text-[11px] text-ink-subtle">
                {suggest.isError ? (
                  <span className="text-rose-600">Couldn't refresh — showing the last result.</span>
                ) : (
                  `${shown.suggestions.length} ${shown.suggestions.length === 1 ? 'suggestion' : 'suggestions'}`
                )}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => suggest.mutate()}
                disabled={suggest.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${suggest.isPending ? 'animate-spin' : ''}`} />
                {suggest.isPending ? 'Regenerating…' : 'Regenerate'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function SuggestionCard({
  suggestion,
  onPreview,
}: {
  suggestion: AiSuggestion
  onPreview?: () => void
}) {
  const cat = CATEGORY[suggestion.category]
  return (
    <div className="rounded-[10px] border border-border bg-surface p-3.5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium ${cat.className}`}>
          {cat.label}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-ink-subtle">
          <span className={`h-1.5 w-1.5 rounded-full ${IMPACT_DOT[suggestion.impact]}`} />
          {suggestion.impact} impact
        </span>
      </div>
      <p className="font-medium text-ink">{suggestion.title}</p>
      <p className="mt-0.5 text-sm text-ink-muted">{suggestion.detail}</p>
      {suggestion.targets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {suggestion.targets.map((t) => (
            <span
              key={t}
              className="rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-muted"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {onPreview && (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={onPreview}>
            <Eye className="h-4 w-4" />
            Preview on canvas
          </Button>
        </div>
      )}
    </div>
  )
}
