import { createCompanyInput, updateCompanyInput } from '@system-map/shared'
import { and, asc, eq } from 'drizzle-orm'
import type { FastifyPluginAsync } from 'fastify'
import { nanoid } from 'nanoid'
import { db, schema } from '../db/client'
import { notFound } from '../lib/errors'
import { slugify } from '../lib/slug'

async function uniqueSlug(desired: string): Promise<string> {
  const base = slugify(desired)
  let candidate = base
  for (let i = 0; i < 50; i++) {
    const existing = await db
      .select({ id: schema.companies.id })
      .from(schema.companies)
      .where(eq(schema.companies.slug, candidate))
      .limit(1)
    if (existing.length === 0) return candidate
    candidate = `${base}-${nanoid(4).toLowerCase()}`
  }
  return `${base}-${nanoid(8).toLowerCase()}`
}

export const companyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/companies', async (req) => {
    return db
      .select()
      .from(schema.companies)
      .where(eq(schema.companies.ownerId, req.user.id))
      .orderBy(asc(schema.companies.createdAt))
  })

  app.post('/companies', async (req, reply) => {
    const body = createCompanyInput.parse(req.body)
    const slug = await uniqueSlug(body.slug ?? body.name)
    const [row] = await db
      .insert(schema.companies)
      .values({ id: nanoid(), ownerId: req.user.id, name: body.name, slug })
      .returning()
    reply.code(201)
    return row
  })

  app.get('/companies/:id', async (req) => {
    const { id } = req.params as { id: string }
    const [row] = await db
      .select()
      .from(schema.companies)
      .where(and(eq(schema.companies.id, id), eq(schema.companies.ownerId, req.user.id)))
      .limit(1)
    if (!row) throw notFound('Company')
    return row
  })

  app.patch('/companies/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = updateCompanyInput.parse(req.body)
    const patch: Partial<typeof schema.companies.$inferInsert> = { updatedAt: new Date() }
    if (body.name !== undefined) patch.name = body.name
    if (body.slug !== undefined) patch.slug = await uniqueSlug(body.slug)
    const [row] = await db
      .update(schema.companies)
      .set(patch)
      .where(and(eq(schema.companies.id, id), eq(schema.companies.ownerId, req.user.id)))
      .returning()
    if (!row) throw notFound('Company')
    return row
  })

  app.delete('/companies/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const [row] = await db
      .delete(schema.companies)
      .where(and(eq(schema.companies.id, id), eq(schema.companies.ownerId, req.user.id)))
      .returning()
    if (!row) throw notFound('Company')
    reply.code(204)
    return null
  })
}
