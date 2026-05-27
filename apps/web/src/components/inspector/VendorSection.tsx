import type { SMNode } from '@/lib/flow'
import { cn } from '@/lib/utils'
import { MATURITY_META, lookupVendor, vendorLogoSrc } from '@/lib/vendorApi'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import { ExternalLink, RefreshCw } from 'lucide-react'

/** Read-rich vendor panel for App nodes (spec v1.2 §4.3/§4.4). Only shown once
 *  a vendor has been picked (node.data.vendor present). */
export function VendorSection({ node }: { node: SMNode }) {
  const vendor = node.data.vendor
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const setVendorLoading = useUiStore((s) => s.setVendorLoading)
  const loading = useUiStore((s) => s.vendorLoadingIds.includes(node.id))
  if (!vendor) return null

  const logo = vendorLogoSrc(vendor.logoUrl)
  const maturity = vendor.maturity ? MATURITY_META[vendor.maturity] : null
  const vendorName = vendor.name

  async function refetch() {
    setVendorLoading(node.id, true)
    const full = await lookupVendor(vendorName, true)
    if (full) {
      updateNodeData(node.id, {
        label: full.name,
        category: full.category ?? undefined,
        vendor: full,
      })
    }
    setVendorLoading(node.id, false)
  }

  return (
    <div className="border-t border-border pt-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        Vendor
      </span>

      <div className="mt-3 flex items-start gap-3">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-12 w-12 shrink-0 rounded-[8px] border border-border object-contain p-1"
          />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] border border-border bg-surface-2 text-base font-semibold text-ink-muted">
            {vendor.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-ink">{vendor.name}</span>
          {vendor.category && (
            <span className="w-fit rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-muted">
              {vendor.category}
            </span>
          )}
          {maturity && (
            <span className="flex items-center gap-1.5 text-[12px] text-ink-muted">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: maturity.color }}
              />
              {maturity.label}
            </span>
          )}
        </div>
      </div>

      {vendor.description && (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{vendor.description}</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        {vendor.wikipediaUrl && (
          <a
            href={vendor.wikipediaUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[12px] text-accent hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View on Wikipedia
          </a>
        )}
        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="ml-auto flex items-center gap-1 text-[12px] text-ink-muted transition-colors duration-[120ms] hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Re-fetch
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-ink-subtle">
        Source: logo.dev · Wikipedia · demo data — in production this would pull from Magellan.
      </p>
    </div>
  )
}
