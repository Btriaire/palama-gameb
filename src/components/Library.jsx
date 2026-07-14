import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'

export default function Library({ onSelectRom, currentRomId }) {
  const [roms, setRoms] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const fileInputRef = useRef(null)

  const refresh = async () => {
    try {
      setRoms(await api.listRoms())
    } catch (e) {
      setErr(e.message)
    }
  }

  useEffect(() => { refresh() }, [])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
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

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette ROM de la bibliothèque ?')) return
    await api.deleteRom(id)
    refresh()
  }

  return (
    <div className="gb-library">
      <div className="gb-library-header">
        <h2>Bibliothèque</h2>
        <button className="upload-btn" onClick={() => fileInputRef.current?.click()} disabled={busy}>
          {busy ? 'Envoi…' : '+ ROM (.gb / .gbc)'}
        </button>
        <input ref={fileInputRef} type="file" accept=".gb,.gbc" hidden onChange={handleFile} />
      </div>
      {err && <p className="gb-error">{err}</p>}
      <ul className="gb-rom-list">
        {roms.map((rom) => (
          <li
            key={rom.id}
            className={rom.id === currentRomId ? 'active' : ''}
            onClick={() => onSelectRom(rom, api.romUrl(rom.id))}
          >
            <span className="rom-name">{rom.name}</span>
            <button className="rom-delete" onClick={(e) => handleDelete(rom.id, e)}>×</button>
          </li>
        ))}
        {roms.length === 0 && <li className="empty">Aucune ROM. Ajoute-en une pour commencer.</li>}
      </ul>
    </div>
  )
}
