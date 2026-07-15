import { useCallback, useEffect, useRef, useState } from 'react'
import * as WasmBoyModule from 'wasmboy'
import { api } from '../api/client'
import { serializeState, deserializeState } from '../utils/stateSerializer'

// wasmboy's module shape differs between Vite dev (default export only)
// and a rollup production build (named export only) — support both.
const WasmBoy = WasmBoyModule.WasmBoy || WasmBoyModule.default?.WasmBoy || WasmBoyModule.default

const CONFIG = {
  headless: false,
  useGbcWhenOptional: true,
  isAudioEnabled: true,
  isGbcColorizationEnabled: true,
  frameSkip: 0,
  gameboyFPSCap: 60,
  isTimersEnabled: true,
}

// Module-level (not component-level) guard: WasmBoy is a page-wide singleton,
// and React 18 StrictMode double-mounts components in dev. A useRef guard
// doesn't survive that remount, so config() fired twice — and WasmBoy.config()
// re-enables the default joypad each time, silently undoing disableDefaultJoypad()
// from the first call and re-introducing the input race.
let wasmBoyConfigPromise = null

export function useWasmBoy(canvasRef) {
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentRom, setCurrentRom] = useState(null)
  const [error, setError] = useState(null)

  // iOS suspends/kills WasmBoy's internal rAF loop while the tab is
  // backgrounded (screen lock, app switch, Safari UI covering the page) —
  // WasmBoy.isPlaying() then genuinely reports false, but nothing ever calls
  // our pause(), so the UI still says "Pause" and looks like it should be
  // running. Every touch registers (the button itself works fine) but
  // nothing happens because the emulator core isn't advancing frames at
  // all. Force a resume whenever the page becomes visible again — but only
  // if the player didn't deliberately pause (isPlayingRef still true).
  const isReadyRef = useRef(isReady)
  isReadyRef.current = isReady
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying

  useEffect(() => {
    const resync = () => {
      if (document.visibilityState !== 'visible') return
      if (isReadyRef.current && isPlayingRef.current && WasmBoy.isPlaying && !WasmBoy.isPlaying()) {
        WasmBoy.play()
      }
    }
    document.addEventListener('visibilitychange', resync)
    const watchdog = setInterval(resync, 1000)
    return () => {
      document.removeEventListener('visibilitychange', resync)
      clearInterval(watchdog)
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current || wasmBoyConfigPromise) return
    wasmBoyConfigPromise = WasmBoy.config(CONFIG, canvasRef.current)
      // The default joypad (keyboard/gamepad) polls every frame and overwrites
      // setJoypadState() otherwise, silently swallowing our touch/keyboard input.
      .then(() => WasmBoy.disableDefaultJoypad())
      .catch((err) => setError(err.message))
  }, [canvasRef])

  const loadRom = useCallback(async (romMeta, fileOrUrl) => {
    setError(null)
    try {
      // loadROM() can resolve before config()/disableDefaultJoypad() finishes
      // (WASM compile + worker boot can take longer than loading a small ROM).
      // Without this await, isReady flips true and the buttons become usable
      // while the default joypad is still active — it keeps fighting our
      // setJoypadState() writes, which is why input could feel completely
      // unreliable even though everything looked correctly wired.
      await wasmBoyConfigPromise
      await WasmBoy.loadROM(fileOrUrl, { fileName: romMeta.name })
      setCurrentRom(romMeta)
      setIsReady(true)
      await WasmBoy.play()
      setIsPlaying(true)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const play = useCallback(async () => {
    await WasmBoy.play()
    setIsPlaying(true)
  }, [])

  const pause = useCallback(async () => {
    await WasmBoy.pause()
    setIsPlaying(false)
  }, [])

  const reset = useCallback(async () => {
    await WasmBoy.reset()
    setIsPlaying(false)
  }, [])

  const togglePlay = useCallback(async () => {
    if (WasmBoy.isPlaying()) await pause()
    else await play()
  }, [play, pause])

  // Cloud save: capture WasmBoy's internal state and push it to the VPS
  // so it follows the player across devices, not just this browser's IndexedDB.
  const saveToCloud = useCallback(async (slot = 'auto') => {
    if (!currentRom) return
    const wasPlaying = WasmBoy.isPlaying()
    const state = await WasmBoy.saveState()
    const payload = serializeState(state)
    await api.putSave(currentRom.id, slot, payload)
    if (wasPlaying) await WasmBoy.play()
    return state
  }, [currentRom])

  const loadFromCloud = useCallback(async (slot = 'auto') => {
    if (!currentRom) return
    const { data } = await api.getSave(currentRom.id, slot)
    const state = deserializeState(data)
    await WasmBoy.loadState(state)
    await WasmBoy.play()
    setIsPlaying(true)
  }, [currentRom])

  const setJoypad = useCallback((joypadState) => {
    WasmBoy.setJoypadState(joypadState)
  }, [])

  return {
    isReady,
    isPlaying,
    currentRom,
    error,
    loadRom,
    play,
    pause,
    reset,
    togglePlay,
    saveToCloud,
    loadFromCloud,
    setJoypad,
  }
}
