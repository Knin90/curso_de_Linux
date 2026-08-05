import { NavLink } from 'react-router-dom'
import { levels, stages } from '../registry'

const stageColors = {
  1: 'text-terminal-green border-terminal-green',
  2: 'text-terminal-cyan border-terminal-cyan',
  3: 'text-terminal-yellow border-terminal-yellow',
  4: 'text-terminal-red border-terminal-red',
}

const totalLevels = 38
const availableCount = levels.filter(l => l.status === 'available').length
const progressPercent = (availableCount / totalLevels) * 100

export default function Sidebar() {
  return (
    <aside className="w-64 bg-terminal-surface border-r border-terminal-border flex flex-col overflow-hidden">
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <span
            className="text-terminal-green font-mono text-xl font-bold"
            style={{ textShadow: '0 0 12px rgba(63,185,80,0.6)' }}
          >
            $
          </span>
          <span className="font-bold text-terminal-text">Linux Mastery</span>
          <span className="ml-auto text-[10px] text-terminal-muted bg-terminal-border/60 px-1.5 py-0.5 rounded font-mono">
            v1.0
          </span>
        </div>
        <p className="text-xs text-terminal-muted mt-1 font-mono">38 niveles · 7 etapas</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {stages.map(stage => {
          const stageLevels = levels.filter(l => l.stage === stage.id)
          if (stageLevels.length === 0) return null
          const colorClass = stageColors[stage.id] || 'text-terminal-muted border-terminal-muted'
          const [textColor, borderColor] = colorClass.split(' ')
          return (
            <div key={stage.id} className="mb-2">
              <div className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${textColor}`}>
                <span className={`w-0.5 h-3 rounded-full ${borderColor.replace('border-', 'bg-')} opacity-70`} />
                Etapa {stage.id} · {stage.title}
              </div>
              {stageLevels.map(level => (
                <NavLink
                  key={level.id}
                  to={level.status === 'available' ? `/nivel/${level.id}` : '#'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 text-sm transition-all border-l-2 ${
                      level.status !== 'available'
                        ? 'text-terminal-muted cursor-not-allowed opacity-40 border-transparent'
                        : isActive
                        ? 'bg-gradient-to-r from-terminal-green/10 to-transparent border-terminal-green text-terminal-green'
                        : 'text-terminal-text/80 border-transparent hover:bg-terminal-surface/80 hover:border-terminal-border hover:text-terminal-text'
                    }`
                  }
                >
                  <span className="font-mono text-xs text-terminal-muted bg-terminal-border/50 px-1.5 rounded w-6 text-center">
                    {level.id}
                  </span>
                  <span className="flex-1 truncate">{level.title}</span>
                  {level.status === 'coming-soon' && (
                    <span className="text-xs text-terminal-muted/60">pronto</span>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      <div className="p-4 border-t border-terminal-border">
        <div className="text-xs text-terminal-muted font-mono mb-2">
          {availableCount} / {totalLevels} niveles
        </div>
        <div className="h-1 bg-terminal-green/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-terminal-green rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </aside>
  )
}
