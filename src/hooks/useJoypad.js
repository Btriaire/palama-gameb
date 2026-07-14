import { useEffect, useRef } from 'react'

const EMPTY_STATE = { up: false, right: false, down: false, left: false, a: false, b: false, select: false, start: false }

const KEY_MAP = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  KeyW: 'up',
  KeyD: 'right',
  KeyS: 'down',
  KeyA: 'left',
  KeyX: 'a',
  KeyZ: 'b',
  Enter: 'start',
  ShiftRight: 'select',
  ShiftLeft: 'select',
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
