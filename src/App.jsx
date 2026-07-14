import { useRef, useState } from 'react'
import Screen from './components/Screen'
import Controls from './components/Controls'
import Library from './components/Library'
import { useWasmBoy } from './hooks/useWasmBoy'
import { useJoypad } from './hooks/useJoypad'
import './App.scss'

export default function App() {
  const canvasRef = useRef(null)
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [status, setStatus] = useState('')
  const {
    isReady, isPlaying, currentRom, error,
    loadRom, togglePlay, reset, saveToCloud, loadFromCloud, setJoypad,
  } = useWasmBoy(canvasRef)
  const { press, release } = useJoypad(setJoypad)

  const flash = (msg) => {
    setStatus(msg)
    setTimeout(() => setStatus(''), 2000)
  }

  const handleSelectRom = async (romMeta, url) => {
    await loadRom(romMeta, url)
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
      <aside className={`library-panel ${libraryOpen ? 'open' : ''}`}>
        <Library onSelectRom={handleSelectRom} currentRomId={currentRom?.id} />
      </aside>

      <main className="console-stage">
        <button className="library-toggle" onClick={() => setLibraryOpen((v) => !v)}>
          {libraryOpen ? '‹ Fermer' : '☰ Bibliothèque'}
        </button>

        <div className="dmg-shell">
          <div className="dmg-top">
            <div className="dmg-brand">PaLaMa <span>GameB</span></div>
            <div className="dmg-screen-frame">
              <Screen
                canvasRef={canvasRef}
                isReady={isReady}
                error={error}
                placeholderText={currentRom ? 'Chargement…' : 'Choisis une ROM dans la bibliothèque'}
              />
            </div>
            <div className="dmg-indicator-row">
              <span className={`power-led ${isReady ? 'on' : ''}`} />
              <span className="dmg-model">DMG-01</span>
            </div>
          </div>

          <div className="dmg-body">
            <Controls press={press} release={release} disabled={!isReady} />

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
