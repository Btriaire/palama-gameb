import { useState } from 'react'

const STORAGE_KEY = 'palama-gameb-settings'

// Every setting here does something real and visible — see App.jsx (filterStyle,
// scanlines, crtCurvature, pixelSharp, leftHanded) and useWasmBoy.js
// (setSpeed/getFPS for turbo + the FPS HUD). Nothing purely decorative: past
// feedback ("bcp d option sans impact") is exactly why this panel got trimmed.
export const DEFAULT_SETTINGS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  scanlines: false,
  crtCurvature: false,
  sepiaRetro: false,
  pixelSharp: true,
  leftHanded: false,
  turboSpeed: 1,
  debugHud: false,
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
  const [tab, setTab] = useState('video')

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
    ['input', 'Entrées'],
    ['emu', 'Émulation'],
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
            </>
          )}

          {tab === 'input' && (
            <Toggle label="Mode gaucher (inverse la disposition)" checked={settings.leftHanded} onChange={set('leftHanded')} />
          )}

          {tab === 'emu' && (
            <>
              <Select label="Vitesse turbo (GB/GBC)" value={String(settings.turboSpeed)} options={['1', '2', '4', '8']} onChange={(v) => set('turboSpeed')(Number(v))} />
              <Toggle label="Afficher le HUD debug (FPS, GB/GBC)" checked={settings.debugHud} onChange={set('debugHud')} />
            </>
          )}

          {tab === 'system' && (
            <>
              <div className="admin-row"><span className="admin-label">Numéro de série</span><span className="admin-static">{SERIAL}</span></div>
              <button className="admin-reset" onClick={resetAll}>Réinitialiser aux valeurs d'usine</button>
            </>
          )}
        </div>

        <p className="admin-footnote">
          Tous ces réglages ont un effet réel et visible. 🛠
        </p>
      </div>
    </div>
  )
}
