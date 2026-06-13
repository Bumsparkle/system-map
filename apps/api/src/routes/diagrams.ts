import { createDiagramInput, updateDiagramInput } from '@system-map/shared'
import { and, asc, desc, eq, getTableColumns } from 'drizzle-orm'
import type { FastifyPluginAsync } from 'fastify'
import { nanoid } from 'nanoid'
import { db, schema } from '../db/client.js'
import { assertCompanyOwned, assertDiagramOwned } from '../lib/authz.js'
import { notFound } from '../lib/errors.js'

// Default "Main" layer uses the accent (burnt sienna) as its indicator color.
const DEFAULT_LAYER_COLOR = '#D4471F'

export const diagramRoutes: FastifyPluginAsync = async (app) => {
  app.get('/companies/:companyId/diagrams', async (req) => {
    const { companyId } = req.params as { companyId: string }
    await assertCompanyOwned(companyId, req.user.id)
    return db
      .select()
      .from(schema.diagrams)
      .where(eq(schema.diagrams.companyId, companyId))
      .orderBy(desc(schema.diagrams.updatedAt))
  })

  app.post('/companies/:companyId/diagrams', async (req, reply) => {
    const { companyId } = req.params as { companyId: string }
    const body = createDiagramInput.parse(req.body)

    await assertCompanyOwned(companyId, req.user.id)

    const diagramId = nanoid()
    const diagram = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.diagrams)
        .values({
          id: diagramId,
          companyId,
          name: body.name,
          description: body.description ?? null,
        })
        .returning()
      // A diagram always starts with one auto-created "Main" layer (spec §7).
      await tx.insert(schema.layers).values({
        id: nanoid(),
        diagramId,
        name: 'Main',
        color: DEFAULT_LAYER_COLOR,
        order: 0,
        visible: true,
      })
      return created
    })

    reply.code(201)
    return diagram
  })

  // Full diagram payload in one round-trip (spec §9). The join enforces that the
  // diagram's company belongs to the caller — unowned ids read as 404.
  app.get('/diagrams/:id', async (req) => {
    const { id } = req.params as { id: string }
    const [diagram] = await db
      .select(getTableColumns(schema.diagrams))
      .from(schema.diagrams)
      .innerJoin(schema.companies, eq(schema.diagrams.companyId, schema.companies.id))
      .where(and(eq(schema.diagrams.id, id), eq(schema.companies.ownerId, req.user.id)))
      .limit(1)
    if (!diagram) throw notFound('Diagram')

    const [layers, nodes, edges, views] = await Promise.all([
      db
        .select()
        .from(schema.layers)
        .where(eq(schema.layers.diagramId, id))
        .orderBy(asc(schema.layers.order)),
      db.select().from(schema.nodes).where(eq(schema.nodes.diagramId, id)),
      db.select().from(schema.edges).where(eq(schema.edges.diagramId, id)),
      db.select().from(schema.views).where(eq(schema.views.diagramId, id)),
    ])

    return { ...diagram, layers, nodes, edges, views }
  })

  app.patch('/diagrams/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = updateDiagramInput.parse(req.body)
    await assertDiagramOwned(id, req.user.id)
    const patch: Partial<typeof schema.diagrams.$inferInsert> = { updatedAt: new Date() }
    if (body.name !== undefined) patch.name = body.name
    if (body.description !== undefined) patch.description = body.description
    const [row] = await db
      .update(schema.diagrams)
      .set(patch)
      .where(eq(schema.diagrams.id, id))
      .returning()
    if (!row) throw notFound('Diagram')
    return row
  })

  app.delete('/diagrams/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await assertDiagramOwned(id, req.user.id)
    const [row] = await db.delete(schema.diagrams).where(eq(schema.diagrams.id, id)).returning()
    if (!row) throw notFound('Diagram')
    reply.code(204)
    return null
  })
}
