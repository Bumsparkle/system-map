import { ApiError, api, apiFetch, qk } from '@/lib/api'
import { API_URL } from '@/lib/apiBase'
import { saveDiagram } from '@/lib/autoSave'
import { parseImport } from '@/lib/importDiagram'
import { authHeaders } from '@/lib/supabaseClient'
import type { Diagram } from '@system-map/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const DEMO = import.meta.env.VITE_DEMO === '1'

// Bodyless DELETE — deliberately NOT routed through apiFetch, which always sets
// Content-Type: application/json (Fastify then 400s on the empty body). Still
// needs the bearer header so the API doesn't reject it as unauthenticated.
async function deleteDiagram(id: string): Promise<void> {
  if (DEMO) throw new ApiError(503, 'This is a read-only demo — changes are not saved.')
  const res = await fetch(`${API_URL}/api/diagrams/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new ApiError(res.status, 'Failed to delete diagram')
}

/** Delete a diagram (cascades to its layers/nodes/edges/views) and refresh the
 *  company's list. Kept out of the deploy agent's api.ts. */
export function useDeleteDiagram(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteDiagram,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.diagrams(companyId) }),
  })
}

/** Deep-copy a diagram into a company (defaults to its own). Refreshes the
 *  target company's list so the copy shows up immediately. */
export function useDuplicateDiagram() {
  const qc = useQueryClient()
  return useMutation<Diagram, Error, { id: string; companyId?: string }>({
    mutationFn: ({ id, companyId }) => {
      if (DEMO) throw new ApiError(503, 'This is a read-only demo — changes are not saved.')
      return apiFetch<Diagram>(`/api/diagrams/${id}/duplicate`, {
        method: 'POST',
        body: JSON.stringify(companyId ? { companyId } : {}),
      })
    },
    onSuccess: (created) => qc.invalidateQueries({ queryKey: qk.diagrams(created.companyId) }),
  })
}

/** Move a diagram to another company. Refreshes both the source and target lists. */
export function useMoveDiagram() {
  const qc = useQueryClient()
  return useMutation<Diagram, Error, { id: string; fromCompanyId: string; toCompanyId: string }>({
    mutationFn: ({ id, toCompanyId }) => {
      if (DEMO) throw new ApiError(503, 'This is a read-only demo — changes are not saved.')
      return apiFetch<Diagram>(`/api/diagrams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ companyId: toCompanyId }),
      })
    },
    onSuccess: (_diagram, { fromCompanyId, toCompanyId }) => {
      qc.invalidateQueries({ queryKey: qk.diagrams(fromCompanyId) })
      qc.invalidateQueries({ queryKey: qk.diagrams(toCompanyId) })
    },
  })
}

export type ImportResult = {
  id: string
  name: string
  format: 'export' | 'simple'
  warnings: string[]
}

/** Create a diagram from JSON text (pasted or read from a file; app export or
 *  simple format): parse + validate, create the diagram, persist it, refresh. */
export function useImportDiagram(companyId: string) {
  const qc = useQueryClient()
  return useMutation<ImportResult, Error, string>({
    mutationFn: async (text) => {
      if (DEMO) throw new ApiError(503, 'This is a read-only demo — changes are not saved.')
      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch {
        throw new Error("That isn't valid JSON.")
      }
      const parsed = parseImport(raw)
      const diagram = await api.createDiagram(companyId, {
        name: parsed.name,
        description: parsed.description ?? undefined,
      })
      await saveDiagram(diagram.id, parsed.payload)
      return { id: diagram.id, name: parsed.name, format: parsed.format, warnings: parsed.warnings }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.diagrams(companyId) }),
  })
}
