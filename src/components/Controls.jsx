import { useRef } from 'react'

const EMPTY_STATE = { up: false, right: false, down: false, left: false, a: false, b: false, select: false, start: false }

export default function Controls({ setJoypad, disabled }) {
  const pressedRef = useRef(new Set())

  const sync = () => {
    const state = { ...EMPTY_STATE }
    pressedRef.current.forEach((key) => { state[key] = true })
    setJoypad(state)
  }

  const press = (key) => (e) => {
    e.preventDefault()
    if (disabled) return
    pressedRef.current.add(key)
    sync()
  }

  const release = (key) => (e) => {
    e.preventDefault()
    pressedRef.current.delete(key)
    sync()
  }

  const dpadHandlers = (key) => ({
    onPointerDown: press(key),
    onPointerUp: release(key),
    onPointerLeave: release(key),
    onPointerCancel: release(key),
  })

  return (
    <div className="gb-controls">
      <div className="gb-dpad">
        <button className="dpad-btn dpad-up" {...dpadHandlers('up')} aria-label="Haut" />
        <button className="dpad-btn dpad-right" {...dpadHandlers('right')} aria-label="Droite" />
        <button className="dpad-btn dpad-down" {...dpadHandlers('down')} aria-label="Bas" />
        <button className="dpad-btn dpad-left" {...dpadHandlers('left')} aria-label="Gauche" />
        <div className="dpad-center" />
      </div>

      <div className="gb-ab">
        <button className="round-btn btn-b" {...dpadHandlers('b')}>B</button>
        <button className="round-btn btn-a" {...dpadHandlers('a')}>A</button>
      </div>

      <div className="gb-startselect">
        <button className="pill-btn" {...dpadHandlers('select')}>Select</button>
        <button className="pill-btn" {...dpadHandlers('start')}>Start</button>
      </div>
    </div>
  )
}
