import { createDiagramInput, duplicateDiagramInput, updateDiagramInput } from '@system-map/shared'
import { and, asc, desc, eq, getTableColumns } from 'drizzle-orm'
import type { FastifyPluginAsync } from 'fastify'
import { nanoid } from 'nanoid'
import { db, schema } from '../db/client.js'
import { assertCompanyOwned, assertDiagramOwned } from '../lib/authz.js'
import { HttpError, notFound } from '../lib/errors.js'
import { type MapForAI, aiConfigured, suggestForMap } from '../lib/suggest.js'

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
    // Move to another company: the target must also belong to the caller.
    if (body.companyId !== undefined) {
      await assertCompanyOwned(body.companyId, req.user.id)
      patch.companyId = body.companyId
    }
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

  // Deep-copy a diagram (layers/nodes/edges/views) into a company — its own by
  // default, or another the caller owns. Every id is regenerated so the copy is
  // fully independent of the original.
  app.post('/diagrams/:id/duplicate', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = duplicateDiagramInput.parse(req.body ?? {})

    const [src] = await db
      .select({
        name: schema.diagrams.name,
        description: schema.diagrams.description,
        companyId: schema.diagrams.companyId,
      })
      .from(schema.diagrams)
      .innerJoin(schema.companies, eq(schema.diagrams.companyId, schema.companies.id))
      .where(and(eq(schema.diagrams.id, id), eq(schema.companies.ownerId, req.user.id)))
      .limit(1)
    if (!src) throw notFound('Diagram')

    const targetCompanyId = body.companyId ?? src.companyId
    if (body.companyId && body.companyId !== src.companyId) {
      await assertCompanyOwned(body.companyId, req.user.id)
    }

    const [layers, nodes, edges, views] = await Promise.all([
      db.select().from(schema.layers).where(eq(schema.layers.diagramId, id)),
      db.select().from(schema.nodes).where(eq(schema.nodes.diagramId, id)),
      db.select().from(schema.edges).where(eq(schema.edges.diagramId, id)),
      db.select().from(schema.views).where(eq(schema.views.diagramId, id)),
    ])

    const newDiagramId = nanoid()
    const layerMap = new Map(layers.map((l) => [l.id, nanoid()]))
    const nodeMap = new Map(nodes.map((n) => [n.id, nanoid()]))
    const fallbackLayer = [...layerMap.values()][0]

    const created = await db.transaction(async (tx) => {
      const [diagram] = await tx
        .insert(schema.diagrams)
        .values({
          id: newDiagramId,
          companyId: targetCompanyId,
          name: body.name ?? `${src.name} (copy)`,
          description: src.description,
        })
        .returning()

      if (layers.length > 0) {
        await tx.insert(schema.layers).values(
          layers.map((l) => ({
            id: layerMap.get(l.id) as string,
            diagramId: newDiagramId,
            name: l.name,
            color: l.color,
            order: l.order,
            visible: l.visible,
          })),
        )
      }

      if (nodes.length > 0) {
        await tx.insert(schema.nodes).values(
          nodes.map((n) => ({
            id: nodeMap.get(n.id) as string,
            diagramId: newDiagramId,
            layerId: layerMap.get(n.layerId) ?? (fallbackLayer as string),
            type: n.type,
            positionX: n.positionX,
            positionY: n.positionY,
            width: n.width,
            height: n.height,
            data: n.data,
          })),
        )
      }

      // Skip any edge whose endpoints didn't survive (defensive — shouldn't happen).
      const validEdges = edges.filter(
        (e) => nodeMap.has(e.sourceNodeId) && nodeMap.has(e.targetNodeId),
      )
      if (validEdges.length > 0) {
        await tx.insert(schema.edges).values(
          validEdges.map((e) => ({
            id: nanoid(),
            diagramId: newDiagramId,
            sourceNodeId: nodeMap.get(e.sourceNodeId) as string,
            targetNodeId: nodeMap.get(e.targetNodeId) as string,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            flowType: e.flowType,
            label: e.label,
            data: e.data,
          })),
        )
      }

      if (views.length > 0) {
        await tx.insert(schema.views).values(
          views.map((v) => ({
            id: nanoid(),
            diagramId: newDiagramId,
            name: v.name,
            filter: {
              ...v.filter,
              layerIds: v.filter.layerIds
                .map((lid) => layerMap.get(lid))
                .filter((x): x is string => !!x),
            },
            isDefault: v.isDefault,
          })),
        )
      }

      return diagram
    })

    reply.code(201)
    return created
  })

  // AI improvement suggestions: send the map to an LLM and return structured
  // suggestions, especially automating manual steps / where AI agents help.
  app.post('/diagrams/:id/suggest', async (req) => {
    const { id } = req.params as { id: string }
    await assertDiagramOwned(id, req.user.id)
    if (!aiConfigured()) {
      throw new HttpError(503, "AI suggestions aren't set up yet — add an OPENAI_API_KEY.")
    }

    const [[diagram], nodes, edges] = await Promise.all([
      db
        .select({ name: schema.diagrams.name })
        .from(schema.diagrams)
        .where(eq(schema.diagrams.id, id)),
      db.select().from(schema.nodes).where(eq(schema.nodes.diagramId, id)),
      db.select().from(schema.edges).where(eq(schema.edges.diagramId, id)),
    ])
    if (nodes.length === 0) {
      throw new HttpError(400, 'Add a few nodes before asking for suggestions.')
    }

    const labelById = new Map(nodes.map((n) => [n.id, n.data.label]))
    const map: MapForAI = {
      name: diagram?.name ?? 'Untitled',
      nodes: nodes.map((n) => ({
        label: n.data.label,
        type: n.type,
        ...(n.data.category ? { category: n.data.category } : {}),
      })),
      edges: edges.flatMap((e) => {
        const from = labelById.get(e.sourceNodeId)
        const to = labelById.get(e.targetNodeId)
        if (!from || !to) return []
        return [{ from, to, flow: e.flowType, ...(e.label ? { label: e.label } : {}) }]
      }),
    }

    return suggestForMap(map)
  })
}
