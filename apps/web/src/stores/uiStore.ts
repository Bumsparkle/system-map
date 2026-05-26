import { create } from 'zustand'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type UiStore = {
  dotGrid: boolean
  toggleDotGrid: () => void
  showMinimap: boolean
  toggleMinimap: () => void
  paletteCollapsed: boolean
  togglePalette: () => void
  inspectorCollapsed: boolean
  toggleInspector: () => void
  // Node briefly flashed after being dropped from the palette (spec §10).
  justAddedNodeId: string | null
  flashNode: (id: string) => void
  saveStatus: SaveStatus
  setSaveStatus: (status: SaveStatus) => void
}

export const useUiStore = create<UiStore>((set) => ({
  dotGrid: false,
  toggleDotGrid: () => set((s) => ({ dotGrid: !s.dotGrid })),
  showMinimap: false,
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
  paletteCollapsed: false,
  togglePalette: () => set((s) => ({ paletteCollapsed: !s.paletteCollapsed })),
  inspectorCollapsed: false,
  toggleInspector: () => set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),
  justAddedNodeId: null,
  flashNode: (id) => {
    set({ justAddedNodeId: id })
    setTimeout(() => {
      set((s) => (s.justAddedNodeId === id ? { justAddedNodeId: null } : {}))
    }, 600)
  },
  saveStatus: 'idle',
  setSaveStatus: (saveStatus) => set({ saveStatus }),
}))
