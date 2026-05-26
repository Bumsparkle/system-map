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
  // Focus mode (spec v1.1 §3): dim everything not connected to the focused node.
  focusEnabled: boolean
  toggleFocusEnabled: () => void
  hoverNodeId: string | null
  setHoverNode: (id: string | null) => void
  // Command palette (spec v1.1 §4)
  commandOpen: boolean
  setCommandOpen: (open: boolean) => void
  // Cross-component request to open the "Save view" dialog (from the command palette)
  saveViewRequested: boolean
  requestSaveView: () => void
  clearSaveViewRequest: () => void
  // Presentation mode (spec v1.1 §7)
  presenting: boolean
  setPresenting: (presenting: boolean) => void
  togglePresenting: () => void
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
  focusEnabled: true,
  toggleFocusEnabled: () => set((s) => ({ focusEnabled: !s.focusEnabled, hoverNodeId: null })),
  hoverNodeId: null,
  setHoverNode: (hoverNodeId) => set({ hoverNodeId }),
  commandOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  saveViewRequested: false,
  requestSaveView: () => set({ saveViewRequested: true }),
  clearSaveViewRequest: () => set({ saveViewRequested: false }),
  presenting: false,
  setPresenting: (presenting) => set({ presenting }),
  togglePresenting: () => set((s) => ({ presenting: !s.presenting })),
}))
