import { apiFetch } from '@/lib/api'
import type { PortfolioResponse } from '@system-map/shared'
import { useQuery } from '@tanstack/react-query'

const DEMO = import.meta.env.VITE_DEMO === '1'

/** Application portfolio, grouped by company (GET /api/portfolio). Empty in the
 *  backend-less demo. */
export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: () =>
      DEMO ? Promise.resolve({ companies: [] }) : apiFetch<PortfolioResponse>('/api/portfolio'),
  })
}
