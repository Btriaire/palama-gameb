// Temporary on-screen diagnostic log — lets us see what's actually happening
// on a real phone without needing USB/remote debugging tools.
const MAX_LINES = 40
let lines = []
const listeners = new Set()

export function pushDebug(msg) {
  const time = new Date().toISOString().slice(11, 23)
  lines.push(`${time} ${msg}`)
  if (lines.length > MAX_LINES) lines = lines.slice(-MAX_LINES)
  listeners.forEach((l) => l(lines))
}

export function subscribeDebug(listener) {
  listeners.add(listener)
  listener(lines)
  return () => listeners.delete(listener)
}

export function getDebugLines() {
  return lines
}
