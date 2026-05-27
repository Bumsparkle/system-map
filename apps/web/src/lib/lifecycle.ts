import type { NodeLifecycle } from '@system-map/shared'

export type LifecycleDeltaStyle = {
  /** Left-edge accent override in Delta view (null = keep the node's normal bar). */
  bar: string | null
  /** Pill text (null = no pill). */
  label: string | null
  /** Node opacity in Delta view — existing is de-emphasised; new/modifying full. */
  opacity: number
}

/** Per-lifecycle visual treatment for the Delta view (spec v1.3 §3.3). */
export const LIFECYCLE_DELTA: Record<NodeLifecycle, LifecycleDeltaStyle> = {
  existing: { bar: null, label: null, opacity: 0.6 },
  new: { bar: 'var(--color-flow-cash)', label: 'NEW', opacity: 1 },
  retiring: { bar: 'var(--color-status-retiring)', label: 'RETIRING', opacity: 0.85 },
  replacing: { bar: 'var(--color-status-retiring)', label: 'REPLACING →', opacity: 0.85 },
  modifying: { bar: 'var(--color-flow-manual)', label: 'MODIFYING', opacity: 1 },
}
