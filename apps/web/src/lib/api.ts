import type {
  Company,
  CreateCompanyInput,
  CreateDiagramInput,
  Diagram,
  DiagramDetail,
} from '@system-map/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

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
    headers: { 'Content-Type': 'application/json', ...init?.headers },
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
  listCompanies: () => apiFetch<Company[]>('/api/companies'),
  createCompany: (input: CreateCompanyInput) =>
    apiFetch<Company>('/api/companies', { method: 'POST', body: JSON.stringify(input) }),
  listDiagrams: (companyId: string) => apiFetch<Diagram[]>(`/api/companies/${companyId}/diagrams`),
  createDiagram: (companyId: string, input: CreateDiagramInput) =>
    apiFetch<Diagram>(`/api/companies/${companyId}/diagrams`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getDiagram: (id: string) => apiFetch<DiagramDetail>(`/api/diagrams/${id}`),
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
