import { saveDiagramInput } from '@system-map/shared'
import { and, eq, notInArray, sql } from 'drizzle-orm'
import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '../db/client'
import { notFound } from '../lib/errors'

// Atomic bulk save (spec §9): diff the incoming full diagram state against the DB
// and apply inserts/updates/deletes in one transaction. Simpler than per-entity
// dirty tracking on the client.
export const saveRoutes: FastifyPluginAsync = async (app) => {
  app.post('/diagrams/:id/save', async (req) => {
    const { id } = req.params as { id: string }
    const body = saveDiagramInput.parse(req.body)

    await db.transaction(async (tx) => {
      // Ownership gate: the diagram's company must belong to the caller.
      const [diagram] = await tx
        .select({ id: schema.diagrams.id })
        .from(schema.diagrams)
        .innerJoin(schema.companies, eq(schema.diagrams.companyId, schema.companies.id))
        .where(and(eq(schema.diagrams.id, id), eq(schema.companies.ownerId, req.user.id)))
        .limit(1)
      if (!diagram) throw notFound('Diagram')

      const meta: Partial<typeof schema.diagrams.$inferInsert> = { updatedAt: new Date() }
      if (body.name !== undefined) meta.name = body.name
      if (body.description !== undefined) meta.description = body.description
      await tx.update(schema.diagrams).set(meta).where(eq(schema.diagrams.id, id))

      // 1. Upsert layers (before nodes — nodes FK layers).
      if (body.layers.length > 0) {
        await tx
          .insert(schema.layers)
          .values(body.layers.map((l) => ({ ...l, diagramId: id })))
          .onConflictDoUpdate({
            target: schema.layers.id,
            set: {
              name: sql`excluded.name`,
              color: sql`excluded.color`,
              order: sql`excluded."order"`,
              visible: sql`excluded.visible`,
            },
          })
      }

      // 2. Upsert nodes (reassigns layerId before any layer is deleted).
      if (body.nodes.length > 0) {
        await tx
          .insert(schema.nodes)
          .values(
            body.nodes.map((n) => ({
              id: n.id,
              diagramId: id,
              layerId: n.layerId,
              type: n.type,
              positionX: n.positionX,
              positionY: n.positionY,
              width: n.width ?? null,
              height: n.height ?? null,
              data: n.data,
            })),
          )
          .onConflictDoUpdate({
            target: schema.nodes.id,
            set: {
              layerId: sql`excluded.layer_id`,
              type: sql`excluded.type`,
              positionX: sql`excluded.position_x`,
              positionY: sql`excluded.position_y`,
              width: sql`excluded.width`,
              height: sql`excluded.height`,
              data: sql`excluded.data`,
              updatedAt: new Date(),
            },
          })
      }

      // 3. Upsert edges.
      if (body.edges.length > 0) {
        await tx
          .insert(schema.edges)
          .values(
            body.edges.map((e) => ({
              id: e.id,
              diagramId: id,
              sourceNodeId: e.sourceNodeId,
              targetNodeId: e.targetNodeId,
              sourceHandle: e.sourceHandle ?? null,
              targetHandle: e.targetHandle ?? null,
              flowType: e.flowType,
              label: e.label ?? null,
              data: e.data,
            })),
          )
          .onConflictDoUpdate({
            target: schema.edges.id,
            set: {
              sourceNodeId: sql`excluded.source_node_id`,
              targetNodeId: sql`excluded.target_node_id`,
              sourceHandle: sql`excluded.source_handle`,
              targetHandle: sql`excluded.target_handle`,
              flowType: sql`excluded.flow_type`,
              label: sql`excluded.label`,
              data: sql`excluded.data`,
            },
          })
      }

      // 4. Upsert views.
      if (body.views.length > 0) {
        await tx
          .insert(schema.views)
          .values(
            body.views.map((v) => ({
              id: v.id,
              diagramId: id,
              name: v.name,
              filter: v.filter,
              isDefault: v.isDefault,
            })),
          )
          .onConflictDoUpdate({
            target: schema.views.id,
            set: {
              name: sql`excluded.name`,
              filter: sql`excluded.filter`,
              isDefault: sql`excluded.is_default`,
            },
          })
      }

      // 5. Delete anything no longer present (edges → nodes → layers → views).
      const edgeIds = body.edges.map((e) => e.id)
      await tx
        .delete(schema.edges)
        .where(
          edgeIds.length > 0
            ? and(eq(schema.edges.diagramId, id), notInArray(schema.edges.id, edgeIds))
            : eq(schema.edges.diagramId, id),
        )

      const nodeIds = body.nodes.map((n) => n.id)
      await tx
        .delete(schema.nodes)
        .where(
          nodeIds.length > 0
            ? and(eq(schema.nodes.diagramId, id), notInArray(schema.nodes.id, nodeIds))
            : eq(schema.nodes.diagramId, id),
        )

      const layerIds = body.layers.map((l) => l.id)
      if (layerIds.length > 0) {
        await tx
          .delete(schema.layers)
          .where(and(eq(schema.layers.diagramId, id), notInArray(schema.layers.id, layerIds)))
      }

      const viewIds = body.views.map((v) => v.id)
      await tx
        .delete(schema.views)
        .where(
          viewIds.length > 0
            ? and(eq(schema.views.diagramId, id), notInArray(schema.views.id, viewIds))
            : eq(schema.views.diagramId, id),
        )
    })

    return { ok: true }
  })
}
