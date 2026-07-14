import { useCallback, useEffect, useRef, useState } from 'react'
import { EmulatorBridge } from '@gba-kit/gba-browser'
import { api } from '../api/client'
import { serializeState, deserializeState } from '../utils/stateSerializer'

// Maps our shared {UP,DOWN,LEFT,RIGHT,A,B,SELECT,START,L,R} joypad shape to
// gba-kit's numeric button indices (see gba-kit's emulator.ts KEY_MAP).
const BUTTON_INDEX = { A: 0, B: 1, SELECT: 2, START: 3, RIGHT: 4, LEFT: 5, UP: 6, DOWN: 7, R: 8, L: 9 }

export function useGba(canvasRef) {
  const bridgeRef = useRef(null)
  const lastRomBufferRef = useRef(null)
  const lastPressedRef = useRef(new Set())
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentRom, setCurrentRom] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!canvasRef.current || bridgeRef.current) return
    const bridge = new EmulatorBridge()
    bridge.setCallbacks({
      onStateChange: (s) => setIsPlaying(s === 'running'),
      onFrame: () => {},
      onBreakpoint: () => {},
    })
    bridge.attachCanvas(canvasRef.current)
    bridgeRef.current = bridge
  }, [canvasRef])

  const loadRom = useCallback(async (romMeta, fileOrUrl) => {
    setError(null)
    try {
      const buffer = typeof fileOrUrl === 'string'
        ? await (await fetch(fileOrUrl)).arrayBuffer()
        : await fileOrUrl.arrayBuffer()
      lastRomBufferRef.current = buffer
      const bridge = bridgeRef.current
      bridge.loadRom(buffer)
      bridge.enableAudio()
      bridge.run()
      setCurrentRom(romMeta)
      setIsReady(true)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const play = useCallback(async () => {
    bridgeRef.current?.run()
  }, [])

  const pause = useCallback(async () => {
    bridgeRef.current?.pause()
  }, [])

  const reset = useCallback(async () => {
    if (!lastRomBufferRef.current) return
    bridgeRef.current?.loadRom(lastRomBufferRef.current)
    bridgeRef.current?.run()
  }, [])

  const togglePlay = useCallback(async () => {
    if (bridgeRef.current?.state === 'running') await pause()
    else await play()
  }, [play, pause])

  const saveToCloud = useCallback(async (slot = 'auto') => {
    if (!currentRom) return
    const bridge = bridgeRef.current
    const wasPlaying = bridge.state === 'running'
    const { snapshot } = await bridge.saveState()
    await api.putSave(currentRom.id, slot, serializeState(snapshot))
    if (wasPlaying) bridge.run()
  }, [currentRom])

  const loadFromCloud = useCallback(async (slot = 'auto') => {
    if (!currentRom) return
    const { data } = await api.getSave(currentRom.id, slot)
    bridgeRef.current.loadState(deserializeState(data))
    bridgeRef.current.run()
  }, [currentRom])

  // Diff against the last state so we only fire press()/release() on actual
  // transitions — gba-kit's input API is edge-triggered, not level-set.
  const setJoypad = useCallback((joypadState) => {
    const bridge = bridgeRef.current
    if (!bridge) return
    const input = bridge.gba.input
    const pressed = lastPressedRef.current
    for (const [key, index] of Object.entries(BUTTON_INDEX)) {
      const isDown = !!joypadState[key]
      const wasDown = pressed.has(key)
      if (isDown && !wasDown) {
        input.press(index)
        pressed.add(key)
      } else if (!isDown && wasDown) {
        input.release(index)
        pressed.delete(key)
      }
    }
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
