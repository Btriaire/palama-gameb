import { useEffect, useRef } from 'react'

export default function Controls({ press, release, disabled }) {
  // Maps an active pointerId -> the joypad key it's holding down. Released via
  // window-level listeners so a finger doesn't have to stay exactly over the
  // button (or rely on setPointerCapture, which has known WebKit bugs where it
  // throws and silently kills the rest of the handler on iOS Safari).
  const activePointers = useRef(new Map())

  useEffect(() => {
    const releaseAll = (e) => {
      const key = activePointers.current.get(e.pointerId)
      if (key === undefined) return
      activePointers.current.delete(e.pointerId)
      release(key)
    }
    window.addEventListener('pointerup', releaseAll)
    window.addEventListener('pointercancel', releaseAll)
    return () => {
      window.removeEventListener('pointerup', releaseAll)
      window.removeEventListener('pointercancel', releaseAll)
    }
  }, [release])

  const guardedPress = (key) => (e) => {
    e.preventDefault()
    if (disabled) return
    activePointers.current.set(e.pointerId, key)
    press(key)
  }

  const dpadHandlers = (key) => ({
    onPointerDown: guardedPress(key),
    // Real release happens via the window-level pointerup/pointercancel above.
    onContextMenu: (e) => e.preventDefault(),
  })

  return (
    <div className="gb-controls">
      <div className="gb-dpad">
        <button className="dpad-btn dpad-up" {...dpadHandlers('UP')} aria-label="Haut" />
        <button className="dpad-btn dpad-right" {...dpadHandlers('RIGHT')} aria-label="Droite" />
        <button className="dpad-btn dpad-down" {...dpadHandlers('DOWN')} aria-label="Bas" />
        <button className="dpad-btn dpad-left" {...dpadHandlers('LEFT')} aria-label="Gauche" />
        <div className="dpad-center" />
      </div>

      <div className="gb-ab">
        <button className="round-btn btn-b" {...dpadHandlers('B')}>B</button>
        <button className="round-btn btn-a" {...dpadHandlers('A')}>A</button>
      </div>

      <div className="gb-startselect">
        <button className="pill-btn" {...dpadHandlers('SELECT')}>Select</button>
        <button className="pill-btn" {...dpadHandlers('START')}>Start</button>
      </div>
    </div>
  )
}
