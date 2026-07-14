import { useEffect, useState } from 'react'
import { subscribeDebug } from '../utils/debugLog'

export default function DebugPanel() {
  const [lines, setLines] = useState([])
  const [open, setOpen] = useState(true)

  useEffect(() => subscribeDebug(setLines), [])

  return (
    <div className="debug-panel">
      <button className="debug-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Debug ▾' : 'Debug ▸'}
      </button>
      {open && (
        <pre className="debug-lines">
          {lines.length === 0 ? '(rien pour le moment)' : lines.join('\n')}
        </pre>
      )}
    </div>
  )
}
