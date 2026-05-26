import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useTidy } from '@/hooks/useTidy'
import { serializeDiagram } from '@/lib/autoSave'
import { type DiagramJsonExport, exportJson, exportPng, exportSvg } from '@/lib/export'
import { NODE_TYPE_LABEL, paletteMetas } from '@/lib/nodeRegistry'
import { useDiagramStore } from '@/stores/diagramStore'
import { toast } from '@/stores/toastStore'
import { useUiStore } from '@/stores/uiStore'
import type { NodeType } from '@system-map/shared'
import { useReactFlow } from '@xyflow/react'
import {
  Eye,
  FileImage,
  FileJson,
  Grid2x2,
  Layers as LayersIcon,
  Map as MapIcon,
  PenTool,
  Plus,
  Save,
  Scan,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

function loadRecents(diagramId: string | null): string[] {
  if (!diagramId) return []
  try {
    const raw = localStorage.getItem(`sysmap:recent:${diagramId}`)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function pushRecent(diagramId: string | null, key: string): string[] {
  if (!diagramId) return []
  const next = [key, ...loadRecents(diagramId).filter((k) => k !== key)].slice(0, 20)
  try {
    localStorage.setItem(`sysmap:recent:${diagramId}`, JSON.stringify(next))
  } catch {
    // ignore storage errors
  }
  return next
}

export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen)
  const setOpen = useUiStore((s) => s.setCommandOpen)
  const requestSaveView = useUiStore((s) => s.requestSaveView)
  const toggleFocus = useUiStore((s) => s.toggleFocusEnabled)
  const toggleGrid = useUiStore((s) => s.toggleDotGrid)
  const toggleMinimap = useUiStore((s) => s.toggleMinimap)

  const diagramId = useDiagramStore((s) => s.diagramId)
  const nodes = useDiagramStore((s) => s.nodes)
  const layersRaw = useDiagramStore((s) => s.layers)
  const views = useDiagramStore((s) => s.views)
  const selectNode = useDiagramStore((s) => s.selectNode)
  const setActiveView = useDiagramStore((s) => s.setActiveView)
  const setActiveLayer = useDiagramStore((s) => s.setActiveLayer)
  const addNode = useDiagramStore((s) => s.addNode)
  const flashNode = useUiStore((s) => s.flashNode)

  const tidy = useTidy()
  const rf = useReactFlow()

  const [recents, setRecents] = useState<string[]>(() => loadRecents(diagramId))
  useEffect(() => setRecents(loadRecents(diagramId)), [diagramId])

  const layers = useMemo(() => [...layersRaw].sort((a, b) => a.order - b.order), [layersRaw])
  const rank = (key: string) => {
    const i = recents.indexOf(key)
    return i === -1 ? Number.POSITIVE_INFINITY : i
  }

  function run(key: string, fn: () => void) {
    setOpen(false)
    fn()
    setRecents(pushRecent(diagramId, key))
  }

  function runExport(label: string, fn: () => Promise<void>) {
    setOpen(false)
    fn()
      .then(() => toast({ message: `Exported ${label}` }))
      .catch(() => toast({ message: 'Export failed', variant: 'error' }))
    setRecents(pushRecent(diagramId, `export-${label}`))
  }

  function centerOnNode(id: string) {
    selectNode(id)
    rf.fitView({ nodes: [{ id }], duration: 400, maxZoom: 1.4, padding: 0.4 })
  }

  function fitLayer(layerId: string) {
    setActiveLayer(layerId)
    const layerNodeIds = nodes.filter((n) => n.data.layerId === layerId).map((n) => ({ id: n.id }))
    if (layerNodeIds.length > 0) rf.fitView({ nodes: layerNodeIds, duration: 400, padding: 0.3 })
  }

  function newNode(type: NodeType) {
    const rect = document.querySelector('.react-flow__pane')?.getBoundingClientRect()
    const center = rect
      ? rf.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 0, y: 0 }
    const id = addNode(type, { x: center.x - 80, y: center.y - 20 })
    flashNode(id)
  }

  const sortByRecent = <T extends { key: string }>(items: T[]): T[] =>
    [...items].sort((a, b) => rank(a.key) - rank(b.key))

  const exportName = useDiagramStore.getState().name

  const actionItems = sortByRecent([
    {
      key: 'tidy',
      label: 'Tidy layout',
      icon: <Sparkles className="h-4 w-4 text-ink-muted" />,
      fn: () => void tidy(),
    },
    {
      key: 'focus',
      label: 'Toggle focus mode',
      icon: <Scan className="h-4 w-4 text-ink-muted" />,
      fn: toggleFocus,
    },
    {
      key: 'grid',
      label: 'Toggle dot grid',
      icon: <Grid2x2 className="h-4 w-4 text-ink-muted" />,
      fn: toggleGrid,
    },
    {
      key: 'minimap',
      label: 'Toggle minimap',
      icon: <MapIcon className="h-4 w-4 text-ink-muted" />,
      fn: toggleMinimap,
    },
    {
      key: 'save-view',
      label: 'Save view as…',
      icon: <Save className="h-4 w-4 text-ink-muted" />,
      fn: requestSaveView,
    },
  ])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search nodes, layers, views, actions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Actions">
          {actionItems.map((a) => (
            <CommandItem key={a.key} value={`action ${a.label}`} onSelect={() => run(a.key, a.fn)}>
              {a.icon}
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="New node">
          {paletteMetas.map((meta) => {
            const Icon = meta.icon
            return (
              <CommandItem
                key={`new-${meta.type}`}
                value={`new-node ${meta.label}`}
                onSelect={() => run(`new-${meta.type}`, () => newNode(meta.type))}
              >
                <Plus className="h-3.5 w-3.5 text-ink-subtle" />
                <Icon className="h-4 w-4 text-ink-muted" />
                New {meta.label}
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandGroup heading="Export">
          <CommandItem
            value="export png raster"
            onSelect={() => runExport('PNG', () => exportPng(rf.getNodes(), exportName))}
          >
            <FileImage className="h-4 w-4 text-ink-muted" />
            Export as PNG
          </CommandItem>
          <CommandItem
            value="export svg vector"
            onSelect={() =>
              runExport('SVG', () => exportSvg(rf.getNodes(), rf.getEdges(), layers, exportName))
            }
          >
            <PenTool className="h-4 w-4 text-ink-muted" />
            Export as SVG
          </CommandItem>
          <CommandItem
            value="export json backup"
            onSelect={() => {
              const s = useDiagramStore.getState()
              const ser = serializeDiagram(s)
              const data: DiagramJsonExport = {
                version: '1.0',
                diagram: {
                  id: s.diagramId ?? '',
                  companyId: s.companyId ?? '',
                  name: s.name,
                  description: s.description,
                },
                layers: ser.layers,
                nodes: ser.nodes,
                edges: ser.edges,
                views: ser.views,
              }
              runExport('JSON', async () => exportJson(data, s.name))
            }}
          >
            <FileJson className="h-4 w-4 text-ink-muted" />
            Export as JSON
          </CommandItem>
        </CommandGroup>

        {nodes.length > 0 && (
          <CommandGroup heading="Nodes">
            {sortByRecent(
              nodes.map((n) => ({
                key: `node-${n.id}`,
                id: n.id,
                label: n.data.label,
                layerId: n.data.layerId,
                type: n.type,
              })),
            ).map((n) => {
              const color = layers.find((l) => l.id === n.layerId)?.color
              return (
                <CommandItem
                  key={n.key}
                  value={n.id}
                  keywords={[n.label, NODE_TYPE_LABEL[n.type ?? 'custom']]}
                  onSelect={() => run(n.key, () => centerOnNode(n.id))}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color ?? 'var(--color-ink-subtle)' }}
                  />
                  <span className="flex-1 truncate">{n.label}</span>
                  <span className="text-[11px] text-ink-subtle">
                    {NODE_TYPE_LABEL[n.type ?? 'custom']}
                  </span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {layers.length > 0 && (
          <CommandGroup heading="Layers">
            {layers.map((l) => (
              <CommandItem
                key={`layer-${l.id}`}
                value={l.id}
                keywords={[l.name]}
                onSelect={() => run(`layer-${l.id}`, () => fitLayer(l.id))}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="flex-1 truncate">{l.name}</span>
                <LayersIcon className="h-3.5 w-3.5 text-ink-subtle" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Views">
          <CommandItem
            value="all layers view"
            onSelect={() => run('view-all', () => setActiveView(null))}
          >
            <Eye className="h-4 w-4 text-ink-muted" />
            All layers
          </CommandItem>
          {views.map((v) => (
            <CommandItem
              key={`view-${v.id}`}
              value={v.id}
              keywords={[v.name]}
              onSelect={() => run(`view-${v.id}`, () => setActiveView(v.id))}
            >
              <Eye className="h-4 w-4 text-ink-muted" />
              {v.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
