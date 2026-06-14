import { apiFetch } from '@/lib/api'
import type { AiSuggestResponse } from '@system-map/shared'
import { useMutation } from '@tanstack/react-query'

/** On-demand AI suggestions for a diagram (POST /api/diagrams/:id/suggest). */
export function useSuggestions(diagramId: string) {
  return useMutation<AiSuggestResponse, Error, void>({
    mutationFn: () =>
      apiFetch<AiSuggestResponse>(`/api/diagrams/${diagramId}/suggest`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  })
}
