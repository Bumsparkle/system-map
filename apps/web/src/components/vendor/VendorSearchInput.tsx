import { cn } from '@/lib/utils'
import { lookupVendor, searchVendors } from '@/lib/vendorApi'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import type { VendorSuggestion } from '@system-map/shared'
import { useEffect, useState } from 'react'

/**
 * Typeahead shown inside a freshly-dropped App node (spec v1.2 §4.1). Debounced
 * search, keyboard nav, optimistic placement: picking a vendor fills the name
 * instantly, then swaps in the enriched record when /lookup resolves.
 */
export function VendorSearchInput({ nodeId }: { nodeId: string }) {
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const setVendorLoading = useUiStore((s) => s.setVendorLoading)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<VendorSuggestion[]>([])
  const [highlighted, setHighlighted] = useState(0)
  const [typing, setTyping] = useState(false)

  // Debounce 250ms; only show the "Searching…" hint if it takes >400ms (no flicker).
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setSuggestions([])
      setTyping(false)
      return
    }
    let cancelled = false
    const typingTimer = setTimeout(() => !cancelled && setTyping(true), 400)
    const debounce = setTimeout(async () => {
      const res = await searchVendors(q)
      if (cancelled) return
      clearTimeout(typingTimer)
      setSuggestions(res)
      setHighlighted(0)
      setTyping(false)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(debounce)
      clearTimeout(typingTimer)
    }
  }, [query])

  async function pick(name: string) {
    setVendorLoading(nodeId, true)
    // Optimistic: name shows immediately while the enriched record loads.
    updateNodeData(nodeId, { awaitingVendor: false, label: name, vendor: { name } })
    const full = await lookupVendor(name)
    if (full) {
      updateNodeData(nodeId, {
        label: full.name,
        category: full.category ?? undefined,
        vendor: full,
      })
    }
    setVendorLoading(nodeId, false)
  }

  // No matching vendor? Enter/blur still creates the node with the typed name.
  function commitManual() {
    const name = query.trim()
    if (name) updateNodeData(nodeId, { awaitingVendor: false, label: name })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation() // keep React Flow's delete/shortcut handlers out
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const s = suggestions[highlighted]
      if (s) pick(s.name)
      else commitManual()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      commitManual()
    }
  }

  return (
    <div className="nodrag nopan w-[200px]">
      <input
        // biome-ignore lint/a11y/noAutofocus: dropping an App node should land in search
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={commitManual}
        placeholder="Search vendor…"
        className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none"
      />
      {(suggestions.length > 0 || typing) && (
        <div className="mt-2 flex max-h-56 flex-col gap-0.5 overflow-y-auto border-t border-border pt-2">
          {suggestions.length === 0 && typing && (
            <div className="px-1.5 py-1 text-[12px] text-ink-subtle">Searching…</div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              type="button"
              onMouseEnter={() => setHighlighted(i)}
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={() => pick(s.name)}
              className={cn(
                'flex items-center justify-between gap-2 rounded-[5px] px-1.5 py-1 text-left text-[13px] transition-colors duration-[100ms]',
                i === highlighted ? 'bg-accent-soft text-ink' : 'text-ink-muted hover:bg-surface-2',
              )}
            >
              <span className="truncate">{s.name}</span>
              {s.hint && <span className="shrink-0 text-[11px] text-ink-subtle">{s.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
