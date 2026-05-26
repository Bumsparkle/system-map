// Cycled when creating new layers so each gets a distinct indicator color.
export const LAYER_COLORS = [
  '#D4471F', // accent / burnt sienna
  '#047857', // emerald
  '#4F46E5', // indigo
  '#B45309', // amber
  '#A21CAF', // fuchsia
  '#0891B2', // cyan
  '#CA8A04', // gold
  '#475569', // slate
]

export function nextLayerColor(count: number): string {
  return LAYER_COLORS[count % LAYER_COLORS.length] ?? '#D4471F'
}
