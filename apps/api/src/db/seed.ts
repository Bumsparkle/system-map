import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db, queryClient, schema } from './client'

async function seed() {
  const slug = 'demo-co'
  const [existing] = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.slug, slug))
    .limit(1)
  if (existing) {
    console.log('Seed already present — skipping.')
    await queryClient.end()
    return
  }

  const companyId = nanoid()
  await db.insert(schema.companies).values({ id: companyId, name: 'Demo Co', slug })

  const diagramId = nanoid()
  await db.insert(schema.diagrams).values({
    id: diagramId,
    companyId,
    name: 'Example map',
    description: 'A sample system map to poke at.',
  })

  const layerId = nanoid()
  await db.insert(schema.layers).values({
    id: layerId,
    diagramId,
    name: 'Main',
    color: '#D4471F',
    order: 0,
    visible: true,
  })

  const apiId = nanoid()
  const stripeId = nanoid()
  await db.insert(schema.nodes).values([
    {
      id: apiId,
      diagramId,
      layerId,
      type: 'system',
      positionX: 80,
      positionY: 120,
      data: { label: 'Backend API', fields: {} },
    },
    {
      id: stripeId,
      diagramId,
      layerId,
      type: 'app',
      positionX: 360,
      positionY: 120,
      data: { label: 'Stripe', category: 'finance', fields: {} },
    },
  ])

  await db.insert(schema.edges).values({
    id: nanoid(),
    diagramId,
    sourceNodeId: apiId,
    targetNodeId: stripeId,
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'api',
    label: 'charges',
    data: { direction: 'two_way' },
  })

  console.log('Seeded "Demo Co" with an example diagram.')
  await queryClient.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
