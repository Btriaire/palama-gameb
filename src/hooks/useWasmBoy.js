import { useCallback, useEffect, useRef, useState } from 'react'
import { WasmBoy } from '../wasmboyInstance'
import { api } from '../api/client'
import { serializeState, deserializeState } from '../utils/stateSerializer'

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
// doesn't survive that remount, so config() would otherwise fire twice.
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
  // running. Force a resume whenever the page becomes visible again — but
  // only if the player didn't deliberately pause (isPlayingRef still true).
  const isReadyRef = useRef(isReady)
  isReadyRef.current = isReady
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying
  // saveState()/loadState() call WasmBoy's own pause() internally and await
  // a round-trip with its worker, all while our React isPlaying state stays
  // true (we only flip it after the whole save/load finishes). Without this
  // guard the watchdog below sees isPlaying()===false mid-save and fires
  // play() right into the middle of that round-trip. Skip the watchdog
  // entirely while a save/load is in flight.
  const isBusyRef = useRef(false)

  useEffect(() => {
    const resync = () => {
      if (isBusyRef.current) return
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
    // Use WasmBoy's own built-in keyboard/touch input system (ResponsiveGamepad)
    // instead of hand-rolled event handling — it's the same input path used by
    // every other WasmBoy-based player, and it already handles the iOS touch
    // edge cases we kept fighting with a custom implementation. Buttons are
    // registered separately (see Controls.jsx) via WasmBoy.ResponsiveGamepad.
    wasmBoyConfigPromise = WasmBoy.config(CONFIG, canvasRef.current)
      .then(() => WasmBoy.enableDefaultJoypad())
      .catch((err) => setError(err.message))
  }, [canvasRef])

  const loadRom = useCallback(async (romMeta, fileOrUrl) => {
    setError(null)
    try {
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

  const setSpeed = useCallback((multiplier) => {
    WasmBoy.setSpeed(multiplier)
  }, [])

  const getFPS = useCallback(() => WasmBoy.getFPS(), [])

  // Cloud save: capture WasmBoy's internal state and push it to the VPS
  // so it follows the player across devices, not just this browser's IndexedDB.
  const saveToCloud = useCallback(async (slot = 'auto') => {
    if (!currentRom) return
    isBusyRef.current = true
    try {
      const wasPlaying = WasmBoy.isPlaying()
      const state = await WasmBoy.saveState()
      const payload = serializeState(state)
      await api.putSave(currentRom.id, slot, payload)
      if (wasPlaying) await WasmBoy.play()
      return state
    } finally {
      isBusyRef.current = false
    }
  }, [currentRom])

  const loadFromCloud = useCallback(async (slot = 'auto') => {
    if (!currentRom) return
    isBusyRef.current = true
    try {
      const { data } = await api.getSave(currentRom.id, slot)
      const state = deserializeState(data)
      await WasmBoy.loadState(state)
      await WasmBoy.play()
      setIsPlaying(true)
    } finally {
      isBusyRef.current = false
    }
  }, [currentRom])

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
    setSpeed,
    getFPS,
  }
}
