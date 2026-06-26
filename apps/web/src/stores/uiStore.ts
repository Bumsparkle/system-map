import type { PreviewDelta } from '@/lib/previewDelta'
import { create } from 'zustand'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/** Current/future-state view toggle (spec v1.3 §3). */
export type DiagramStateView = 'current' | 'future' | 'delta'

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
  // Minor wins (spec v1.1 §8)
  highlightOrphans: boolean
  setHighlightOrphans: (on: boolean) => void
  editingNodeId: string | null
  setEditingNode: (id: string | null) => void
  // Node type currently being dragged from the palette (tints the canvas drop zone).
  paletteDragType: string | null
  setPaletteDragType: (type: string | null) => void
  // App nodes whose vendor lookup is in flight — drives the shimmer (spec v1.2 §4.2).
  vendorLoadingIds: string[]
  setVendorLoading: (id: string, loading: boolean) => void
  // Current/future-state toggle (spec v1.3 §3). Persisted per-diagram by useUrlSync.
  diagramState: DiagramStateView
  setDiagramState: (state: DiagramStateView) => void
  // Faded "after" preview of an AI suggestion drawn over the canvas. Session-only;
  // null when nothing is being previewed. Cleared on Apply/Discard and on unmount.
  previewDelta: PreviewDelta | null
  setPreviewDelta: (delta: PreviewDelta | null) => void
  // Live (un-tracked) waypoints while a bend handle is being dragged, so the path
  // follows the cursor without polluting undo history — committed once on release.
  edgeWaypointDraft: { edgeId: string; waypoints: { x: number; y: number }[] } | null
  setEdgeWaypointDraft: (
    draft: { edgeId: string; waypoints: { x: number; y: number }[] } | null,
  ) => void
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
  highlightOrphans: false,
  setHighlightOrphans: (highlightOrphans) => set({ highlightOrphans }),
  editingNodeId: null,
  setEditingNode: (editingNodeId) => set({ editingNodeId }),
  paletteDragType: null,
  setPaletteDragType: (paletteDragType) => set({ paletteDragType }),
  vendorLoadingIds: [],
  setVendorLoading: (id, loading) =>
    set((s) => ({
      vendorLoadingIds: loading
        ? s.vendorLoadingIds.includes(id)
          ? s.vendorLoadingIds
          : [...s.vendorLoadingIds, id]
        : s.vendorLoadingIds.filter((x) => x !== id),
    })),
  diagramState: 'current',
  setDiagramState: (diagramState) => set({ diagramState }),
  previewDelta: null,
  setPreviewDelta: (previewDelta) => set({ previewDelta }),
  edgeWaypointDraft: null,
  setEdgeWaypointDraft: (edgeWaypointDraft) => set({ edgeWaypointDraft }),
}))
