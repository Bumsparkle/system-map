import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { EditorPage } from './pages/EditorPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/diagrams/:diagramId" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
