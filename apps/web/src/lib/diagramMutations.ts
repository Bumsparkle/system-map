import { ApiError, qk } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

// Re-derived (not imported) to avoid editing the deploy agent's api.ts.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const DEMO = import.meta.env.VITE_DEMO === '1'

// Bodyless DELETE — deliberately NOT routed through apiFetch, which always sets
// Content-Type: application/json (Fastify then 400s on the empty body).
async function deleteDiagram(id: string): Promise<void> {
  if (DEMO) throw new ApiError(503, 'This is a read-only demo — changes are not saved.')
  const res = await fetch(`${API_URL}/api/diagrams/${id}`, { method: 'DELETE' })
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
