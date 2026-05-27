import { VendorSearchInput } from '@/components/vendor/VendorSearchInput'
import { resolveNodeIcon } from '@/lib/appearance'
import type { SMNode } from '@/lib/flow'
import { MATURITY_META, vendorLogoSrc } from '@/lib/vendorApi'
import { useUiStore } from '@/stores/uiStore'
import type { NodeProps } from '@xyflow/react'
import type { ReactNode } from 'react'
import { BaseNode } from './BaseNode'

export function AppNode({ id, data, selected }: NodeProps<SMNode>) {
  const loading = useUiStore((s) => s.vendorLoadingIds.includes(id))
  const vendor = data.vendor

  const shell = (children: ReactNode) => (
    <BaseNode
      id={id}
      layerId={data.layerId}
      selected={selected}
      accentColor={data.appearance?.accentColor}
      size={data.appearance?.size}
    >
      {children}
    </BaseNode>
  )

  // State 1 — empty: a freshly-dropped App node opens into vendor search.
  if (data.awaitingVendor && !vendor) return shell(<VendorSearchInput nodeId={id} />)

  // States 2 & 3 — loading / loaded (or a plain App node with no vendor).
  const initial = data.label.trim().charAt(0).toUpperCase() || 'A'
  const custom = resolveNodeIcon(data)
  const logo = vendorLogoSrc(vendor?.logoUrl)
  const maturity = vendor?.maturity ? MATURITY_META[vendor.maturity] : null
  const category = vendor?.category ?? data.category

  return shell(
    <>
      {maturity && (
        <span
          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: maturity.color }}
          title={maturity.label}
        />
      )}
      <div className="flex items-center gap-2.5">
        {loading ? (
          <div className="sm-shimmer h-7 w-7 shrink-0 rounded-[6px]" />
        ) : logo ? (
          <img src={logo} alt="" className="h-7 w-7 shrink-0 rounded-[6px] object-contain" />
        ) : (
          (custom ??
          (data.iconUrl ? (
            <img src={data.iconUrl} alt="" className="h-7 w-7 rounded-[6px] object-cover" />
          ) : (
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-surface-2 text-xs font-semibold text-ink-muted">
              {initial}
            </div>
          )))
        )}
        <div className="flex min-w-0 flex-col">
          <span className="text-[1em] font-medium leading-tight text-ink">{data.label}</span>
          {loading ? (
            <div className="sm-shimmer mt-1 h-2 w-16 rounded-full" />
          ) : category ? (
            <span className="text-[11px] leading-tight text-ink-subtle">{category}</span>
          ) : null}
        </div>
      </div>
    </>,
  )
}
