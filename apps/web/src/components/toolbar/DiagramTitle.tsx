import { useDiagramStore } from '@/stores/diagramStore'
import { useEffect, useRef, useState } from 'react'

export function DiagramTitle() {
  const name = useDiagramStore((s) => s.name)
  const setName = useDiagramStore((s) => s.setName)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(name)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, name])

  function commit() {
    const next = draft.trim()
    if (next) setName(next)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="h-8 w-56 rounded-[6px] border border-border bg-surface px-2 text-sm font-medium text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Rename diagram"
      className="rounded-[6px] px-2 py-1 text-sm font-medium text-ink transition-colors duration-[120ms] ease-out hover:bg-surface-2"
    >
      {name || 'Untitled'}
    </button>
  )
}
