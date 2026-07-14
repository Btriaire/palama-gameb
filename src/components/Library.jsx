import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'

function formatSize(bytes) {
  if (!bytes) return ''
  const kb = bytes / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} Mo` : `${Math.round(kb)} Ko`
}

// Deterministic pastel color per ROM so cartridges are visually distinct at a glance.
function colorFor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return `hsl(${hash % 360}, 55%, 55%)`
}

export default function Library({ onSelectRom, currentRomId, onClose }) {
  const [roms, setRoms] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const refresh = async () => {
    try {
      setRoms(await api.listRoms())
    } catch (e) {
      setErr(e.message)
    }
  }

  useEffect(() => { refresh() }, [])

  const uploadFile = async (file) => {
    if (!file) return
    if (!/\.(gb|gbc)$/i.test(file.name)) {
      setErr('Seuls les fichiers .gb et .gbc sont acceptés')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const rom = await api.uploadRom(file)
      await refresh()
      onSelectRom(rom, api.romUrl(rom.id))
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    uploadFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    uploadFile(e.dataTransfer.files?.[0])
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette ROM de la bibliothèque ?')) return
    await api.deleteRom(id)
    refresh()
  }

  return (
    <div className="gb-library">
      <div className="gb-library-header">
        <div className="gb-library-drag" />
        <h2>Bibliothèque</h2>
        <button className="gb-library-close" onClick={onClose} aria-label="Fermer">×</button>
      </div>

      <button
        className={`gb-dropzone ${dragOver ? 'drag-over' : ''} ${busy ? 'busy' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        disabled={busy}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 4v11m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{busy ? 'Envoi en cours…' : 'Ajouter une ROM'}</span>
        <small>.gb ou .gbc — appuie ou dépose ici</small>
      </button>
      <input ref={fileInputRef} type="file" accept=".gb,.gbc" hidden onChange={handleFile} />

      {err && <p className="gb-error">{err}</p>}

      {roms.length === 0 ? (
        <div className="gb-library-empty">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="6" y="2" width="12" height="20" rx="2" />
            <rect x="9" y="6" width="6" height="4" rx="1" />
            <line x1="9" y1="15" x2="15" y2="15" strokeLinecap="round" />
          </svg>
          <p>Ta bibliothèque est vide.<br />Ajoute une ROM pour commencer à jouer.</p>
        </div>
      ) : (
        <ul className="gb-rom-list">
          {roms.map((rom) => (
            <li
              key={rom.id}
              className={rom.id === currentRomId ? 'active' : ''}
              onClick={() => onSelectRom(rom, api.romUrl(rom.id))}
            >
              <span className="rom-cartridge" style={{ background: colorFor(rom.name) }}>
                {rom.name.replace(/\.(gb|gbc)$/i, '').slice(0, 2).toUpperCase()}
              </span>
              <span className="rom-info">
                <span className="rom-name">{rom.name}</span>
                <span className="rom-meta">{formatSize(rom.size)}</span>
              </span>
              <button className="rom-delete" onClick={(e) => handleDelete(rom.id, e)} aria-label="Supprimer">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
