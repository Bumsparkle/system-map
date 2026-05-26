import { type NodeTypeMeta, paletteMetas } from '@/lib/nodeRegistry'
import { useUiStore } from '@/stores/uiStore'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DraggableNodeItem } from './DraggableNodeItem'
import { PaletteCategory } from './PaletteCategory'
import { PaletteSearch } from './PaletteSearch'

export function NodePalette() {
  const [query, setQuery] = useState('')
  const collapsed = useUiStore((s) => s.paletteCollapsed)
  const togglePalette = useUiStore((s) => s.togglePalette)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? paletteMetas.filter(
          (m) => m.label.toLowerCase().includes(q) || m.hint.toLowerCase().includes(q),
        )
      : paletteMetas
    const byCategory = new Map<string, NodeTypeMeta[]>()
    for (const meta of filtered) {
      const list = byCategory.get(meta.category) ?? []
      list.push(meta)
      byCategory.set(meta.category, list)
    }
    return [...byCategory.entries()]
  }, [query])

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-surface py-2">
        <button
          type="button"
          onClick={togglePalette}
          aria-label="Expand palette"
          title="Expand palette"
          className="grid h-8 w-8 place-items-center rounded-[6px] text-ink-muted transition-colors duration-[120ms] ease-out hover:bg-surface-2 hover:text-ink"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <div className="mt-2 h-px w-6 bg-border" />
        <div className="mt-2 flex flex-col items-center gap-1 overflow-y-auto">
          {paletteMetas.map((meta) => (
            <DraggableNodeItem key={meta.type} meta={meta} compact />
          ))}
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <div className="flex-1">
          <PaletteSearch value={query} onChange={setQuery} />
        </div>
        <button
          type="button"
          onClick={togglePalette}
          aria-label="Collapse palette"
          title="Collapse palette"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] text-ink-muted transition-colors duration-[120ms] ease-out hover:bg-surface-2 hover:text-ink"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {groups.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-sm text-ink-subtle">No matching nodes.</p>
        ) : (
          groups.map(([category, metas]) => (
            <PaletteCategory key={category} name={category}>
              {metas.map((meta) => (
                <DraggableNodeItem key={meta.type} meta={meta} />
              ))}
            </PaletteCategory>
          ))
        )}
      </div>

      <div className="border-t border-border px-3 py-2.5 text-[11px] leading-snug text-ink-subtle">
        Drag a node onto the canvas to add it.
      </div>
    </aside>
  )
}
