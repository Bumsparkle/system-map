import type { Currency, NodeCost } from '@system-map/shared'

const SYMBOL: Record<Currency, string> = { GBP: '£', USD: '$', EUR: '€' }
const LOCALE: Record<Currency, string> = { GBP: 'en-GB', USD: 'en-US', EUR: 'en-IE' }

export function currencySymbol(currency: Currency): string {
  return SYMBOL[currency]
}

/** Format a minor-unit (pence/cents) amount as currency, e.g. 1_420_000 GBP → "£14,200". */
export function formatAmount(minor: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALE[currency], {
    style: 'currency',
    currency,
    // Whole pounds when round, else 2dp — keeps demo numbers clean.
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100)
}

/** Compact node-face cost (spec v1.3 §5.2): "£500/mo", "~£500/mo" (estimated), "£?/mo" (unknown). */
export function formatCostCompact(cost: NodeCost): string {
  if (cost.confidence === 'unknown') return `${SYMBOL[cost.currency]}?/mo`
  const prefix = cost.confidence === 'estimated' ? '~' : ''
  return `${prefix}${formatAmount(cost.monthlyAmount, cost.currency)}/mo`
}
