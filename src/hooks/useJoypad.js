import { useEffect, useRef } from 'react'

// WasmBoy's setJoypadState reads UPPERCASE keys (a.UP, a.A, ...) — anything
// else silently evaluates to "not pressed" for every button.
const EMPTY_STATE = { UP: false, RIGHT: false, DOWN: false, LEFT: false, A: false, B: false, SELECT: false, START: false }

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
}

// Single source of truth for joypad state — touch buttons and keyboard both
// feed into the same pressed set so they don't fight over setJoypadState().
export function useJoypad(setJoypad) {
  const pressedRef = useRef(new Set())

  const sync = () => {
    const state = { ...EMPTY_STATE }
    pressedRef.current.forEach((key) => { state[key] = true })
    setJoypad(state)
  }

  const press = (key) => {
    pressedRef.current.add(key)
    sync()
  }

  const release = (key) => {
    pressedRef.current.delete(key)
    sync()
  }

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
  }, [])

  return { press, release }
}
