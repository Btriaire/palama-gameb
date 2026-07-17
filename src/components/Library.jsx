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

// Box art for a VPS library item, falling back to the coloured cartridge for
// the ~11% of ROMs libretro has no cover for.
function RomArt({ item }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let cancelled = false
    let url = null
    api.getLibraryArt(item.path).then((objectUrl) => {
      if (cancelled) {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        return
      }
      url = objectUrl
      setSrc(objectUrl)
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [item.path])

  if (!src) {
    return (
      <span className="rom-cartridge rom-cartridge-lg" style={{ background: colorFor(item.name) }}>
        {item.name.replace(/\.(gb|gbc|gba)$/i, '').slice(0, 2).toUpperCase()}
      </span>
    )
  }
  return <img className="rom-art" src={src} alt="" loading="lazy" />
}

export default function Library({ onSelectRom, currentRomId, onClose }) {
  const [roms, setRoms] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // Personal VPS library (/opt/roms/gameboy), gated by a private token.
  const [libItems, setLibItems] = useState([])
  const [libErr, setLibErr] = useState(null)
  const [libLoading, setLibLoading] = useState(false)
  const [libQuery, setLibQuery] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [hasToken, setHasToken] = useState(() => !!api.getLibraryToken())

  const refresh = async () => {
    try {
      setRoms(await api.listRoms())
    } catch (e) {
      setErr(e.message)
    }
  }

  const loadLibrary = async () => {
    setLibLoading(true)
    setLibErr(null)
    try {
      setLibItems(await api.listLibrary())
    } catch (e) {
      setLibErr(e.message)
      if (/token/i.test(e.message)) setHasToken(false)
    } finally {
      setLibLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])
  useEffect(() => { if (hasToken) loadLibrary() }, [hasToken])

  const saveToken = (e) => {
    e.preventDefault()
    const t = tokenInput.trim()
    if (!t) return
    api.setLibraryToken(t)
    setHasToken(true)
  }

  const forgetToken = () => {
    api.setLibraryToken('')
    setLibItems([])
    setLibErr(null)
    setTokenInput('')
    setHasToken(false)
  }

  const selectLibItem = async (item) => {
    setBusy(true)
    setErr(null)
    try {
      const file = await api.getLibraryFile(item.path, item.name)
      onSelectRom({ id: `vps:${item.path}`, name: item.name, size: item.size }, file)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const q = libQuery.trim().toLowerCase()
  const filteredLib = q ? libItems.filter((i) => i.name.toLowerCase().includes(q)) : libItems
  // No query → show only a short preview so the search box isn't buried under
  // a 1200-item list (which made it unreachable). Searching → up to 150.
  const shownLib = filteredLib.slice(0, q ? 150 : 24)

  const uploadFile = async (file) => {
    if (!file) return
    if (!/\.(gb|gbc|gba)$/i.test(file.name)) {
      setErr('Seuls les fichiers .gb, .gbc et .gba sont acceptés')
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
        <small>.gb, .gbc ou .gba — appuie ou dépose ici</small>
      </button>
      <input ref={fileInputRef} type="file" accept=".gb,.gbc,.gba" hidden onChange={handleFile} />

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
                {rom.name.replace(/\.(gb|gbc|gba)$/i, '').slice(0, 2).toUpperCase()}
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

      <div className="gb-lib-vps">
        <div className="gb-lib-vps-head">
          <h3>Ma bibliothèque VPS</h3>
          {hasToken && (
            <button className="gb-lib-forget" onClick={forgetToken} title="Oublier le token sur cet appareil">
              Déconnecter
            </button>
          )}
        </div>

        {!hasToken ? (
          <form className="gb-lib-token" onSubmit={saveToken}>
            <p>Saisis ton token privé pour accéder à tes ROMs sur le VPS.</p>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Token privé"
              autoComplete="off"
            />
            <button type="submit" disabled={!tokenInput.trim()}>Connecter</button>
            {libErr && <p className="gb-error">{libErr}</p>}
          </form>
        ) : (
          <>
            <input
              className="gb-lib-search"
              type="search"
              value={libQuery}
              onChange={(e) => setLibQuery(e.target.value)}
              placeholder={`Rechercher parmi ${libItems.length} ROMs…`}
            />
            {libErr && <p className="gb-error">{libErr}</p>}
            {libLoading ? (
              <p className="gb-lib-note">Chargement…</p>
            ) : (
              <>
                <ul className="gb-rom-list">
                  {shownLib.map((item) => (
                    <li key={item.path} onClick={() => selectLibItem(item)}>
                      <RomArt item={item} />
                      <span className="rom-info">
                        <span className="rom-name">{item.name}</span>
                        <span className="rom-meta">{formatSize(item.size)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {filteredLib.length > shownLib.length && (
                  <p className="gb-lib-note">
                    {q
                      ? `${filteredLib.length - shownLib.length} de plus — affine ta recherche.`
                      : `Tape le nom d'un jeu pour chercher parmi ${libItems.length} ROMs.`}
                  </p>
                )}
                {!libLoading && filteredLib.length === 0 && (
                  <p className="gb-lib-note">Aucune ROM trouvée.</p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
