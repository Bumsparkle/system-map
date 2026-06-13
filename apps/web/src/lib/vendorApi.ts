import { apiFetch } from '@/lib/api'
import { API_URL } from '@/lib/apiBase'
import type { VendorLookup, VendorMaturity, VendorSuggestion } from '@system-map/shared'

/** Maturity tier → dot color + label (spec v1.2 §4.2). */
export const MATURITY_META: Record<VendorMaturity, { label: string; color: string }> = {
  established: { label: 'Established', color: 'var(--color-ink-muted)' },
  growth: { label: 'Growth', color: 'var(--color-accent)' },
  emerging: { label: 'Emerging', color: '#7B6BC4' },
}

const DEMO = import.meta.env.VITE_DEMO === '1'

/** Typeahead suggestions. Degrades to [] in demo mode or on any error. */
export async function searchVendors(q: string): Promise<VendorSuggestion[]> {
  if (DEMO || !q.trim()) return []
  try {
    return await apiFetch<VendorSuggestion[]>(`/api/vendors/search?q=${encodeURIComponent(q)}`)
  } catch {
    return []
  }
}

/** Full enriched lookup. `fresh` bypasses the cache (re-fetch). Degrades to null. */
export async function lookupVendor(q: string, fresh = false): Promise<VendorLookup | null> {
  if (DEMO || !q.trim()) return null
  try {
    const suffix = fresh ? '&fresh=1' : ''
    return await apiFetch<VendorLookup>(`/api/vendors/lookup?q=${encodeURIComponent(q)}${suffix}`)
  } catch {
    return null
  }
}

/** Resolve a logo URL. Absolute URLs pass through. Server-relative /uploads/…
 *  paths come from the API locally, but are bundled under the site base in the
 *  static demo build (no backend there). */
export function vendorLogoSrc(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null
  if (!logoUrl.startsWith('/')) return logoUrl
  return DEMO ? `${import.meta.env.BASE_URL}${logoUrl.replace(/^\//, '')}` : `${API_URL}${logoUrl}`
}
