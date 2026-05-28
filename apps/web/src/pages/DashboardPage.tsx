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
import { Textarea } from '@/components/ui/textarea'
import { useCompanies, useCreateCompany, useCreateDiagram, useDiagrams } from '@/lib/api'
import { useDeleteDiagram } from '@/lib/diagramMutations'
import { formatRelativeDate } from '@/lib/utils'
import type { Company, Diagram } from '@system-map/shared'
import { Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function DashboardPage() {
  const companies = useCompanies()
  const [newCompanyOpen, setNewCompanyOpen] = useState(false)

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface px-6">
        <div className="flex items-center gap-2.5">
          <div className="h-5 w-5 rounded-[5px] bg-accent" />
          <span className="font-semibold tracking-tight">System Map</span>
        </div>
        <Button size="sm" onClick={() => setNewCompanyOpen(true)}>
          <Plus className="h-4 w-4" />
          New company
        </Button>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        {companies.isLoading && <p className="text-sm text-ink-subtle">Loading…</p>}

        {companies.isError && (
          <div className="rounded-[10px] border border-border bg-surface p-6 text-sm text-ink-muted">
            Couldn't reach the API. Make sure the server is running on{' '}
            <code className="font-mono text-ink">localhost:3001</code>.
          </div>
        )}

        {companies.data && companies.data.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p className="text-sm text-ink-muted">No companies yet.</p>
            <p className="max-w-sm text-sm text-ink-subtle">
              A company is a workspace that holds your system maps. Create one to start diagramming.
            </p>
            <Button onClick={() => setNewCompanyOpen(true)}>
              <Plus className="h-4 w-4" />
              New company
            </Button>
          </div>
        )}

        {companies.data && companies.data.length > 0 && (
          <div className="flex flex-col gap-12">
            {companies.data.map((company) => (
              <CompanySection key={company.id} company={company} />
            ))}
          </div>
        )}
      </main>

      <NewCompanyDialog open={newCompanyOpen} onOpenChange={setNewCompanyOpen} />
    </div>
  )
}

function CompanySection({ company }: { company: Company }) {
  const diagrams = useDiagrams(company.id)
  const [newDiagramOpen, setNewDiagramOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Diagram | null>(null)
  const navigate = useNavigate()

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-lg font-semibold tracking-tight">{company.name}</h2>
          {diagrams.data && (
            <span className="text-xs text-ink-subtle">
              {diagrams.data.length} {diagrams.data.length === 1 ? 'diagram' : 'diagrams'}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setNewDiagramOpen(true)}>
          <Plus className="h-4 w-4" />
          New diagram
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {diagrams.data?.map((diagram) => (
          <div key={diagram.id} className="group relative">
            <button
              type="button"
              onClick={() => navigate(`/diagrams/${diagram.id}`)}
              className="flex w-full flex-col gap-2 rounded-[10px] border border-border bg-surface p-4 text-left transition-[border-color,box-shadow] duration-[120ms] ease-out hover:border-border-strong hover:shadow-node focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <span className="pr-7 font-medium text-ink">{diagram.name}</span>
              <span className="line-clamp-2 min-h-[2.5rem] text-sm text-ink-muted">
                {diagram.description || 'No description'}
              </span>
              <span className="mt-1 text-xs text-ink-subtle">
                Updated {formatRelativeDate(diagram.updatedAt)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(diagram)}
              aria-label={`Delete ${diagram.name}`}
              title="Delete diagram"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-[6px] text-ink-subtle opacity-0 transition-[opacity,color,background-color] duration-[120ms] ease-out hover:bg-surface-2 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setNewDiagramOpen(true)}
          className="flex min-h-[7.5rem] flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-border-strong bg-transparent text-sm text-ink-subtle transition-colors duration-[120ms] ease-out hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <Plus className="h-5 w-5" />
          New diagram
        </button>
      </div>

      <NewDiagramDialog
        companyId={company.id}
        open={newDiagramOpen}
        onOpenChange={setNewDiagramOpen}
        onCreated={(id) => navigate(`/diagrams/${id}`)}
      />

      <DeleteDiagramDialog
        companyId={company.id}
        diagram={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </section>
  )
}

function DeleteDiagramDialog({
  companyId,
  diagram,
  onOpenChange,
}: {
  companyId: string
  diagram: Diagram | null
  onOpenChange: (open: boolean) => void
}) {
  const deleteDiagram = useDeleteDiagram(companyId)

  return (
    <Dialog open={!!diagram} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete diagram?</DialogTitle>
          <DialogDescription>
            “{diagram?.name}” and all of its nodes, edges, layers, and views will be permanently
            deleted. This can’t be undone.
          </DialogDescription>
        </DialogHeader>
        {deleteDiagram.isError && (
          <p className="text-sm text-red-600">Could not delete the diagram. Try again.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteDiagram.isPending}
            onClick={() => {
              if (!diagram) return
              deleteDiagram.mutate(diagram.id, { onSuccess: () => onOpenChange(false) })
            }}
          >
            {deleteDiagram.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NewCompanyDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const createCompany = useCreateCompany()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    createCompany.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName('')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setName('')
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New company</DialogTitle>
          <DialogDescription>A workspace to hold your system maps.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-name">Name</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Textbook Ltd"
              autoFocus
            />
          </div>
          {createCompany.isError && (
            <p className="text-sm text-red-600">Could not create company. Try again.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createCompany.isPending}>
              {createCompany.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewDiagramDialog({
  companyId,
  open,
  onOpenChange,
  onCreated,
}: {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const createDiagram = useCreateDiagram(companyId)

  function reset() {
    setName('')
    setDescription('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    createDiagram.mutate(
      { name: trimmed, description: description.trim() || undefined },
      {
        onSuccess: (diagram) => {
          reset()
          onOpenChange(false)
          onCreated(diagram.id)
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New diagram</DialogTitle>
          <DialogDescription>Start with a blank canvas and a "Main" layer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="diagram-name">Name</Label>
            <Input
              id="diagram-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer journey"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="diagram-description">Description</Label>
            <Textarea
              id="diagram-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — what does this map cover?"
            />
          </div>
          {createDiagram.isError && (
            <p className="text-sm text-red-600">Could not create diagram. Try again.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createDiagram.isPending}>
              {createDiagram.isPending ? 'Creating…' : 'Create diagram'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
