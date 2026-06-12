import type { EdgeData, FlowType, NodeData, NodeType } from '@system-map/shared'
import { inArray } from 'drizzle-orm'
import { DEV_USER_ID } from '../lib/devUser'
import { db, queryClient, schema } from './client'

/**
 * Dev seed: "Acme Inc." with two example maps (mirrors the static-demo fixtures
 * in apps/web/src/lib/demoData.ts). Idempotent — re-running resets the demo.
 */

const COMPANY_ID = 'demo-co'

type SeedNode = {
  id: string
  diagramId: string
  layerId: string
  type: NodeType
  positionX: number
  positionY: number
  data: NodeData
}

type SeedEdge = {
  id: string
  diagramId: string
  sourceNodeId: string
  targetNodeId: string
  sourceHandle: string
  targetHandle: string
  flowType: FlowType
  label: string
  data: EdgeData
}

const paymentsNodes: SeedNode[] = [
  {
    id: 'n-customer',
    diagramId: 'demo-payments',
    layerId: 'l-ext',
    type: 'custom',
    positionX: 20,
    positionY: 260,
    data: {
      label: 'Customer',
      fields: {},
      color: '#4F46E5',
      description: 'End user on web or mobile',
    },
  },
  {
    id: 'n-web',
    diagramId: 'demo-payments',
    layerId: 'l-core',
    type: 'app',
    positionX: 280,
    positionY: 120,
    data: { label: 'Web App', category: 'Frontend', fields: {} },
  },
  {
    id: 'n-mobile',
    diagramId: 'demo-payments',
    layerId: 'l-core',
    type: 'app',
    positionX: 280,
    positionY: 380,
    data: { label: 'Mobile App', category: 'Frontend', fields: {} },
  },
  {
    id: 'n-gw',
    diagramId: 'demo-payments',
    layerId: 'l-core',
    type: 'system',
    positionX: 560,
    positionY: 250,
    data: { label: 'api-gateway', category: 'Edge', fields: {} },
  },
  {
    id: 'n-billing',
    diagramId: 'demo-payments',
    layerId: 'l-core',
    type: 'system',
    positionX: 850,
    positionY: 110,
    data: { label: 'billing-svc', category: 'Payments', fields: {} },
  },
  {
    id: 'n-auth',
    diagramId: 'demo-payments',
    layerId: 'l-core',
    type: 'system',
    positionX: 850,
    positionY: 390,
    data: { label: 'auth-svc', category: 'Identity', fields: {} },
  },
  {
    id: 'n-db',
    diagramId: 'demo-payments',
    layerId: 'l-core',
    type: 'data_source',
    positionX: 1150,
    positionY: 250,
    data: { label: 'postgres', category: 'Datastore', fields: {} },
  },
  {
    id: 'n-stripe',
    diagramId: 'demo-payments',
    layerId: 'l-ext',
    type: 'app',
    positionX: 1150,
    positionY: 30,
    data: { label: 'Stripe', category: 'Payments', fields: {} },
  },
  {
    id: 'n-segment',
    diagramId: 'demo-payments',
    layerId: 'l-ext',
    type: 'app',
    positionX: 850,
    positionY: 590,
    data: { label: 'Segment', category: 'Analytics', fields: {} },
  },
]

const paymentsEdges: SeedEdge[] = [
  {
    id: 'e1',
    diagramId: 'demo-payments',
    sourceNodeId: 'n-customer',
    targetNodeId: 'n-web',
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'data',
    label: 'visits',
    data: { direction: 'one_way' },
  },
  {
    id: 'e2',
    diagramId: 'demo-payments',
    sourceNodeId: 'n-customer',
    targetNodeId: 'n-mobile',
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'data',
    label: 'uses',
    data: { direction: 'one_way' },
  },
  {
    id: 'e3',
    diagramId: 'demo-payments',
    sourceNodeId: 'n-web',
    targetNodeId: 'n-gw',
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'api',
    label: 'REST',
    data: { direction: 'two_way' },
  },
  {
    id: 'e4',
    diagramId: 'demo-payments',
    sourceNodeId: 'n-mobile',
    targetNodeId: 'n-gw',
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'api',
    label: 'REST',
    data: { direction: 'two_way' },
  },
  {
    id: 'e5',
    diagramId: 'demo-payments',
    sourceNodeId: 'n-gw',
    targetNodeId: 'n-billing',
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'api',
    label: 'charge',
    data: { direction: 'two_way' },
  },
  {
    id: 'e6',
    diagramId: 'demo-payments',
    sourceNodeId: 'n-gw',
    targetNodeId: 'n-auth',
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'api',
    label: 'verify',
    data: { direction: 'two_way' },
  },
  {
    id: 'e7',
    diagramId: 'demo-payments',
    sourceNodeId: 'n-billing',
    targetNodeId: 'n-stripe',
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'cash',
    label: 'settle',
    data: { direction: 'two_way' },
  },
  {
    id: 'e8',
    diagramId: 'demo-payments',
    sourceNodeId: 'n-billing',
    targetNodeId: 'n-db',
    sourceHandle: 'right',
    targetHandle: 'top',
    flowType: 'data',
    label: 'writes',
    data: { direction: 'one_way' },
  },
  {
    id: 'e9',
    diagramId: 'demo-payments',
    sourceNodeId: 'n-auth',
    targetNodeId: 'n-db',
    sourceHandle: 'right',
    targetHandle: 'bottom',
    flowType: 'data',
    label: 'reads',
    data: { direction: 'one_way' },
  },
  {
    id: 'e10',
    diagramId: 'demo-payments',
    sourceNodeId: 'n-gw',
    targetNodeId: 'n-segment',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    flowType: 'event',
    label: 'track',
    data: { direction: 'one_way' },
  },
]

