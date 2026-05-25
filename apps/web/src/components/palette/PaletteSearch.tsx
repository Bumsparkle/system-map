import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function PaletteSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search nodes…"
        className="h-8 pl-8 text-[13px]"
      />
    </div>
  )
}
