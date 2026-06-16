import { usePortfolio } from '@/lib/portfolioApi'
import { vendorLogoSrc } from '@/lib/vendorApi'
import type { PortfolioCompany, PortfolioEntry } from '@system-map/shared'
import { ArrowLeft, Boxes } from 'lucide-react'
import { Link } from 'react-router-dom'

const CURRENCY_SYMBOL: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' }

const MATURITY: Record<string, { label: string; color: string }> = {
  established: { label: 'Established', color: 'var(--color-ink-muted)' },
  growth: { label: 'Growth', color: 'var(--color-accent)' },
  emerging: { label: 'Emerging', color: '#7B6BC4' },
}

const LIFECYCLE: Record<string, { label: string; className: string }> = {
  existing: { label: 'Existing', className: 'bg-surface-2 text-ink-muted' },
  new: { label: 'New', className: 'bg-emerald-50 text-emerald-700' },
  retiring: { label: 'Retiring', className: 'bg-rose-50 text-rose-700' },
  replacing: { label: 'Replacing', className: 'bg-amber-50 text-amber-700' },
  modifying: { label: 'Modifying', className: 'bg-indigo-50 text-indigo-700' },
}

function formatCost(minor: number | null, currency: string | null): string {
  if (minor == null) return '—'
  const symbol = CURRENCY_SYMBOL[currency ?? 'GBP'] ?? ''
  return `${symbol}${Math.round(minor / 100).toLocaleString()}/mo`
}

/** Spend grouped by currency — minor units aren't comparable across them. */
function totalLabelFor(entries: PortfolioEntry[]): string {
  const totals = new Map<string, number>()
  for (const e of entries) {
    if (e.monthlyCostMinor != null && e.currency) {
      totals.set(e.currency, (totals.get(e.currency) ?? 0) + e.monthlyCostMinor)
    }
  }
  return [...totals].map(([currency, sum]) => formatCost(sum, currency)).join(' · ')
}

export function PortfolioPage() {
  const portfolio = usePortfolio()
  const companies = portfolio.data?.companies ?? []
  const appCount = companies.reduce((n, c) => n + c.entries.length, 0)

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-surface px-6">
        <Link
          to="/"
          aria-label="Back to dashboard"
          className="grid h-8 w-8 place-items-center rounded-[6px] text-ink-muted hover:bg-surface-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Boxes className="h-5 w-5 text-accent" />
        <span className="font-semibold tracking-tight">Application portfolio</span>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        {portfolio.isLoading && <p className="text-sm text-ink-subtle">Loading…</p>}

        {portfolio.isError && (
          <div className="rounded-[10px] border border-border bg-surface p-6 text-sm text-ink-muted">
            Couldn't load the portfolio. {(portfolio.error as Error).message}
          </div>
        )}

        {portfolio.data && companies.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <p className="text-sm text-ink-muted">No applications yet.</p>
            <p className="max-w-sm text-sm text-ink-subtle">
              Add app and system nodes to your diagrams — they'll roll up here by company with
              spend, maturity, and how many maps each one appears in.
            </p>
          </div>
        )}

        {portfolio.data && companies.length > 0 && (
          <>
            <div className="mb-6 text-sm text-ink-muted">
              <span className="font-semibold text-ink">{appCount}</span>{' '}
              {appCount === 1 ? 'application' : 'applications'} across{' '}
              <span className="font-semibold text-ink">{companies.length}</span>{' '}
              {companies.length === 1 ? 'company' : 'companies'}
            </div>

            <div className="flex flex-col gap-8">
              {companies.map((company) => (
                <CompanySection key={company.companyId} company={company} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function CompanySection({ company }: { company: PortfolioCompany }) {
  const totalLabel = totalLabelFor(company.entries)
  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-semibold text-ink tracking-tight">
          {company.companyName || 'Untitled'}
        </h2>
        <span className="text-xs text-ink-subtle">
          <span className="text-ink-muted">{company.entries.length}</span>{' '}
          {company.entries.length === 1 ? 'app' : 'apps'}
          {totalLabel && (
            <>
              {' · '}
              <span className="text-ink-muted">{totalLabel}</span>
            </>
          )}
        </span>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-ink-subtle">
              <th className="px-4 py-2.5 font-medium">Application</th>
              <th className="px-4 py-2.5 font-medium">In maps</th>
              <th className="px-4 py-2.5 font-medium">Integrations</th>
              <th className="px-4 py-2.5 font-medium">Monthly</th>
              <th className="px-4 py-2.5 font-medium">Maturity</th>
              <th className="px-4 py-2.5 font-medium">Lifecycle</th>
            </tr>
          </thead>
          <tbody>
            {company.entries.map((e) => (
              <PortfolioRow key={e.key} entry={e} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PortfolioRow({ entry }: { entry: PortfolioEntry }) {
  const logo = vendorLogoSrc(entry.logoUrl)
  const maturity = entry.maturity ? MATURITY[entry.maturity] : null
  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-2/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          {logo ? (
            <img src={logo} alt="" className="h-6 w-6 rounded-[5px] object-contain" />
          ) : (
            <div className="grid h-6 w-6 place-items-center rounded-[5px] bg-surface-2 text-[10px] font-medium text-ink-subtle">
              {entry.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">{entry.name}</div>
            {entry.category && (
              <div className="truncate text-xs text-ink-subtle">{entry.category}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-ink-muted">{entry.diagramCount}</td>
      <td className="px-4 py-3 text-ink-muted">{entry.integrations}</td>
      <td className="px-4 py-3 text-ink">{formatCost(entry.monthlyCostMinor, entry.currency)}</td>
      <td className="px-4 py-3">
        {maturity ? (
          <span className="flex items-center gap-1.5 text-ink-muted">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: maturity.color }}
            />
            {maturity.label}
          </span>
        ) : (
          <span className="text-ink-subtle">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {entry.lifecycles.length === 0 ? (
            <span className="text-ink-subtle">—</span>
          ) : (
            entry.lifecycles.map((l) => {
              const meta = LIFECYCLE[l]
              return (
                <span
                  key={l}
                  className={`rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium ${meta?.className ?? ''}`}
                >
                  {meta?.label ?? l}
                </span>
              )
            })
          )}
        </div>
      </td>
    </tr>
  )
}
