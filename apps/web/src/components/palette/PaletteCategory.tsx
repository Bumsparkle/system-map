import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { type ReactNode, useState } from 'react'

export function PaletteCategory({
  name,
  children,
  defaultOpen = true,
}: {
  name: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-[5px] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle transition-colors duration-[120ms] ease-out hover:text-ink-muted"
      >
        <span>{name}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-[120ms] ease-out',
            !open && '-rotate-90',
          )}
        />
      </button>
      {open && <div className="mt-0.5 flex flex-col gap-0.5">{children}</div>}
    </div>
  )
}
