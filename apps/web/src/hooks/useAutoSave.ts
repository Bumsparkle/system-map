import { saveDiagram, serializeDiagram } from '@/lib/autoSave'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import { useEffect } from 'react'

const DEMO = import.meta.env.VITE_DEMO === '1'
const DEBOUNCE_MS = 800

/**
 * Watches the diagram store and persists changes via the bulk-save endpoint,
 * debounced by 800ms. The store is the optimistic source of truth; this just
 * flushes it to the server in the background. Disabled in the read-only demo.
 */
export function useAutoSave() {
  const diagramId = useDiagramStore((s) => s.diagramId)
  const hydrated = useDiagramStore((s) => s.hydrated)
  const setSaveStatus = useUiStore((s) => s.setSaveStatus)

  useEffect(() => {
    if (DEMO || !diagramId || !hydrated) return

    // Baseline = the just-hydrated state, so loading never triggers a save.
    let lastJson = JSON.stringify(serializeDiagram(useDiagramStore.getState()))
    let timer: ReturnType<typeof setTimeout> | undefined

    const unsubscribe = useDiagramStore.subscribe((state) => {
      if (state.diagramId !== diagramId || !state.hydrated) return
      const payload = serializeDiagram(state)
      const json = JSON.stringify(payload)
      if (json === lastJson) return // only persistable changes get here
      lastJson = json
      setSaveStatus('saving')
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        saveDiagram(diagramId, payload)
          .then(() => setSaveStatus('saved'))
          .catch(() => setSaveStatus('error'))
      }, DEBOUNCE_MS)
    })

    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [diagramId, hydrated, setSaveStatus])
}
