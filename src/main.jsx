import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Restauración de scroll controlada por la app: al volver (atrás/adelante)
// entre niveles se conserva la posición del nivel anterior; las entradas
// normales («Siguiente nivel») arrancan desde arriba. Se desactiva la
// restauración nativa del navegador para que no compita con la nuestra.
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
