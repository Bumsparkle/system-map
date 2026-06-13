import type {
  Company,
  CreateCompanyInput,
  CreateDiagramInput,
  Diagram,
  DiagramDetail,
} from '@system-map/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_URL } from './apiBase'
import { demoCompanies, demoDiagrams, getDemoDiagram } from './demoData'
import { authHeaders } from './supabaseClient'

// Backend-less builds (GitHub Pages) set VITE_DEMO=1 to serve static fixtures.
const DEMO = import.meta.env.VITE_DEMO === '1'

function demoReject<T>(): Promise<T> {
  return Promise.reject(new ApiError(503, 'This is a read-only demo — changes are not saved.'))
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()), ...init?.headers },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  listCompanies: (): Promise<Company[]> =>
    DEMO ? Promise.resolve(demoCompanies) : apiFetch<Company[]>('/api/companies'),
  createCompany: (input: CreateCompanyInput): Promise<Company> =>
    DEMO
      ? demoReject<Company>()
      : apiFetch<Company>('/api/companies', { method: 'POST', body: JSON.stringify(input) }),
  listDiagrams: (companyId: string): Promise<Diagram[]> =>
    DEMO
      ? Promise.resolve(demoDiagrams)
      : apiFetch<Diagram[]>(`/api/companies/${companyId}/diagrams`),
  createDiagram: (companyId: string, input: CreateDiagramInput): Promise<Diagram> =>
    DEMO
      ? demoReject<Diagram>()
      : apiFetch<Diagram>(`/api/companies/${companyId}/diagrams`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
  getDiagram: (id: string): Promise<DiagramDetail> =>
    DEMO ? Promise.resolve(getDemoDiagram(id)) : apiFetch<DiagramDetail>(`/api/diagrams/${id}`),
}

export const qk = {
  companies: ['companies'] as const,
  diagrams: (companyId: string) => ['companies', companyId, 'diagrams'] as const,
  diagram: (id: string) => ['diagrams', id] as const,
}

export function useCompanies() {
  return useQuery({ queryKey: qk.companies, queryFn: api.listCompanies })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => api.createCompany(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.companies }),
  })
}

export function useDiagrams(companyId: string) {
  return useQuery({
    queryKey: qk.diagrams(companyId),
    queryFn: () => api.listDiagrams(companyId),
  })
}

export function useCreateDiagram(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDiagramInput) => api.createDiagram(companyId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.diagrams(companyId) }),
  })
}

export function useDiagram(id: string) {
  return useQuery({ queryKey: qk.diagram(id), queryFn: () => api.getDiagram(id) })
}
