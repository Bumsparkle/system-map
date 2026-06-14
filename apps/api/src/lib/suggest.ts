import Anthropic from '@anthropic-ai/sdk'
import { type AiSuggestResponse, aiSuggestResponseSchema } from '@system-map/shared'
import { env } from '../env.js'

/** True when AI suggestions are wired up (ANTHROPIC_API_KEY set). */
export function aiConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY)
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

Return 4-8 suggestions, best first. Lead with automation and AI-agent opportunities. If the map is tiny, return fewer but still useful suggestions.`

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
        },
        required: ['title', 'detail', 'category', 'impact', 'targets'],
      },
    },
  },
  required: ['suggestions'],
}

/**
 * Ask Claude for improvement suggestions for a system map. Uses structured
 * outputs so the response is guaranteed to match the schema. Model: Opus 4.8.
 */
export async function suggestForMap(map: MapForAI): Promise<AiSuggestResponse> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Here is the system map "${map.name}" as JSON:\n\n${JSON.stringify(
          { nodes: map.nodes, edges: map.edges },
          null,
          2,
        )}\n\nSuggest the highest-value improvements, especially automating manual steps and where AI agents would help.`,
      },
    ],
    // Structured outputs (GA): constrain the response to our schema.
    output_config: { format: { type: 'json_schema', schema: SUGGEST_SCHEMA } },
  } as Anthropic.MessageCreateParamsNonStreaming)

  const text = response.content.find((b) => b.type === 'text')
  const raw = text && 'text' in text ? text.text : '{"suggestions":[]}'
  return aiSuggestResponseSchema.parse(JSON.parse(raw))
}
