import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { serializeDiagram } from '@/lib/autoSave'
import { type DiagramJsonExport, exportJson, exportPng, exportSvg } from '@/lib/export'
import { useDiagramStore } from '@/stores/diagramStore'
import { toast } from '@/stores/toastStore'
import { useReactFlow } from '@xyflow/react'
import { Download, FileImage, FileJson, PenTool } from 'lucide-react'

export function ExportMenu() {
  const rf = useReactFlow()

  async function run(label: string, fn: () => Promise<void> | void) {
    try {
      await fn()
      toast({ message: `Exported ${label}` })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Export failed', variant: 'error' })
    }
  }

  function handlePng() {
    const { name } = useDiagramStore.getState()
    return run('PNG', () => exportPng(rf.getNodes(), name))
  }

  function handleSvg() {
    const { name, layers } = useDiagramStore.getState()
    return run('SVG', () => exportSvg(rf.getNodes(), rf.getEdges(), layers, name))
  }

  function handleJson() {
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
    return run('JSON', () => exportJson(data, s.name))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Export diagram</DropdownMenuLabel>
        <DropdownMenuItem onSelect={handlePng}>
          <FileImage className="h-4 w-4 shrink-0 text-ink-muted" />
          <div className="flex flex-col">
            <span>PNG</span>
            <span className="text-[11px] text-ink-subtle">Raster image</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleSvg}>
          <PenTool className="h-4 w-4 shrink-0 text-ink-muted" />
          <div className="flex flex-col">
            <span>SVG</span>
            <span className="text-[11px] text-ink-subtle">Vector image</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleJson}>
          <FileJson className="h-4 w-4 shrink-0 text-ink-muted" />
          <div className="flex flex-col">
            <span>JSON</span>
            <span className="text-[11px] text-ink-subtle">Backup file</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
