import { useCallback, useEffect, useRef } from 'react'
import { pushDebug } from '../utils/debugLog'

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
    pushDebug(`press(${key})`)
    pressedRef.current.add(key)
    sync()
  }, [])

  const release = useCallback((key) => {
    pushDebug(`release(${key})`)
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

  // Re-assert the held state every frame instead of only on press/release
  // edges. Something (WasmBoy's own internal loop, a stray re-render, or
  // event churn) was winning a race and reverting our state between our
  // one-shot writes — a single tap "won" often enough to nudge the
  // character, but a held press kept losing. Continuously re-sending the
  // current state means our write is always the most recent one.
  useEffect(() => {
    let frameId
    let frameCount = 0
    const loop = () => {
      frameCount++
      if (pressedRef.current.size > 0) {
        sync()
        if (frameCount % 30 === 0) pushDebug(`rAF loop alive, pressed=[${[...pressedRef.current]}]`)
      }
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return { press, release }
}
