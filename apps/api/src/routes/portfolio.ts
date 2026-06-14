import type { PortfolioEntry } from '@system-map/shared'
import { eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '../db/client.js'

type Currency = NonNullable<PortfolioEntry['currency']>
type Agg = Omit<
  PortfolioEntry,
  'diagrams' | 'diagramCount' | 'lifecycles' | 'monthlyCostMinor' | 'currency'
> & {
  diagrams: Map<string, string>
  lifecycles: Set<PortfolioEntry['lifecycles'][number]>
  // Cost is summed PER currency — minor units aren't comparable across them.
  costByCurrency: Map<Currency, number>
}

/**
 * Application portfolio: every app/vendor across ALL the caller's diagrams,
 * aggregated — spend, maturity, lifecycle, and how many integrations touch it.
 */
export const portfolioRoutes: FastifyPluginAsync = async (app) => {
  app.get('/portfolio', async (req) => {
    const diagrams = await db
      .select({ id: schema.diagrams.id, name: schema.diagrams.name })
      .from(schema.diagrams)
      .innerJoin(schema.companies, eq(schema.diagrams.companyId, schema.companies.id))
      .where(eq(schema.companies.ownerId, req.user.id))
    if (diagrams.length === 0) return { entries: [] }

    const diagramIds = diagrams.map((d) => d.id)
    const nameById = new Map(diagrams.map((d) => [d.id, d.name]))

    const [nodes, edges] = await Promise.all([
      db.select().from(schema.nodes).where(inArray(schema.nodes.diagramId, diagramIds)),
      db.select().from(schema.edges).where(inArray(schema.edges.diagramId, diagramIds)),
    ])

    // How many edges touch each node (each endpoint counts once).
    const edgesByNode = new Map<string, number>()
    for (const e of edges) {
      edgesByNode.set(e.sourceNodeId, (edgesByNode.get(e.sourceNodeId) ?? 0) + 1)
      edgesByNode.set(e.targetNodeId, (edgesByNode.get(e.targetNodeId) ?? 0) + 1)
    }

    const byKey = new Map<string, Agg>()
    for (const n of nodes) {
      const data = n.data
      const vendor = data.vendor
      const name = (vendor?.name ?? data.label).trim()
      const key = name.toLowerCase()
      if (!key) continue

      let agg = byKey.get(key)
      if (!agg) {
        agg = {
          key,
          name,
          type: n.type,
          logoUrl: vendor?.logoUrl ?? null,
          category: data.category ?? null,
          maturity: vendor?.maturity ?? null,
          integrations: 0,
          diagrams: new Map(),
          lifecycles: new Set(),
          costByCurrency: new Map(),
        }
        byKey.set(key, agg)
      }

      agg.diagrams.set(n.diagramId, nameById.get(n.diagramId) ?? '')
      if (!agg.logoUrl && vendor?.logoUrl) agg.logoUrl = vendor.logoUrl
      if (!agg.maturity && vendor?.maturity) agg.maturity = vendor.maturity
      if (!agg.category && data.category) agg.category = data.category
      if (data.lifecycle) agg.lifecycles.add(data.lifecycle)
      if (data.cost && typeof data.cost.monthlyAmount === 'number') {
        const cur = data.cost.currency
        agg.costByCurrency.set(cur, (agg.costByCurrency.get(cur) ?? 0) + data.cost.monthlyAmount)
      }
      agg.integrations += edgesByNode.get(n.id) ?? 0
    }

    const entries: PortfolioEntry[] = [...byKey.values()]
      .map((a) => {
        // Report cost in the app's dominant currency — never sum across currencies.
        let currency: Currency | null = null
        let monthlyCostMinor: number | null = null
        for (const [cur, sum] of a.costByCurrency) {
          if (monthlyCostMinor === null || sum > monthlyCostMinor) {
            currency = cur
            monthlyCostMinor = sum
          }
        }
        return {
          key: a.key,
          name: a.name,
          type: a.type,
          logoUrl: a.logoUrl,
          category: a.category,
          maturity: a.maturity,
          diagramCount: a.diagrams.size,
          diagrams: [...a.diagrams].map(([id, name]) => ({ id, name })),
          monthlyCostMinor,
          currency,
          lifecycles: [...a.lifecycles],
          integrations: a.integrations,
        }
      })
      .sort(
        (x, y) =>
          (y.monthlyCostMinor ?? 0) - (x.monthlyCostMinor ?? 0) ||
          y.diagramCount - x.diagramCount ||
          x.name.localeCompare(y.name),
      )

    return { entries }
  })
}
