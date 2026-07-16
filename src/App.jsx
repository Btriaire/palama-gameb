import { useEffect, useRef, useState } from 'react'
import Screen from './components/Screen'
import Controls from './components/Controls'
import Library from './components/Library'
import AdminPanel, { loadSettings } from './components/AdminPanel'
import { useWasmBoy } from './hooks/useWasmBoy'
import { useGba } from './hooks/useGba'
import { useJoypad } from './hooks/useJoypad'
import { useWakeLock } from './hooks/useWakeLock'
import './App.scss'

function coreForFile(name) {
  return /\.gba$/i.test(name) ? 'gba' : 'gb'
}

const SKINS = ['grey', 'yellow', 'blue', 'green', 'berry', 'clear', 'orange']
const LONG_PRESS_MS = 600

// A press-and-hold helper for the two hidden buttons (power LED → shell
// color, logo → library) — returns onPointerDown/Up/Leave handlers that
// fire `onLongPress` only past LONG_PRESS_MS, so a normal tap is unaffected.
function useLongPress(onLongPress) {
  const timerRef = useRef(null)
  const firedRef = useRef(false)

  const start = () => {
    firedRef.current = false
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onLongPress()
    }, LONG_PRESS_MS)
  }
  const cancel = () => {
    clearTimeout(timerRef.current)
  }

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e) => e.preventDefault(),
  }
}

export default function App() {
  const gbCanvasRef = useRef(null)
  const gbaCanvasRef = useRef(null)
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [status, setStatus] = useState('')
  const [activeCore, setActiveCore] = useState(null)
  const [skin, setSkin] = useState(() => localStorage.getItem('palama-gameb-skin') || 'grey')
  const [adminOpen, setAdminOpen] = useState(false)
  const [settings, setSettings] = useState(loadSettings)

  const gb = useWasmBoy(gbCanvasRef)
  const gba = useGba(gbaCanvasRef)
  const active = activeCore === 'gba' ? gba : gb

  const { isReady, isPlaying, currentRom, error, togglePlay, reset, saveToCloud, loadFromCloud } = active
  // GB/GBC uses WasmBoy's own built-in input handling (see Controls.jsx) —
  // this custom press/release pipeline is only wired up for GBA.
  const { press, release } = useJoypad(gba.setJoypad, activeCore === 'gba')
  useWakeLock(isPlaying)

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

  const cycleSkin = () => {
    const next = SKINS[(SKINS.indexOf(skin) + 1) % SKINS.length]
    setSkin(next)
    localStorage.setItem('palama-gameb-skin', next)
    flash(`Coque : ${next === 'grey' ? 'DMG-01 classique' : next}`)
  }

  const powerLedPress = useLongPress(cycleSkin)
  const logoPress = useLongPress(() => setLibraryOpen(true))

  // Turbo speed + FPS HUD only apply to WasmBoy (GB/GBC) — gba-kit has no
  // equivalent speed-multiplier API.
  useEffect(() => {
    if (activeCore !== 'gb' || !isReady) return
    gb.setSpeed(settings.turboSpeed)
  }, [activeCore, isReady, settings.turboSpeed])

  const [fps, setFps] = useState(0)
  useEffect(() => {
    if (activeCore !== 'gb' || !isReady || !settings.debugHud) return
    const id = setInterval(() => setFps(Math.round(gb.getFPS())), 500)
    return () => clearInterval(id)
  }, [activeCore, isReady, settings.debugHud])

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

  const filterStyle = [
    `brightness(${settings.brightness}%)`,
    `contrast(${settings.contrast}%)`,
    `saturate(${settings.saturation}%)`,
    settings.sepiaRetro ? 'sepia(.75) hue-rotate(-8deg)' : '',
  ].filter(Boolean).join(' ')

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

        <div className={`dmg-shell skin-${skin}`}>
          <div className="dmg-top">
            <div className="dmg-brand" {...logoPress}>PaLaMa <span>GameB</span></div>
            <div className={`dmg-screen-frame ${settings.crtCurvature ? 'crt-curvature' : ''}`}>
              <Screen
                gbCanvasRef={gbCanvasRef}
                gbaCanvasRef={gbaCanvasRef}
                activeCore={activeCore}
                isReady={isReady}
                error={error}
                placeholderText={currentRom ? 'Chargement…' : 'Choisis une ROM dans la bibliothèque'}
                filterStyle={filterStyle}
                scanlines={settings.scanlines}
                pixelSharp={settings.pixelSharp}
                fps={activeCore === 'gb' && settings.debugHud ? fps : null}
              />
            </div>
            <div className="dmg-indicator-row">
              <span className="power-led-hit" {...powerLedPress}>
                <span className={`power-led ${isReady ? 'on' : ''}`} />
              </span>
              <span className="dmg-model">{activeCore === 'gba' ? 'AGB-001' : 'DMG-01'}</span>
            </div>
          </div>

          <div className="dmg-body">
            <Controls press={press} release={release} disabled={!isReady} core={activeCore} leftHanded={settings.leftHanded} />

            <div className="dmg-transport">
              <button onClick={togglePlay} disabled={!isReady}>{isPlaying ? 'Pause' : 'Play'}</button>
              <button onClick={reset} disabled={!isReady}>Reset</button>
              <button onClick={handleSave} disabled={!isReady}>Sauver</button>
              <button onClick={handleLoad} disabled={!isReady}>Charger</button>
            </div>
          </div>
        </div>

        <button className="admin-fab" onClick={() => setAdminOpen(true)} aria-label="Paramètres">⚙</button>

        {status && <div className="toast">{status}</div>}
      </main>

      {adminOpen && (
        <AdminPanel settings={settings} onChange={setSettings} onClose={() => setAdminOpen(false)} />
      )}
    </div>
  )
}
