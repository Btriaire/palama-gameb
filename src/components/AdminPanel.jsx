import { useEffect, useState } from 'react'

const STORAGE_KEY = 'palama-gameb-settings'

export const DEFAULT_SETTINGS = {
  // --- Vidéo (en partie réelles) ---
  brightness: 100,
  contrast: 100,
  saturation: 100,
  scanlines: false,
  crtCurvature: false,
  sepiaRetro: false,
  pixelSharp: true,
  vsync: true,
  antiAliasing: false,
  autoNightMode: false,
  internalResolution: '160×144 native',
  // --- Audio ---
  volume: 80,
  muted: false,
  stereoBalance: 0,
  bass: 50,
  mid: 50,
  treble: 50,
  audioQuality: '16-bit',
  // --- Entrées (en partie réelles) ---
  leftHanded: false,
  touchSensitivity: 70,
  vibration: true,
  deadzone: 12,
  controllerLayout: 'Classique',
  // --- Émulation ---
  turboSpeed: 1,
  frameSkip: 0,
  overclock: 100,
  rewindBuffer: 30,
  autoSaveState: true,
  region: 'PAL/EU',
  biosSkip: true,
  // --- Réseau ---
  cloudSync: true,
  simulatedLatency: 0,
  offlineMode: false,
  compressionLevel: 6,
  // --- Système ---
  batterySaver: false,
  debugHud: false,
  telemetry: false,
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // storage full/disabled — settings just won't persist, not worth surfacing
  }
}

const SERIAL = 'DMG-' + Math.random().toString(36).slice(2, 8).toUpperCase()

