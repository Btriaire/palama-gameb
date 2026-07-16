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

  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying
  // saveState()/loadState()/pause() all await a round-trip with WasmBoy's
  // worker. This ref lets the visibility-resume below know not to touch
  // WasmBoy while one of those is in flight.
  const isBusyRef = useRef(false)

  // When iOS brings the tab back to the foreground it may have suspended
  // WasmBoy's internal loop while it was hidden. Resume once, ONLY on an
  // actual visibility change — never on a background polling timer. A 1s
  // setInterval used to do this and kept firing WasmBoy.play() in the
  // background right as the user hit Pause / Sauver / Charger, racing those
  // operations' own worker round-trips and freezing the whole app. A
  // visibility change can't coincide with a button tap, so it's safe.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (isBusyRef.current || !isPlayingRef.current) return
      if (WasmBoy.isPlaying && !WasmBoy.isPlaying()) WasmBoy.play()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // iOS starts the AudioContext suspended and only lets it resume from inside
  // a real user-gesture handler. A ROM loads through an async chain that has
  // lost the tap's gesture context by the time WasmBoy's play() tries to
  // resume it, so unlock on the first tap — then stop listening, so we're
  // NOT running audio code on every single subsequent button press (that
  // per-tap version made the D-pad and Config buttons freeze).
  useEffect(() => {
    const unlock = () => {
      WasmBoy.resumeAudioContext && WasmBoy.resumeAudioContext()
      document.removeEventListener('touchend', unlock)
      document.removeEventListener('pointerup', unlock)
    }
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
