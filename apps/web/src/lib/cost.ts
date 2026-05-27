import { nodeInState } from '@/lib/displayGraph'
import type { SMNode } from '@/lib/flow'
import type { DiagramStateView } from '@/stores/uiStore'
import type { Currency, Layer, NodeCost } from '@system-map/shared'

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

export type CostRollup = { totalMinor: number; uncosted: number; currency: Currency }

/** Sum costs for a state view (spec v1.3 §5.3/§5.6): excludes hidden layers,
 *  state-filtered nodes, and unknown-confidence nodes (counted separately). */
export function rollupCost(nodes: SMNode[], layers: Layer[], state: DiagramStateView): CostRollup {
  const hiddenLayers = new Set(layers.filter((l) => !l.visible).map((l) => l.id))
  let totalMinor = 0
  let uncosted = 0
  let currency: Currency = 'GBP'
  for (const n of nodes) {
    if (hiddenLayers.has(n.data.layerId)) continue
    if (!nodeInState(n.data.lifecycle ?? 'existing', state)) continue
    const cost = n.data.cost
    if (!cost) continue
    currency = cost.currency
    if (cost.confidence === 'unknown') uncosted++
    else totalMinor += cost.monthlyAmount
  }
  return { totalMinor, uncosted, currency }
}

/** Per-layer known/estimated cost total for a state view (spec v1.3 §5.4). */
export function layerCostMinor(nodes: SMNode[], layerId: string, state: DiagramStateView): number {
  let total = 0
  for (const n of nodes) {
    if (n.data.layerId !== layerId) continue
    if (!nodeInState(n.data.lifecycle ?? 'existing', state)) continue
    const cost = n.data.cost
    if (cost && cost.confidence !== 'unknown') total += cost.monthlyAmount
  }
  return total
}
