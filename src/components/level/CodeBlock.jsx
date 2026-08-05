import { useState } from 'react'

function highlightLine(line, i) {
  const t = line.trimStart()
  const pre = line.slice(0, line.length - t.length)
  if (t.startsWith('#')) {
    return (
      <div key={i} className="cl">
        <span className="c">{pre}{t}</span>
      </div>
    )
  }
  const idx = line.indexOf(' #')
  if (idx > 0) {
    return (
      <div key={i} className="cl">
        {line.slice(0, idx)}
        <span className="c">{line.slice(idx)}</span>
      </div>
    )
  }
  return <div key={i} className="cl">{line}</div>
}

export default function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false)

  const fallbackCopy = () => {
    const ta = document.createElement('textarea')
    ta.value = code
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } catch {
      /* noop */
    }
    document.body.removeChild(ta)
  }

  const handleCopy = async () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(code)
      } catch {
        fallbackCopy()
      }
    } else {
      fallbackCopy()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="code-block">
      <div className="code-head">
        <span className="code-lang">{lang || 'texto'}</span>
        <button className={`copy-btn${copied ? ' done' : ''}`} type="button" onClick={handleCopy}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre>{code.split('\n').map(highlightLine)}</pre>
    </div>
  )
}
