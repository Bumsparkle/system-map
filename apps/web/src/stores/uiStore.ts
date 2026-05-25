import { create } from 'zustand'

type UiStore = {
  dotGrid: boolean
  toggleDotGrid: () => void
  showMinimap: boolean
  toggleMinimap: () => void
  // Node briefly flashed after being dropped from the palette (spec §10).
  justAddedNodeId: string | null
  flashNode: (id: string) => void
}

export const useUiStore = create<UiStore>((set) => ({
  dotGrid: false,
  toggleDotGrid: () => set((s) => ({ dotGrid: !s.dotGrid })),
  showMinimap: false,
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
  justAddedNodeId: null,
  flashNode: (id) => {
    set({ justAddedNodeId: id })
    setTimeout(() => {
      set((s) => (s.justAddedNodeId === id ? { justAddedNodeId: null } : {}))
    }, 600)
  },
}))
