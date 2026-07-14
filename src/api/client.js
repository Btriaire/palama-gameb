const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003'

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