const onboardingNodes: SeedNode[] = [
  {
    id: 'o-user',
    diagramId: 'demo-onboarding',
    layerId: 'l2-main',
    type: 'external_entity',
    positionX: 40,
    positionY: 150,
    data: { label: 'New user', fields: {} },
  },
  {
    id: 'o-app',
    diagramId: 'demo-onboarding',
    layerId: 'l2-main',
    type: 'app',
    positionX: 320,
    positionY: 150,
    data: { label: 'Onboarding App', category: 'Frontend', fields: {} },
  },
  {
    id: 'o-email',
    diagramId: 'demo-onboarding',
    layerId: 'l2-main',
    type: 'app',
    positionX: 620,
    positionY: 40,
    data: { label: 'SendGrid', category: 'Email', fields: {} },
  },
  {
    id: 'o-crm',
    diagramId: 'demo-onboarding',
    layerId: 'l2-main',
    type: 'app',
    positionX: 620,
    positionY: 260,
    data: { label: 'HubSpot', category: 'CRM', fields: {} },
  },
]

const onboardingEdges: SeedEdge[] = [
  {
    id: 'oe1',
    diagramId: 'demo-onboarding',
    sourceNodeId: 'o-user',
    targetNodeId: 'o-app',
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'data',
    label: 'signs up',
    data: { direction: 'one_way' },
  },
  {
    id: 'oe2',
    diagramId: 'demo-onboarding',
    sourceNodeId: 'o-app',
    targetNodeId: 'o-email',
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'event',
    label: 'welcome email',
    data: { direction: 'one_way' },
  },
  {
    id: 'oe3',
    diagramId: 'demo-onboarding',
    sourceNodeId: 'o-app',
    targetNodeId: 'o-crm',
    sourceHandle: 'right',
    targetHandle: 'left',
    flowType: 'event',
    label: 'create lead',
    data: { direction: 'one_way' },
  },
]

async function seed() {
  // Reset prior demo data so re-seeding is clean. (Legacy 'demo-co' slug too.)
  await db.delete(schema.companies).where(inArray(schema.companies.slug, ['acme', 'demo-co']))

  await db
    .insert(schema.companies)
    .values({ id: COMPANY_ID, ownerId: DEV_USER_ID, name: 'Acme Inc.', slug: 'acme' })

  // Payments platform
  await db.insert(schema.diagrams).values({
    id: 'demo-payments',
    companyId: COMPANY_ID,
    name: 'Payments platform',
    description: 'How a charge flows from the apps through our services to Stripe and Postgres.',
  })
  await db.insert(schema.layers).values([
    {
      id: 'l-core',
      diagramId: 'demo-payments',
      name: 'Core services',
      color: '#D4471F',
      order: 0,
      visible: true,
    },
    {
      id: 'l-ext',
      diagramId: 'demo-payments',
      name: 'Integrations',
      color: '#4F46E5',
      order: 1,
      visible: true,
    },
  ])
  await db.insert(schema.nodes).values(paymentsNodes)
  await db.insert(schema.edges).values(paymentsEdges)

  // Onboarding flow
  await db.insert(schema.diagrams).values({
    id: 'demo-onboarding',
    companyId: COMPANY_ID,
    name: 'Onboarding flow',
    description: 'What happens when a new user signs up.',
  })
  await db.insert(schema.layers).values({
    id: 'l2-main',
    diagramId: 'demo-onboarding',
    name: 'Main',
    color: '#047857',
    order: 0,
    visible: true,
  })
  await db.insert(schema.nodes).values(onboardingNodes)
  await db.insert(schema.edges).values(onboardingEdges)

  console.log('Seeded "Acme Inc." with Payments platform + Onboarding flow.')
  await queryClient.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
