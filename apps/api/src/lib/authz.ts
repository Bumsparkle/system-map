import { and, eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { notFound } from './errors'

// Ownership checks scope every diagram/company operation to the logged-in user.
// We throw 404 (not 403) on a miss so the API never reveals that an id exists
// under another account.

/** Throw 404 unless the company exists AND belongs to userId. */
export async function assertCompanyOwned(companyId: string, userId: string): Promise<void> {
  const [row] = await db
    .select({ id: schema.companies.id })
    .from(schema.companies)
    .where(and(eq(schema.companies.id, companyId), eq(schema.companies.ownerId, userId)))
    .limit(1)
  if (!row) throw notFound('Company')
}

/** Throw 404 unless the diagram exists AND its company belongs to userId. */
export async function assertDiagramOwned(diagramId: string, userId: string): Promise<void> {
  const [row] = await db
    .select({ id: schema.diagrams.id })
    .from(schema.diagrams)
    .innerJoin(schema.companies, eq(schema.diagrams.companyId, schema.companies.id))
    .where(and(eq(schema.diagrams.id, diagramId), eq(schema.companies.ownerId, userId)))
    .limit(1)
  if (!row) throw notFound('Diagram')
}
