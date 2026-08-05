import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import LevelPage from './pages/LevelPage'
import ModulePage from './pages/ModulePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="nivel/:levelId" element={<LevelPage />} />
      <Route path="nivel/:levelId/modulo/:moduleId" element={<ModulePage />} />
    </Routes>
  )
}
