import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatAmount, layerCostMinor } from '@/lib/cost'
import { cn } from '@/lib/utils'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import { ChevronDown, ChevronUp, Eye, EyeOff, Layers, Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

export function LayerPanel() {
  const layersRaw = useDiagramStore((s) => s.layers)
  const nodes = useDiagramStore((s) => s.nodes)
  const diagramState = useUiStore((s) => s.diagramState)
  const currency = nodes.find((n) => n.data.cost)?.data.cost?.currency ?? 'GBP'
  const activeLayerId = useDiagramStore((s) => s.activeLayerId)
  const addLayer = useDiagramStore((s) => s.addLayer)
  const updateLayer = useDiagramStore((s) => s.updateLayer)
  const toggleLayerVisible = useDiagramStore((s) => s.toggleLayerVisible)
  const moveLayer = useDiagramStore((s) => s.moveLayer)
  const removeLayer = useDiagramStore((s) => s.removeLayer)
  const setActiveLayer = useDiagramStore((s) => s.setActiveLayer)

  const layers = useMemo(() => [...layersRaw].sort((a, b) => a.order - b.order), [layersRaw])
  const hiddenCount = layers.filter((l) => !l.visible).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Layers className="h-4 w-4" />
          Layers
          {hiddenCount > 0 && (
            <span className="ml-0.5 rounded-full bg-surface-2 px-1.5 text-[11px] text-ink-muted">
              {hiddenCount} hidden
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="mb-1 flex items-center justify-between px-1.5 py-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
            Layers
          </span>
          <button
            type="button"
            onClick={addLayer}
            className="flex items-center gap-1 rounded-[5px] px-1.5 py-1 text-[13px] text-accent transition-colors duration-[120ms] ease-out hover:bg-accent-soft"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {layers.map((layer, i) => (
            <div
              key={layer.id}
              className={cn(
                'group/row flex items-center gap-1.5 rounded-[6px] px-1.5 py-1',
                activeLayerId === layer.id ? 'bg-surface-2' : 'hover:bg-surface-2/60',
              )}
            >
              <button
                type="button"
                onClick={() => setActiveLayer(layer.id)}
                title="Set as active layer (new nodes go here)"
                className={cn(
                  'h-4 w-4 shrink-0 rounded-full',
                  activeLayerId === layer.id &&
                    'ring-2 ring-accent ring-offset-1 ring-offset-surface',
                )}
                style={{ backgroundColor: layer.color }}
              />
              <input
                value={layer.name}
                onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-sm text-ink focus:outline-none"
              />
              {(() => {
                const minor = layerCostMinor(nodes, layer.id, diagramState)
                return minor > 0 ? (
                  <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                    {formatAmount(minor, currency)}/mo
                  </span>
                ) : null
              })()}
              <button
                type="button"
                onClick={() => toggleLayerVisible(layer.id)}
                aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[5px] text-ink-muted transition-colors duration-[120ms] ease-out hover:bg-surface hover:text-ink"
              >
                {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => moveLayer(layer.id, 'up')}
                  disabled={i === 0}
                  aria-label="Move layer up"
                  className="grid h-3.5 w-6 place-items-center rounded-[4px] text-ink-subtle transition-colors duration-[120ms] ease-out hover:text-ink disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveLayer(layer.id, 'down')}
                  disabled={i === layers.length - 1}
                  aria-label="Move layer down"
                  className="grid h-3.5 w-6 place-items-center rounded-[4px] text-ink-subtle transition-colors duration-[120ms] ease-out hover:text-ink disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeLayer(layer.id)}
                disabled={layers.length <= 1}
                aria-label="Delete layer"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[5px] text-ink-muted transition-colors duration-[120ms] ease-out hover:bg-surface hover:text-red-600 disabled:pointer-events-none disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <p className="mt-2 px-1.5 text-[11px] leading-snug text-ink-subtle">
          Hidden layers hide their nodes and connected edges. New nodes are added to the active
          layer (ringed).
        </p>
      </PopoverContent>
    </Popover>
  )
}
