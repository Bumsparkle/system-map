import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import { DashboardPage } from './pages/DashboardPage'
import { EditorPage } from './pages/EditorPage'
import { PortfolioPage } from './pages/PortfolioPage'

// The portfolio needs the backend; the static demo build has none.
const DEMO = import.meta.env.VITE_DEMO === '1'

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/portfolio" element={DEMO ? <Navigate to="/" replace /> : <PortfolioPage />} />
        <Route path="/diagrams/:diagramId" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  )
}
