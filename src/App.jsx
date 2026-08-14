import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'

// Code-splitting: las páginas de nivel (con todo el contenido markdown)
// se cargan bajo demanda; la landing queda con el chunk ligero.
const LevelPage = lazy(() => import('./pages/LevelPage'))
const ModulePage = lazy(() => import('./pages/ModulePage'))

function PageFallback() {
  return (
    <div
      className="level-page"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 13.5,
        color: 'var(--muted)',
        letterSpacing: '0.04em',
      }}
    >
      cargando…
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="nivel/:levelId"
        element={
          <Suspense fallback={<PageFallback />}>
            <LevelPage />
          </Suspense>
        }
      />
      <Route
        path="nivel/:levelId/modulo/:moduleId"
        element={
          <Suspense fallback={<PageFallback />}>
            <ModulePage />
          </Suspense>
        }
      />
    </Routes>
  )
}
