import { useDiagramStore } from '@/stores/diagramStore'
import { useReactFlow } from '@xyflow/react'
import { useHotkeys } from 'react-hotkeys-hook'

// Cmd/Ctrl shortcuts (spec §11). Delete/Backspace is handled by React Flow's
// deleteKeyCode; Space+drag pan by panActivationKeyCode. Hotkeys are ignored
// while typing in inputs (react-hotkeys-hook default).
export function useKeyboardShortcuts() {
  const { fitView } = useReactFlow()
  const duplicateSelected = useDiagramStore((s) => s.duplicateSelected)

  useHotkeys('mod+z', () => useDiagramStore.temporal.getState().undo(), { preventDefault: true })
  useHotkeys('mod+shift+z', () => useDiagramStore.temporal.getState().redo(), {
    preventDefault: true,
  })
  useHotkeys('mod+y', () => useDiagramStore.temporal.getState().redo(), { preventDefault: true })
  useHotkeys('mod+d', () => duplicateSelected(), { preventDefault: true }, [duplicateSelected])
  useHotkeys('mod+0', () => fitView({ duration: 200, padding: 0.3 }), { preventDefault: true }, [
    fitView,
  ])
}
