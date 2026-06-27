import { type AiSuggestResponse, aiSuggestResponseSchema } from '@system-map/shared'
import OpenAI from 'openai'
import { env } from '../env.js'
import { HttpError } from './errors.js'

/** True when AI suggestions are wired up (OPENAI_API_KEY set). */
export function aiConfigured(): boolean {
  return Boolean(env.OPENAI_API_KEY)
}

/** Compact, label-based view of a diagram for the model. */
export type MapForAI = {
  name: string
  nodes: { label: string; type: string; category?: string }[]
  edges: { from: string; to: string; flow: string; label?: string }[]
}

const SYSTEM = `You are an enterprise-architecture advisor who specialises in automation and AI agents. You are given a "system map": typed nodes (apps, internal systems, data sources, external parties, money) and typed flows between them.

Your job: propose high-value, concrete improvements to this architecture.

PRIORITISE finding manual or repetitive work that could be replaced by automation or an AI agent. Strong signals of manual work: flows with flow type "manual", nodes whose label contains words like "manual", "spreadsheet", "email", "review", "handoff", and node type "custom" used for a human/offline step.

For each suggestion:
- Be specific and reference the actual node names involved (put them in "targets").
- Say what to do and the benefit in one or two sentences ("detail").
- Choose the best "category": "ai-agent" (an AI agent replaces/augments a human step), "automation" (a non-AI integration/automation removes manual work), "integration" (connect two things that should talk), "consolidation" (replace/merge overlapping tools), "resilience" (single points of failure, missing redundancy), or "cost" (reduce spend).
- Rate "impact" as high, medium, or low.

ALSO fill "preview" with the concrete edit that realises the suggestion, so it can be drawn on the canvas as a faded "after" state and applied in one click. Reference existing nodes by their EXACT label; introduce new nodes in "addNodes" and reference them by the label you gave them.
- "addNodes": new nodes to create — e.g. an "AI agent" or "Integration service" node. Pick the closest "type": app, system, data_source, external_entity (an outside customer/vendor/partner), internal_entity (an in-house team/department/role), cash, group, or custom (use "app" for a SaaS/tool, "system" for an internal service or AI agent).
- "addEdges": new flows. "from"/"to" are node labels (existing or newly-added). "flow" is data, cash, api, manual, event, or custom. "label" can be a short verb phrase or "".
- "removeNodes" / "removeEdges": things to retire (consolidation/resilience). Only reference nodes/flows that exist.
- "updateEdges": flows whose type should change, e.g. a "manual" handoff becoming "api".
- Leave any array empty when the suggestion has no structural change (e.g. a pure cost renegotiation). Prefer additive previews (new nodes/edges) — they are the most useful to follow.

Return 3-6 suggestions, best first. Lead with automation and AI-agent opportunities. If the map is tiny, return fewer but still useful suggestions.`

const NODE_TYPES = [
  'app',
  'system',
  'data_source',
  'external_entity',
  'internal_entity',
  'cash',
  'group',
  'custom',
]
const FLOW_TYPES = ['data', 'cash', 'api', 'manual', 'event', 'custom']

// OpenAI strict mode requires every property to appear in `required` and
// additionalProperties:false everywhere — so the preview's arrays are always
// present (each may be empty).
const PREVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    addNodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          type: { type: 'string', enum: NODE_TYPES },
        },
        required: ['label', 'type'],
      },
    },
    addEdges: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          flow: { type: 'string', enum: FLOW_TYPES },
          label: { type: 'string' },
        },
        required: ['from', 'to', 'flow', 'label'],
      },
    },
    removeNodes: { type: 'array', items: { type: 'string' } },
    removeEdges: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { from: { type: 'string' }, to: { type: 'string' } },
        required: ['from', 'to'],
      },
    },
    updateEdges: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          newFlow: { type: 'string', enum: FLOW_TYPES },
        },
        required: ['from', 'to', 'newFlow'],
      },
    },
  },
  required: ['addNodes', 'addEdges', 'removeNodes', 'removeEdges', 'updateEdges'],
}

const SUGGEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
          category: {
            type: 'string',
            enum: ['ai-agent', 'automation', 'integration', 'consolidation', 'resilience', 'cost'],
          },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
          targets: { type: 'array', items: { type: 'string' } },
          preview: PREVIEW_SCHEMA,
        },
        required: ['title', 'detail', 'category', 'impact', 'targets', 'preview'],
      },
    },
  },
  required: ['suggestions'],
}

/**
 * Ask OpenAI for improvement suggestions for a system map. Uses strict
 * structured outputs so the response is guaranteed to match the schema.
 * Model defaults to gpt-4o; override with OPENAI_MODEL.
 */
export async function suggestForMap(map: MapForAI): Promise<AiSuggestResponse> {
  // Bound the call so it fails cleanly inside Vercel's 30s function limit. No
  // retry — a second attempt would risk blowing past 30s into an opaque 504.
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 24_000, maxRetries: 0 })
  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL ?? 'gpt-4o',
    // Each suggestion now carries a change-set; give headroom before truncation.
    max_completion_tokens: 7000,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `Here is the system map "${map.name}" as JSON:\n\n${JSON.stringify(
          { nodes: map.nodes, edges: map.edges },
          null,
          2,
        )}\n\nSuggest the highest-value improvements, especially automating manual steps and where AI agents would help.`,
      },
    ],
    // Strict structured outputs constrain the response to our schema.
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'suggestions', strict: true, schema: SUGGEST_SCHEMA },
    },
  })

  const choice = response.choices[0]
  if (choice?.message.refusal) {
    throw new HttpError(502, 'The AI declined to answer for this map.')
  }
  const raw = choice?.message.content ?? ''
  try {
    // A truncated (length) or empty response yields invalid JSON — fail clean.
    return aiSuggestResponseSchema.parse(JSON.parse(raw))
  } catch {
    throw new HttpError(502, 'The AI response was incomplete — please try again.')
  }
}
