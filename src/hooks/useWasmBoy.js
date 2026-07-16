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

  // iOS starts every AudioContext suspended and only lets it resume from
  // inside a real user-gesture handler. WasmBoy resumes it in play(), but a
  // ROM loads through an async chain (fetch + config + loadROM) that has
  // already lost the original tap's gesture context by the time play() runs
  // — so the context stays suspended and there's no sound. Re-arm it on
  // every tap: resumeAudioContext() is a cheap no-op once it's running.
  useEffect(() => {
    const unlock = () => WasmBoy.resumeAudioContext && WasmBoy.resumeAudioContext()
    document.addEventListener('touchend', unlock)
    document.addEventListener('pointerup', unlock)
    return () => {
      document.removeEventListener('touchend', unlock)
      document.removeEventListener('pointerup', unlock)
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

  // Both play() and pause() flip isPlayingRef SYNCHRONOUSLY (not just the
  // React state, which only updates after the await) and hold isBusyRef for
  // the whole async op. That way the 1s watchdog can never see a transient
  // mismatch mid-transition and "helpfully" fire the opposite call into the
  // middle of an in-flight worker round-trip — which is exactly what froze
  // the whole app when you hit Pause (WasmBoy.pause() cancels the render
  // loop and awaits a worker reply; a stray play() racing it deadlocked
  // both). resumeAudioContext must be called from a user gesture on iOS, so
  // we also nudge it here when play() runs off a button tap.
  const play = useCallback(async () => {
    isBusyRef.current = true
    isPlayingRef.current = true
    setIsPlaying(true)
    try {
      WasmBoy.resumeAudioContext && WasmBoy.resumeAudioContext()
      await WasmBoy.play()
    } finally {
      isBusyRef.current = false
    }
  }, [])

  const pause = useCallback(async () => {
    isBusyRef.current = true
    isPlayingRef.current = false
    setIsPlaying(false)
    try {
      await WasmBoy.pause()
    } finally {
      isBusyRef.current = false
    }
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
