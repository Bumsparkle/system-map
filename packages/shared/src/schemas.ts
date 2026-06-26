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

export const edgeRoutingSchema = z.enum(['bezier', 'smoothstep', 'straight', 'step'])
export type EdgeRouting = z.infer<typeof edgeRoutingSchema>

export const groupBySchema = z.enum(['category', 'layer'])
export type GroupBy = z.infer<typeof groupBySchema>

// Per-node lifecycle for the current/future-state toggle (spec v1.3 §2.1).
export const nodeLifecycleSchema = z.enum([
  'existing', // in current state, stays in future (default)
  'new', // added in future state
  'retiring', // removed in future state
  'replacing', // current node being replaced by a 'new' node
  'modifying', // stays in both but changes significantly
])
export type NodeLifecycle = z.infer<typeof nodeLifecycleSchema>

export const edgeLifecycleSchema = z.enum(['existing', 'new', 'retiring'])
export type EdgeLifecycle = z.infer<typeof edgeLifecycleSchema>

// Cost data (spec v1.3 §2.2). Amount stored in minor units (pence/cents) to
// avoid float bugs; formatted on display.
export const currencySchema = z.enum(['GBP', 'USD', 'EUR'])
export type Currency = z.infer<typeof currencySchema>

export const costConfidenceSchema = z.enum(['known', 'estimated', 'unknown'])
export type CostConfidence = z.infer<typeof costConfidenceSchema>

export const nodeCostSchema = z.object({
  monthlyAmount: z.number().int(), // minor units (pence/cents)
  currency: currencySchema,
  basis: z.string().optional(),
  notes: z.string().optional(),
  confidence: costConfidenceSchema,
  // Cost after a planned change — used by the Future-state roll-up for nodes
  // marked 'modifying' (spec v1.3 §5). Absent ⇒ future cost = current.
  futureMonthlyAmount: z.number().int().optional(),
})
export type NodeCost = z.infer<typeof nodeCostSchema>

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
  // Per-node customization (spec v1.1 §5)
  appearance: z
    .object({
      accentColor: z.string().optional(),
      iconKey: z.string().optional(),
      iconUrl: z.string().optional(),
      size: z.enum(['sm', 'md', 'lg']).optional(),
    })
    .optional(),
  // Vendor lookup (spec v1.2). A freshly-dropped App node awaits a vendor pick;
  // once chosen, the enriched record is stored here and mirrored to label/category.
  awaitingVendor: z.boolean().optional(),
  vendor: z
    .object({
      name: z.string(),
      domain: z.string().nullable().optional(),
      logoUrl: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      maturity: z.enum(['established', 'growth', 'emerging']).nullable().optional(),
      wikipediaUrl: z.string().nullable().optional(),
      source: z.enum(['cache', 'live', 'static-only', 'fallback']).optional(),
      fetchedAt: z.string().optional(),
    })
    .optional(),
  // Current/future-state lifecycle (spec v1.3 §2.1). Absent ⇒ treated as 'existing'.
  lifecycle: nodeLifecycleSchema.optional(),
  replacedByNodeId: z.string().optional(),
  lifecycleNotes: z.string().optional(),
  // Monthly cost (spec v1.3 §2.2). Optional — not every node has a cost.
  cost: nodeCostSchema.optional(),
})
export type NodeData = z.infer<typeof nodeDataSchema>

export const edgeDataSchema = z.object({
  direction: directionSchema.default('one_way'),
  frequency: z.string().optional(),
  volume: z.string().optional(),
  notes: z.string().optional(),
  // Per-edge path-routing override; falls back to the flow-type default (spec v1.1 §6)
  routing: edgeRoutingSchema.optional(),
  // custom flow overrides
  color: z.string().optional(),
  strokeStyle: strokeStyleSchema.optional(),
  animated: z.boolean().optional(),
  // Current/future-state lifecycle (spec v1.3 §2.3).
  lifecycle: edgeLifecycleSchema.optional(),
  // Manual bend points (flow coords). When present, the edge routes a smooth
  // spline through them instead of the default source→target curve.
  waypoints: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
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
  // Move the diagram to another company you own (must be a company id you own).
  companyId: z.string().optional(),
})
export type UpdateDiagramInput = z.infer<typeof updateDiagramInput>

/** Duplicate a diagram into a company (defaults to its current one). */
export const duplicateDiagramInput = z.object({
  companyId: z.string().optional(),
  name: z.string().min(1).optional(),
})
export type DuplicateDiagramInput = z.infer<typeof duplicateDiagramInput>

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

/* ------------------------------------------------------------------ */
/* Vendor lookup (v1.2)                                                */
/* ------------------------------------------------------------------ */

export const vendorMaturitySchema = z.enum(['established', 'growth', 'emerging'])
export type VendorMaturity = z.infer<typeof vendorMaturitySchema>

/** How a cached row was originally sourced (never 'cache' — that's a read-time state). */
export const vendorCacheSourceSchema = z.enum(['live', 'static-only', 'fallback'])
export type VendorCacheSource = z.infer<typeof vendorCacheSourceSchema>

