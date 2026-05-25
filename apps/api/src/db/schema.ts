import type { EdgeData, FlowType, NodeData, NodeType, ViewFilter } from '@system-map/shared'
import { boolean, integer, jsonb, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core'

// TODO(auth): companies are workspaces owned by a single hardcoded user in the MVP.
// Adding auth later means introducing a `users` table and a `user_id` FK here — a
// migration, not a rewrite. No user scoping exists yet.
export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const diagrams = pgTable('diagrams', {
  id: text('id').primaryKey(),
  companyId: text('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const layers = pgTable('layers', {
  id: text('id').primaryKey(),
  diagramId: text('diagram_id')
    .notNull()
    .references(() => diagrams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  order: integer('order').notNull(),
  visible: boolean('visible').notNull().default(true),
})

export const nodes = pgTable('nodes', {
  id: text('id').primaryKey(),
  diagramId: text('diagram_id')
    .notNull()
    .references(() => diagrams.id, { onDelete: 'cascade' }),
  layerId: text('layer_id')
    .notNull()
    .references(() => layers.id, { onDelete: 'cascade' }),
  type: text('type').notNull().$type<NodeType>(),
  positionX: real('position_x').notNull(),
  positionY: real('position_y').notNull(),
  width: real('width'),
  height: real('height'),
  data: jsonb('data').notNull().$type<NodeData>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const edges = pgTable('edges', {
  id: text('id').primaryKey(),
  diagramId: text('diagram_id')
    .notNull()
    .references(() => diagrams.id, { onDelete: 'cascade' }),
  sourceNodeId: text('source_node_id')
    .notNull()
    .references(() => nodes.id, { onDelete: 'cascade' }),
  targetNodeId: text('target_node_id')
    .notNull()
    .references(() => nodes.id, { onDelete: 'cascade' }),
  sourceHandle: text('source_handle'),
  targetHandle: text('target_handle'),
  flowType: text('flow_type').notNull().$type<FlowType>(),
  label: text('label'),
  data: jsonb('data').$type<EdgeData>(),
})

export const views = pgTable('views', {
  id: text('id').primaryKey(),
  diagramId: text('diagram_id')
    .notNull()
    .references(() => diagrams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filter: jsonb('filter').notNull().$type<ViewFilter>(),
  isDefault: boolean('is_default').notNull().default(false),
})
