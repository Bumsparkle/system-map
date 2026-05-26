import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FLOW_TYPES } from '@/lib/edgeRegistry'
import { NODE_TYPE_LABEL } from '@/lib/nodeRegistry'
import { cn } from '@/lib/utils'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import type { FlowType, NodeType, ViewFilter } from '@system-map/shared'
import { Check, ChevronDown, Plus, Star, Trash2 } from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'

const ALL_NODE_TYPES = Object.entries(NODE_TYPE_LABEL) as [NodeType, string][]

export function ViewSelector() {
  const views = useDiagramStore((s) => s.views)
  const activeViewId = useDiagramStore((s) => s.activeViewId)
  const setActiveView = useDiagramStore((s) => s.setActiveView)
  const removeView = useDiagramStore((s) => s.removeView)
  const setDefaultView = useDiagramStore((s) => s.setDefaultView)
  const saveViewRequested = useUiStore((s) => s.saveViewRequested)
  const clearSaveViewRequest = useUiStore((s) => s.clearSaveViewRequest)
  const [saveOpen, setSaveOpen] = useState(false)

  // The command palette ("Save view as…") can request this dialog from afar.
  useEffect(() => {
    if (saveViewRequested) {
      setSaveOpen(true)
      clearSaveViewRequest()
    }
  }, [saveViewRequested, clearSaveViewRequest])

  const activeView = views.find((v) => v.id === activeViewId) ?? null
  const triggerLabel = activeView?.name ?? 'All layers'

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[8rem] justify-between">
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1.5">
          <button
            type="button"
            onClick={() => setActiveView(null)}
            className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-sm text-ink transition-colors duration-[120ms] ease-out hover:bg-surface-2"
          >
            <span className="flex-1 text-left">All layers</span>
            {activeViewId === null && <Check className="h-3.5 w-3.5 text-accent" />}
          </button>

          {views.length > 0 && <div className="my-1 h-px bg-border" />}

          {views.map((view) => (
            <div
              key={view.id}
              className="group/view flex items-center gap-1 rounded-[6px] pr-1 hover:bg-surface-2"
            >
              <button
                type="button"
                onClick={() => setActiveView(view.id)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-[6px] px-2 py-1.5 text-sm text-ink"
              >
                <span className="flex-1 truncate text-left">{view.name}</span>
                {activeViewId === view.id && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
              </button>
              <button
                type="button"
                onClick={() => setDefaultView(view.id)}
                aria-label="Set as default view"
                title="Load this view on open"
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-[5px] transition-colors duration-[120ms] ease-out hover:bg-surface',
                  view.isDefault ? 'text-accent' : 'text-ink-subtle',
                )}
              >
                <Star className={cn('h-3.5 w-3.5', view.isDefault && 'fill-current')} />
              </button>
              <button
                type="button"
                onClick={() => removeView(view.id)}
                aria-label="Delete view"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-[5px] text-ink-subtle transition-colors duration-[120ms] ease-out hover:bg-surface hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-sm text-accent transition-colors duration-[120ms] ease-out hover:bg-accent-soft"
          >
            <Plus className="h-3.5 w-3.5" />
            Save current view…
          </button>
        </PopoverContent>
      </Popover>

      <SaveViewDialog open={saveOpen} onOpenChange={setSaveOpen} />
    </>
  )
}

function SaveViewDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const layers = useDiagramStore((s) => s.layers)
  const addView = useDiagramStore((s) => s.addView)

  const allLayerIds = useMemo(() => layers.map((l) => l.id), [layers])
  const allFlowTypes = useMemo(() => FLOW_TYPES.map((f) => f.type), [])
  const allNodeTypes = useMemo(() => ALL_NODE_TYPES.map(([t]) => t), [])

  const [name, setName] = useState('')
  const [layerIds, setLayerIds] = useState<Set<string>>(new Set())
  const [flowTypes, setFlowTypes] = useState<Set<FlowType>>(new Set())
  const [nodeTypes, setNodeTypes] = useState<Set<NodeType>>(new Set())
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [isDefault, setIsDefault] = useState(false)

  // Reset selections to "everything visible" whenever the dialog opens.
  // Driven by `open` (not Radix's onOpenChange) since the dialog is opened via controlled state.
  useEffect(() => {
    if (open) {
      setName('')
      setLayerIds(new Set(allLayerIds))
      setFlowTypes(new Set(allFlowTypes))
      setNodeTypes(new Set(allNodeTypes))
      setGroupByCategory(false)
      setIsDefault(false)
    }
  }, [open, allLayerIds, allFlowTypes, allNodeTypes])

  function toggle<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const filter: ViewFilter = {
      layerIds: [...layerIds],
      flowTypes: [...flowTypes],
      nodeTypes: [...nodeTypes],
      ...(groupByCategory ? { groupBy: 'category' as const } : {}),
    }
    addView({ name: trimmed, filter, isDefault })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save view</DialogTitle>
          <DialogDescription>
            A view is a saved filter preset. Switching views never changes the diagram.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="view-name">Name</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Money flow"
              autoFocus
            />
          </div>

          <CheckGroup label="Layers">
            {layers.map((l) => (
              <CheckRow
                key={l.id}
                checked={layerIds.has(l.id)}
                onChange={() => toggle(layerIds, l.id, setLayerIds)}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                {l.name}
              </CheckRow>
            ))}
          </CheckGroup>

          <CheckGroup label="Flow types">
            {FLOW_TYPES.map((f) => (
              <CheckRow
                key={f.type}
                checked={flowTypes.has(f.type)}
                onChange={() => toggle(flowTypes, f.type, setFlowTypes)}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                {f.label}
              </CheckRow>
            ))}
          </CheckGroup>

          <CheckGroup label="Node types">
            {ALL_NODE_TYPES.map(([type, label]) => (
              <CheckRow
                key={type}
                checked={nodeTypes.has(type)}
                onChange={() => toggle(nodeTypes, type, setNodeTypes)}
              >
                {label}
              </CheckRow>
            ))}
          </CheckGroup>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={groupByCategory}
              onChange={(e) => setGroupByCategory(e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            Group nodes by category
          </label>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            Load this view on open (default)
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Save view
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CheckGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">{children}</div>
    </div>
  )
}

function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 accent-accent"
      />
      <span className="flex items-center gap-1.5">{children}</span>
    </label>
  )
}
