import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SMNode } from '@/lib/flow'
import { NODE_TYPE_LABEL } from '@/lib/nodeRegistry'
import { useDiagramStore } from '@/stores/diagramStore'
import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { NodeAppearance } from './NodeAppearance'

function Field({
  label,
  htmlFor,
  children,
}: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export function NodeInspector({ node }: { node: SMNode }) {
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const removeNode = useDiagramStore((s) => s.removeNode)
  const setNodeLayer = useDiagramStore((s) => s.setNodeLayer)
  const layers = useDiagramStore((s) => s.layers)
  const { data } = node
  const layerColor = layers.find((l) => l.id === data.layerId)?.color

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          {NODE_TYPE_LABEL[node.type ?? 'custom']}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => removeNode(node.id)}
          aria-label="Delete node"
        >
          <Trash2 className="h-4 w-4 text-ink-muted" />
        </Button>
      </div>

      <Field label="Label" htmlFor="node-label">
        <Input
          id="node-label"
          value={data.label}
          onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
        />
      </Field>

      <Field label="Category" htmlFor="node-category">
        <Input
          id="node-category"
          value={data.category ?? ''}
          placeholder="e.g. finance, crm"
          onChange={(e) => updateNodeData(node.id, { category: e.target.value || undefined })}
        />
      </Field>

      <Field label="Layer" htmlFor="node-layer">
        <div className="relative flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: layerColor ?? 'transparent' }}
          />
          <select
            id="node-layer"
            value={data.layerId}
            onChange={(e) => setNodeLayer(node.id, e.target.value)}
            className="h-9 w-full rounded-[6px] border border-border bg-surface px-2 text-sm text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <Field label="Description" htmlFor="node-description">
        <Textarea
          id="node-description"
          value={data.description ?? ''}
          placeholder="What is this node for?"
          onChange={(e) => updateNodeData(node.id, { description: e.target.value || undefined })}
        />
      </Field>

      <NodeAppearance node={node} />
    </div>
  )
}
