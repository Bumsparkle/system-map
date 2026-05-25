import { type NodeTypeMeta, paletteMetas } from '@/lib/nodeRegistry'
import { useMemo, useState } from 'react'
import { DraggableNodeItem } from './DraggableNodeItem'
import { PaletteCategory } from './PaletteCategory'
import { PaletteSearch } from './PaletteSearch'

export function NodePalette() {
  const [query, setQuery] = useState('')

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

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border p-3">
        <PaletteSearch value={query} onChange={setQuery} />
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