function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <label className="admin-row">
      <span className="admin-label">{label}</span>
      <span className="admin-control">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))} />
        <span className="admin-value">{value}{unit}</span>
      </span>
    </label>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="admin-row">
      <span className="admin-label">{label}</span>
      <span className={`admin-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <span className="admin-toggle-knob" />
      </span>
    </label>
  )
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="admin-row">
      <span className="admin-label">{label}</span>
      <select className="admin-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

export default function AdminPanel({ settings, onChange, onClose }) {
  const [cpuTemp, setCpuTemp] = useState(42)
  const [tab, setTab] = useState('video')

  useEffect(() => {
    const id = setInterval(() => setCpuTemp((t) => Math.max(38, Math.min(61, t + (Math.random() * 4 - 2)))), 1500)
    return () => clearInterval(id)
  }, [])

  const set = (key) => (value) => {
    const next = { ...settings, [key]: value }
    onChange(next)
    saveSettings(next)
  }

  const resetAll = () => {
    if (!confirm('Réinitialiser tous les paramètres aux valeurs d\'usine ?')) return
    onChange({ ...DEFAULT_SETTINGS })
    saveSettings(DEFAULT_SETTINGS)
  }

  const tabs = [
    ['video', 'Vidéo'],
    ['audio', 'Audio'],
    ['input', 'Entrées'],
    ['emu', 'Émulation'],
    ['network', 'Réseau'],
    ['system', 'Système'],
  ]

  return (
    <div className="admin-backdrop" onClick={onClose}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="admin-header">
          <h2>⚙ Panneau Admin</h2>
          <button className="admin-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="admin-tabs">
          {tabs.map(([id, label]) => (
            <button key={id} className={`admin-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="admin-body">
          {tab === 'video' && (
            <>
              <Slider label="Luminosité" value={settings.brightness} min={50} max={150} unit="%" onChange={set('brightness')} />
              <Slider label="Contraste" value={settings.contrast} min={50} max={150} unit="%" onChange={set('contrast')} />
              <Slider label="Saturation" value={settings.saturation} min={0} max={200} unit="%" onChange={set('saturation')} />
              <Toggle label="Scanlines CRT" checked={settings.scanlines} onChange={set('scanlines')} />
              <Toggle label="Courbure d'écran CRT" checked={settings.crtCurvature} onChange={set('crtCurvature')} />
              <Toggle label="Teinte sépia rétro" checked={settings.sepiaRetro} onChange={set('sepiaRetro')} />
              <Toggle label="Pixels nets (sans flou)" checked={settings.pixelSharp} onChange={set('pixelSharp')} />
              <Toggle label="Synchronisation verticale" checked={settings.vsync} onChange={set('vsync')} />
              <Toggle label="Anti-aliasing" checked={settings.antiAliasing} onChange={set('antiAliasing')} />
              <Toggle label="Mode nuit automatique" checked={settings.autoNightMode} onChange={set('autoNightMode')} />
              <div className="admin-row">
                <span className="admin-label">Résolution interne</span>
                <span className="admin-static">{settings.internalResolution}</span>
              </div>
            </>
          )}

          {tab === 'audio' && (
            <>
              <Slider label="Volume principal" value={settings.volume} min={0} max={100} unit="%" onChange={set('volume')} />
              <Toggle label="Muet" checked={settings.muted} onChange={set('muted')} />
              <Slider label="Balance stéréo" value={settings.stereoBalance} min={-50} max={50} onChange={set('stereoBalance')} />
              <Slider label="Basses" value={settings.bass} min={0} max={100} unit="%" onChange={set('bass')} />
              <Slider label="Médiums" value={settings.mid} min={0} max={100} unit="%" onChange={set('mid')} />
              <Slider label="Aigus" value={settings.treble} min={0} max={100} unit="%" onChange={set('treble')} />
              <Select label="Qualité audio" value={settings.audioQuality} options={['8-bit', '16-bit', '24-bit HD']} onChange={set('audioQuality')} />
            </>
          )}

          {tab === 'input' && (
            <>
              <Toggle label="Mode gaucher (inverse la disposition)" checked={settings.leftHanded} onChange={set('leftHanded')} />
              <Slider label="Sensibilité tactile" value={settings.touchSensitivity} min={0} max={100} unit="%" onChange={set('touchSensitivity')} />
              <Toggle label="Vibration (retour haptique)" checked={settings.vibration} onChange={set('vibration')} />
              <Slider label="Zone morte des diagonales" value={settings.deadzone} min={0} max={40} unit="%" onChange={set('deadzone')} />
              <Select label="Disposition manette" value={settings.controllerLayout} options={['Classique', 'SNES-like', 'Arcade', 'Compacte']} onChange={set('controllerLayout')} />
            </>
          )}

          {tab === 'emu' && (
            <>
              <Select label="Vitesse turbo" value={String(settings.turboSpeed)} options={['1', '2', '4', '8']} onChange={(v) => set('turboSpeed')(Number(v))} />
              <Slider label="Frame skip" value={settings.frameSkip} min={0} max={5} onChange={set('frameSkip')} />
              <Slider label="Overclock CPU" value={settings.overclock} min={100} max={400} unit="%" onChange={set('overclock')} />
              <Slider label="Buffer de rembobinage" value={settings.rewindBuffer} min={0} max={120} unit="s" onChange={set('rewindBuffer')} />
              <Toggle label="Sauvegarde auto (état)" checked={settings.autoSaveState} onChange={set('autoSaveState')} />
              <Select label="Région console" value={settings.region} options={['PAL/EU', 'NTSC/US', 'NTSC-J/JAP']} onChange={set('region')} />
              <Toggle label="Ignorer le BIOS au démarrage" checked={settings.biosSkip} onChange={set('biosSkip')} />
            </>
          )}

          {tab === 'network' && (
            <>
              <Toggle label="Synchronisation cloud" checked={settings.cloudSync} onChange={set('cloudSync')} />
              <Slider label="Latence simulée" value={settings.simulatedLatency} min={0} max={500} unit="ms" onChange={set('simulatedLatency')} />
              <Toggle label="Mode hors-ligne forcé" checked={settings.offlineMode} onChange={set('offlineMode')} />
              <Slider label="Niveau de compression" value={settings.compressionLevel} min={0} max={9} onChange={set('compressionLevel')} />
            </>
          )}

          {tab === 'system' && (
            <>
              <div className="admin-row"><span className="admin-label">Version firmware</span><span className="admin-static">DMG-FW 4.2.1</span></div>
              <div className="admin-row"><span className="admin-label">Numéro de série</span><span className="admin-static">{SERIAL}</span></div>
              <div className="admin-row"><span className="admin-label">Température CPU</span><span className="admin-static">{cpuTemp.toFixed(1)} °C</span></div>
              <Toggle label="Mode économie de batterie" checked={settings.batterySaver} onChange={set('batterySaver')} />
              <Toggle label="Afficher le HUD debug (FPS)" checked={settings.debugHud} onChange={set('debugHud')} />
              <Toggle label="Télémétrie anonyme" checked={settings.telemetry} onChange={set('telemetry')} />
              <button className="admin-reset" onClick={resetAll}>Réinitialiser aux valeurs d'usine</button>
            </>
          )}
        </div>

        <p className="admin-footnote">
          Certains réglages (luminosité, contraste, saturation, mode gaucher) modifient réellement l'affichage.
          Les autres sont purement cosmétiques — pour le plaisir de fouiller. 🛠
        </p>
      </div>
    </div>
  )
}
