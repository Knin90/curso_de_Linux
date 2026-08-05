import { useLocation, Link } from 'react-router-dom'
import { getLevel } from '../registry'

export default function TopBar() {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)

  return (
    <div>
      <header className="h-12 bg-terminal-surface flex items-center px-6 gap-2 text-sm font-mono">
        <span className="text-terminal-muted/50 mr-1">❯</span>
        <Link to="/" className="text-terminal-muted hover:text-terminal-text transition-colors">~</Link>
        {parts.map((part, i) => {
          if (part === 'nivel' || part === 'modulo') return null
          const isLevel = parts[i - 1] === 'nivel'
          const level = isLevel ? getLevel(part) : null
          return (
            <span key={i} className="flex items-center gap-2">
              <span className="text-terminal-green/30">/</span>
              <span className={isLevel ? 'text-terminal-green' : 'text-terminal-cyan'}>
                {level ? `nivel-${level.id}` : part}
              </span>
            </span>
          )
        })}
      </header>
      <div className="h-[1px] bg-gradient-to-r from-terminal-green/30 via-terminal-cyan/20 to-transparent" />
    </div>
  )
}
