import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ACCENT_SWATCHES,
  LUCIDE_ICONS,
  type NodeSize,
  SIMPLE_ICON_SLUGS,
  simpleIconUrl,
} from '@/lib/appearance'
import type { SMNode } from '@/lib/flow'
import { cn } from '@/lib/utils'
import { useDiagramStore } from '@/stores/diagramStore'
import { toast } from '@/stores/toastStore'
import type { NodeData } from '@system-map/shared'
import { ChevronDown } from 'lucide-react'
import { type FormEvent, useState } from 'react'

const SIZES: { value: NodeSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
]

function validateImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

export function NodeAppearance({ node }: { node: SMNode }) {
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const [open, setOpen] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const appearance = node.data.appearance ?? {}
  const isApp = node.type === 'app'

  function patch(next: Partial<NonNullable<NodeData['appearance']>>) {
    updateNodeData(node.id, { appearance: { ...appearance, ...next } })
  }

  async function submitUrl(e: FormEvent) {
    e.preventDefault()
    const url = urlDraft.trim()
    if (!url) return
    const ok = await validateImage(url)
    if (!ok) {
      toast({ message: "That image URL didn't load", variant: 'error' })
      return
    }
    patch({ iconUrl: url, iconKey: undefined })
    setUrlDraft('')
  }

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-subtle"
      >
        Appearance
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-[120ms]', !open && '-rotate-90')}
        />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Accent color</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => patch({ accentColor: undefined })}
                title="Use layer color"
                className={cn(
                  'h-6 rounded-[5px] border px-2 text-[11px] text-ink-muted',
                  !appearance.accentColor ? 'border-accent bg-accent-soft' : 'border-border',
                )}
              >
                Default
              </button>
              {ACCENT_SWATCHES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => patch({ accentColor: s.value })}
                  aria-label={`Accent ${s.key}`}
                  className={cn(
                    'h-6 w-6 rounded-full ring-offset-2 ring-offset-surface',
                    appearance.accentColor === s.value && 'ring-2 ring-accent',
                  )}
                  style={{ backgroundColor: s.value }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Size</Label>
            <div className="flex rounded-[6px] border border-border p-0.5">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => patch({ size: s.value })}
                  className={cn(
                    'flex-1 rounded-[4px] px-2 py-1 text-[13px] transition-colors duration-[120ms] ease-out',
                    (appearance.size ?? 'md') === s.value
                      ? 'bg-accent text-white'
                      : 'text-ink-muted hover:bg-surface-2',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Icon</Label>
              <button
                type="button"
                onClick={() => patch({ iconKey: undefined, iconUrl: undefined })}
                className="text-[11px] text-ink-subtle hover:text-ink"
              >
                Default
              </button>
            </div>

            {isApp ? (
              <>
                <form onSubmit={submitUrl}>
                  <Input
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onBlur={(e) => e.target.value.trim() && submitUrl(e as unknown as FormEvent)}
                    placeholder="Paste a logo URL…"
                    className="h-8 text-[13px]"
                  />
                </form>
                <div className="grid grid-cols-8 gap-1">
                  {SIMPLE_ICON_SLUGS.map((slug) => {
                    const url = simpleIconUrl(slug)
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => patch({ iconUrl: url, iconKey: undefined })}
                        title={slug}
                        className={cn(
                          'grid h-8 w-8 place-items-center rounded-[5px] border',
                          appearance.iconUrl === url
                            ? 'border-accent bg-accent-soft'
                            : 'border-transparent hover:bg-surface-2',
                        )}
                      >
                        <img src={url} alt={slug} className="h-4 w-4 object-contain" />
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {Object.entries(LUCIDE_ICONS).map(([key, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => patch({ iconKey: key, iconUrl: undefined })}
                    title={key}
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-[5px] border text-ink-muted',
                      appearance.iconKey === key
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-transparent hover:bg-surface-2',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
