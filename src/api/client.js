const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3003'
const LIB_TOKEN_KEY = 'palama-gameb-lib-token'

async function request(path, options) {
  const res = await fetch(`${API_URL}${path}`, options)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} ${text}`)
  }
  return res
}

export const api = {
  romUrl(id) {
    return `${API_URL}/api/roms/${id}/file`
  },

  // --- Personal VPS library (/opt/roms/gameboy) ---
  // Access is gated by a private token so the public site never exposes the
  // folder. The token is passed as a header, never in the URL/query string.
  getLibraryToken() {
    try { return localStorage.getItem(LIB_TOKEN_KEY) || '' } catch { return '' }
  },

  setLibraryToken(token) {
    try {
      if (token) localStorage.setItem(LIB_TOKEN_KEY, token)
      else localStorage.removeItem(LIB_TOKEN_KEY)
    } catch { /* storage disabled — token just won't persist */ }
  },

  // [{ id, label, count }] — one per console, for the library tabs.
  async listSystems() {
    const res = await fetch(`${API_URL}/api/library/systems`, {
      headers: { 'x-library-token': this.getLibraryToken() },
    })
    if (res.status === 401) throw new Error('Token invalide')
    if (res.status === 503) throw new Error('Bibliothèque VPS désactivée côté serveur')
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  },

  async listLibrary(system = 'gb') {
    const res = await fetch(`${API_URL}/api/library?system=${encodeURIComponent(system)}`, {
      headers: { 'x-library-token': this.getLibraryToken() },
    })
    if (res.status === 401) throw new Error('Token invalide')
    if (res.status === 503) throw new Error('Bibliothèque VPS désactivée côté serveur')
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  },

  // Box art thumbnail as an object URL, or null when this ROM has no art.
  // An <img src> can't carry the auth header, so we fetch the bytes and wrap
  // them — callers must revokeObjectURL when done.
  async getLibraryArt(system, relPath) {
    try {
      const res = await fetch(
        `${API_URL}/api/library/art?system=${encodeURIComponent(system)}&path=${encodeURIComponent(relPath)}`,
        { headers: { 'x-library-token': this.getLibraryToken() } },
      )
      if (!res.ok) return null
      return URL.createObjectURL(await res.blob())
    } catch {
      return null
    }
  },

  // Fetch a library ROM as a File (auth header can't ride on a bare URL, so
  // we fetch the bytes ourselves and hand a File to the emulator).
  async getLibraryFile(system, relPath, name) {
    const res = await fetch(
      `${API_URL}/api/library/file?system=${encodeURIComponent(system)}&path=${encodeURIComponent(relPath)}`,
      { headers: { 'x-library-token': this.getLibraryToken() } },
    )
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const blob = await res.blob()
    return new File([blob], name, { type: 'application/octet-stream' })
  },

  async listRoms() {
    const res = await request('/api/roms')
    return res.json()
  },

  async uploadRom(file) {
    const form = new FormData()
    form.append('rom', file)
    const res = await request('/api/roms', { method: 'POST', body: form })
    return res.json()
  },

  async deleteRom(id) {
    await request(`/api/roms/${id}`, { method: 'DELETE' })
  },

  async listSaves(romId) {
    const res = await request(`/api/saves/${romId}`)
    return res.json()
  },

  async putSave(romId, slot, data) {
    const res = await request(`/api/saves/${romId}/${slot}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    return res.json()
  },

  async getSave(romId, slot) {
    const res = await request(`/api/saves/${romId}/${slot}`)
    return res.json()
  },

  async deleteSave(romId, slot) {
    await request(`/api/saves/${romId}/${slot}`, { method: 'DELETE' })
  },
}
