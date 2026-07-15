import { useCallback, useEffect, useRef } from 'react'

// WasmBoy's setJoypadState reads UPPERCASE keys (a.UP, a.A, ...) — anything
// else silently evaluates to "not pressed" for every button. L/R only apply
// to GBA ROMs; harmless no-ops for GB/GBC.
const EMPTY_STATE = {
  UP: false, RIGHT: false, DOWN: false, LEFT: false,
  A: false, B: false, SELECT: false, START: false,
  L: false, R: false,
}

const KEY_MAP = {
  ArrowUp: 'UP',
  ArrowRight: 'RIGHT',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  KeyW: 'UP',
  KeyD: 'RIGHT',
  KeyS: 'DOWN',
  KeyA: 'LEFT',
  KeyX: 'A',
  KeyZ: 'B',
  Enter: 'START',
  ShiftRight: 'SELECT',
  ShiftLeft: 'SELECT',
  KeyQ: 'L',
  KeyE: 'R',
}

// Single source of truth for joypad state — touch buttons and keyboard both
// feed into the same pressed set so they don't fight over setJoypadState().
export function useJoypad(setJoypad) {
  const pressedRef = useRef(new Set())
  const setJoypadRef = useRef(setJoypad)
  setJoypadRef.current = setJoypad

  const sync = () => {
    const state = { ...EMPTY_STATE }
    pressedRef.current.forEach((key) => { state[key] = true })
    setJoypadRef.current(state)
  }

  const press = useCallback((key) => {
    pressedRef.current.add(key)
    sync()
  }, [])

  const release = useCallback((key) => {
    pressedRef.current.delete(key)
    sync()
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = KEY_MAP[e.code]
      if (!key) return
      e.preventDefault()
      press(key)
    }
    const onKeyUp = (e) => {
      const key = KEY_MAP[e.code]
      if (!key) return
      e.preventDefault()
      release(key)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [press, release])

  return { press, release }
}
