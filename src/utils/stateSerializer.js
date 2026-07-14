const TYPED_ARRAY_TAG = '__typedArray'

function bufferToBase64(buf) {
  let binary = ''
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

const TYPED_ARRAY_CTORS = {
  Uint8Array, Int8Array, Uint8ClampedArray,
  Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array,
}

// WasmBoy save states contain nested typed arrays. JSON can't hold those,
// so we walk the object and swap them for a {base64} marker, and back on load.
export function serializeState(value) {
  if (ArrayBuffer.isView(value) && value.constructor.name in TYPED_ARRAY_CTORS) {
    return { [TYPED_ARRAY_TAG]: value.constructor.name, base64: bufferToBase64(value.buffer) }
  }
  if (Array.isArray(value)) return value.map(serializeState)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value)) out[key] = serializeState(value[key])
    return out
  }
  return value
}

export function deserializeState(value) {
  if (value && typeof value === 'object' && value[TYPED_ARRAY_TAG]) {
    const Ctor = TYPED_ARRAY_CTORS[value[TYPED_ARRAY_TAG]]
    return new Ctor(base64ToBuffer(value.base64))
  }
  if (Array.isArray(value)) return value.map(deserializeState)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value)) out[key] = deserializeState(value[key])
    return out
  }
  return value
}
