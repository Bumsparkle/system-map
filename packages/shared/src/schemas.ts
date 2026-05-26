import { z } from 'zod'

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const nodeTypeSchema = z.enum([
  'app',
  'system',
  'data_source',
  'external_entity',
  'cash',
  'group',
  'custom',
])
export type NodeType = z.infer<typeof nodeTypeSchema>

export const flowTypeSchema = z.enum(['data', 'cash', 'api', 'manual', 'event', 'custom'])
export type FlowType = z.infer<typeof flowTypeSchema>

export const handleSchema = z.enum(['top', 'right', 'bottom', 'left'])
export type Handle = z.infer<typeof handleSchema>

export const directionSchema = z.enum(['one_way', 'two_way'])
export type Direction = z.infer<typeof directionSchema>

export const strokeStyleSchema = z.enum(['solid', 'dashed', 'dotted'])
export type StrokeStyle = z.infer<typeof strokeStyleSchema>

export const groupBySchema = z.enum(['category', 'layer'])
export type GroupBy = z.infer<typeof groupBySchema>

/* ------------------------------------------------------------------ */
/* JSONB payload shapes                                                */
/* ------------------------------------------------------------------ */

export const nodeDataSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  category: z.string().optional(),
  fields: z.record(z.string(), z.string()).default({}),
  color: z.string().optional(),
})
export type NodeData = z.infer<typeof nodeDataSchema>

export const edgeDataSchema = z.object({
  direction: directionSchema.default('one_way'),
  frequency: z.string().optional(),
  volume: z.string().optional(),
  notes: z.string().optional(),
  // custom flow overrides
  color: z.string().optional(),
  strokeStyle: strokeStyleSchema.optional(),
  animated: z.boolean().optional(),
})
export type EdgeData = z.infer<typeof edgeDataSchema>

export const viewFilterSchema = z.object({
  layerIds: z.array(z.string()),
  flowTypes: z.array(flowTypeSchema),
  nodeTypes: z.array(nodeTypeSchema),
  groupBy: groupBySchema.optional(),
})
export type ViewFilter = z.infer<typeof viewFilterSchema>

/* ------------------------------------------------------------------ */
/* Entities (wire shape — timestamps serialized as ISO strings)        */
/* ------------------------------------------------------------------ */

export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Company = z.infer<typeof companySchema>

export const diagramSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Diagram = z.infer<typeof diagramSchema>

export const layerSchema = z.object({
  id: z.string(),
  diagramId: z.string(),
  name: z.string(),
  color: z.string(),
  order: z.number().int(),
  visible: z.boolean(),
})
export type Layer = z.infer<typeof layerSchema>

export const nodeSchema = z.object({
  id: z.string(),
  diagramId: z.string(),
  layerId: z.string(),
  type: nodeTypeSchema,
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  data: nodeDataSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type DiagramNode = z.infer<typeof nodeSchema>

export const edgeSchema = z.object({
  id: z.string(),
  diagramId: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  flowType: flowTypeSchema,
  label: z.string().nullable().optional(),
  data: edgeDataSchema,
})
export type DiagramEdge = z.infer<typeof edgeSchema>

export const viewSchema = z.object({
  id: z.string(),
  diagramId: z.string(),
  name: z.string(),
  filter: viewFilterSchema,
  isDefault: z.boolean(),
})
export type View = z.infer<typeof viewSchema>

/** Full diagram payload returned by GET /api/diagrams/:id */
export const diagramDetailSchema = diagramSchema.extend({
  layers: z.array(layerSchema),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
  views: z.array(viewSchema),
})
export type DiagramDetail = z.infer<typeof diagramDetailSchema>

/* ------------------------------------------------------------------ */
/* Request inputs                                                      */
/* ------------------------------------------------------------------ */

export const createCompanyInput = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
})
export type CreateCompanyInput = z.infer<typeof createCompanyInput>

export const updateCompanyInput = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
})
export type UpdateCompanyInput = z.infer<typeof updateCompanyInput>

export const createDiagramInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})
export type CreateDiagramInput = z.infer<typeof createDiagramInput>

export const updateDiagramInput = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
})
export type UpdateDiagramInput = z.infer<typeof updateDiagramInput>

export const createLayerInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  color: z.string(),
  order: z.number().int(),
  visible: z.boolean().optional(),
})
export type CreateLayerInput = z.infer<typeof createLayerInput>

export const updateLayerInput = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  order: z.number().int().optional(),
  visible: z.boolean().optional(),
})
export type UpdateLayerInput = z.infer<typeof updateLayerInput>

export const createNodeInput = z.object({
  id: z.string().optional(),
  layerId: z.string(),
  type: nodeTypeSchema,
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  data: nodeDataSchema,
})
export type CreateNodeInput = z.infer<typeof createNodeInput>

export const updateNodeInput = z.object({
  layerId: z.string().optional(),
  type: nodeTypeSchema.optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  data: nodeDataSchema.optional(),
})
export type UpdateNodeInput = z.infer<typeof updateNodeInput>

export const createEdgeInput = z.object({
  id: z.string().optional(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  flowType: flowTypeSchema,
  label: z.string().nullable().optional(),
  data: edgeDataSchema.optional(),
})
export type CreateEdgeInput = z.infer<typeof createEdgeInput>

export const updateEdgeInput = z.object({
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  flowType: flowTypeSchema.optional(),
  label: z.string().nullable().optional(),
  data: edgeDataSchema.optional(),
})
export type UpdateEdgeInput = z.infer<typeof updateEdgeInput>

export const createViewInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  filter: viewFilterSchema,
  isDefault: z.boolean().optional(),
})
export type CreateViewInput = z.infer<typeof createViewInput>

export const updateViewInput = z.object({
  name: z.string().min(1).optional(),
  filter: viewFilterSchema.optional(),
  isDefault: z.boolean().optional(),
})
export type UpdateViewInput = z.infer<typeof updateViewInput>

/* ------------------------------------------------------------------ */
/* Bulk save (atomic diff applied in a transaction)                    */
/* ------------------------------------------------------------------ */

export const saveLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  order: z.number().int(),
  visible: z.boolean(),
})

export const saveNodeSchema = z.object({
  id: z.string(),
  layerId: z.string(),
  type: nodeTypeSchema,
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  data: nodeDataSchema,
})

export const saveEdgeSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  flowType: flowTypeSchema,
  label: z.string().nullable().optional(),
  data: edgeDataSchema,
})

export const saveViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  filter: viewFilterSchema,
  isDefault: z.boolean(),
})

export const saveDiagramInput = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  layers: z.array(saveLayerSchema),
  nodes: z.array(saveNodeSchema),
  edges: z.array(saveEdgeSchema),
  views: z.array(saveViewSchema),
})
export type SaveDiagramInput = z.infer<typeof saveDiagramInput>
