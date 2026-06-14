import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSuggestions } from '@/lib/aiApi'
import type { AiSuggestion, AiSuggestionCategory, AiSuggestionImpact } from '@system-map/shared'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
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

  // The static demo has no backend to call.
  if (DEMO) return null

  function start() {
    setOpen(true)
    if (!suggest.data && !suggest.isPending) suggest.mutate()
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
            {suggest.isPending && (
              <p className="py-10 text-center text-sm text-ink-subtle">Analysing your map…</p>
            )}

            {suggest.isError && (
              <div className="rounded-[10px] border border-border bg-surface-2 p-4 text-sm text-ink-muted">
                {suggest.error.message}
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => suggest.mutate()}>
                    Try again
                  </Button>
                </div>
              </div>
            )}

            {suggest.data && (
              <div className="flex flex-col gap-3">
                {suggest.data.suggestions.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-subtle">
                    No suggestions — your map looks tidy.
                  </p>
                ) : (
                  suggest.data.suggestions.map((s) => (
                    <SuggestionCard key={`${s.category}:${s.title}`} suggestion={s} />
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SuggestionCard({ suggestion }: { suggestion: AiSuggestion }) {
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
    </div>
  )
}
