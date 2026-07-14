import { useEffect, useRef, useState } from 'react'
import Screen from './components/Screen'
import Controls from './components/Controls'
import Library from './components/Library'
import { useWasmBoy } from './hooks/useWasmBoy'
import { useGba } from './hooks/useGba'
import { useJoypad } from './hooks/useJoypad'
import './App.scss'

function coreForFile(name) {
  return /\.gba$/i.test(name) ? 'gba' : 'gb'
}

export default function App() {
  const gbCanvasRef = useRef(null)
  const gbaCanvasRef = useRef(null)
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [status, setStatus] = useState('')
  const [activeCore, setActiveCore] = useState(null)

  const gb = useWasmBoy(gbCanvasRef)
  const gba = useGba(gbaCanvasRef)
  const active = activeCore === 'gba' ? gba : gb

  const { isReady, isPlaying, currentRom, error, togglePlay, reset, saveToCloud, loadFromCloud, setJoypad } = active
  const { press, release } = useJoypad(setJoypad)

  useEffect(() => {
    // iOS Safari only applies :active styles promptly (and treats taps as
    // fully "live") on pages with a touchstart listener. Without this,
    // button feedback — and the resulting input — lags by ~300ms.
    const noop = () => {}
    document.body.addEventListener('touchstart', noop, { passive: true })
    return () => document.body.removeEventListener('touchstart', noop)
  }, [])

  const flash = (msg) => {
    setStatus(msg)
    setTimeout(() => setStatus(''), 2000)
  }

  const handleSelectRom = async (romMeta, url) => {
    const core = coreForFile(romMeta.name)
    setActiveCore(core)
    const target = core === 'gba' ? gba : gb
    await target.loadRom(romMeta, url)
    setLibraryOpen(false)
  }

  const handleSave = async () => {
    try {
      await saveToCloud('manual')
      flash('Partie sauvegardée')
    } catch {
      flash("Échec de la sauvegarde")
    }
  }

  const handleLoad = async () => {
    try {
      await loadFromCloud('manual')
      flash('Partie chargée')
    } catch {
      flash('Aucune sauvegarde trouvée')
    }
  }

  return (
    <div className="app-shell">
      {libraryOpen && <div className="library-backdrop" onClick={() => setLibraryOpen(false)} />}
      <aside className={`library-panel ${libraryOpen ? 'open' : ''}`}>
        <Library onSelectRom={handleSelectRom} currentRomId={currentRom?.id} onClose={() => setLibraryOpen(false)} />
      </aside>

      <main className="console-stage">
        {!libraryOpen && (
          <button className="library-fab" onClick={() => setLibraryOpen(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <rect x="8" y="6" width="8" height="4" rx="1" />
              <line x1="8" y1="14" x2="16" y2="14" strokeLinecap="round" />
            </svg>
            Bibliothèque
          </button>
        )}

        <div className="dmg-shell">
          <div className="dmg-top">
            <div className="dmg-brand">PaLaMa <span>GameB</span></div>
            <div className="dmg-screen-frame">
              <Screen
                gbCanvasRef={gbCanvasRef}
                gbaCanvasRef={gbaCanvasRef}
                activeCore={activeCore}
                isReady={isReady}
                error={error}
                placeholderText={currentRom ? 'Chargement…' : 'Choisis une ROM dans la bibliothèque'}
              />
            </div>
            <div className="dmg-indicator-row">
              <span className={`power-led ${isReady ? 'on' : ''}`} />
              <span className="dmg-model">{activeCore === 'gba' ? 'AGB-001' : 'DMG-01'}</span>
            </div>
          </div>

          <div className="dmg-body">
            <Controls press={press} release={release} disabled={!isReady} showShoulders={activeCore === 'gba'} />

            <div className="dmg-transport">
              <button onClick={togglePlay} disabled={!isReady}>{isPlaying ? 'Pause' : 'Play'}</button>
              <button onClick={reset} disabled={!isReady}>Reset</button>
              <button onClick={handleSave} disabled={!isReady}>Sauver</button>
              <button onClick={handleLoad} disabled={!isReady}>Charger</button>
            </div>
          </div>
        </div>

        {status && <div className="toast">{status}</div>}
      </main>
    </div>
  )
}