/** Source reported on a /lookup response: 'cache' when served from the cache, else the cached row's source. */
export const vendorLookupSourceSchema = z.enum(['cache', 'live', 'static-only', 'fallback'])
export type VendorLookupSource = z.infer<typeof vendorLookupSourceSchema>

/** Typeahead suggestion (GET /api/vendors/search) — name + optional category hint. */
export const vendorSuggestionSchema = z.object({
  name: z.string(),
  hint: z.string().optional(),
  source: z.enum(['cache', 'wikipedia']),
})
export type VendorSuggestion = z.infer<typeof vendorSuggestionSchema>

/** Enriched vendor record (GET /api/vendors/lookup). logoUrl is OUR mirrored URL. */
export const vendorLookupSchema = z.object({
  name: z.string(),
  domain: z.string().nullable(),
  logoUrl: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  maturity: vendorMaturitySchema.nullable(),
  wikipediaUrl: z.string().nullable(),
  source: vendorLookupSourceSchema,
  fetchedAt: z.string(),
})
export type VendorLookup = z.infer<typeof vendorLookupSchema>

/* ------------------------------------------------------------------ */
/* AI suggestions (POST /api/diagrams/:id/suggest)                     */
/* ------------------------------------------------------------------ */

/** What kind of improvement a suggestion proposes. */
export const aiSuggestionCategorySchema = z.enum([
  'ai-agent',
  'automation',
  'integration',
  'consolidation',
  'resilience',
  'cost',
])
export type AiSuggestionCategory = z.infer<typeof aiSuggestionCategorySchema>

export const aiSuggestionImpactSchema = z.enum(['high', 'medium', 'low'])
export type AiSuggestionImpact = z.infer<typeof aiSuggestionImpactSchema>

/**
 * A concrete, label-referenced change-set that realises a suggestion. The model
 * sees node labels (not ids), so everything here is by label; the frontend
 * resolves labels back to ids to draw a faded "after" preview and to apply it.
 * New nodes are introduced in `addNodes` and may be referenced by label in
 * `addEdges`. Any array may be empty when a suggestion has no structural change.
 */
export const aiSuggestionPreviewSchema = z.object({
  /** Brand-new nodes to add (label is also how addEdges references them). */
  addNodes: z.array(z.object({ label: z.string(), type: nodeTypeSchema })),
  /** New flows; `from`/`to` are labels of existing or newly-added nodes. */
  addEdges: z.array(
    z.object({ from: z.string(), to: z.string(), flow: flowTypeSchema, label: z.string() }),
  ),
  /** Labels of existing nodes the suggestion proposes to remove. */
  removeNodes: z.array(z.string()),
  /** Existing flows to remove, by endpoint labels. */
  removeEdges: z.array(z.object({ from: z.string(), to: z.string() })),
  /** Existing flows whose type changes (e.g. a manual handoff → api). */
  updateEdges: z.array(z.object({ from: z.string(), to: z.string(), newFlow: flowTypeSchema })),
})
export type AiSuggestionPreview = z.infer<typeof aiSuggestionPreviewSchema>

export const aiSuggestionSchema = z.object({
  title: z.string(),
  detail: z.string(),
  category: aiSuggestionCategorySchema,
  impact: aiSuggestionImpactSchema,
  /** Node labels the suggestion relates to. */
  targets: z.array(z.string()),
  /** Concrete edit to preview/apply on the canvas (optional for resilience). */
  preview: aiSuggestionPreviewSchema.optional(),
})
export type AiSuggestion = z.infer<typeof aiSuggestionSchema>

export const aiSuggestResponseSchema = z.object({
  suggestions: z.array(aiSuggestionSchema),
})
export type AiSuggestResponse = z.infer<typeof aiSuggestResponseSchema>

/* ------------------------------------------------------------------ */
/* Application portfolio (GET /api/portfolio)                          */
/* ------------------------------------------------------------------ */

/** One app/vendor aggregated across a single company's diagrams. */
export const portfolioEntrySchema = z.object({
  key: z.string(),
  name: z.string(),
  type: nodeTypeSchema,
  logoUrl: z.string().nullable(),
  category: z.string().nullable(),
  maturity: vendorMaturitySchema.nullable(),
  /** Number of distinct diagrams (within the company) this app appears in. */
  diagramCount: z.number().int(),
  diagrams: z.array(z.object({ id: z.string(), name: z.string() })),
  /** Total monthly spend across instances (minor units), or null if none costed. */
  monthlyCostMinor: z.number().int().nullable(),
  currency: currencySchema.nullable(),
  /** Distinct lifecycle states seen for this app. */
  lifecycles: z.array(nodeLifecycleSchema),
  /** Total edges touching this app's nodes across the company's diagrams. */
  integrations: z.number().int(),
})
export type PortfolioEntry = z.infer<typeof portfolioEntrySchema>

/** A company's slice of the portfolio — its apps rolled up across its diagrams. */
export const portfolioCompanySchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  entries: z.array(portfolioEntrySchema),
})
export type PortfolioCompany = z.infer<typeof portfolioCompanySchema>

export const portfolioResponseSchema = z.object({
  companies: z.array(portfolioCompanySchema),
})
export type PortfolioResponse = z.infer<typeof portfolioResponseSchema>
