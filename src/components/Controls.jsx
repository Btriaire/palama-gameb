import { useEffect, useRef } from 'react'

// Native Touch Events (not Pointer Events) — the oldest, most consistently
// implemented input API on mobile Safari. Pointer Events + setPointerCapture
// kept misbehaving on real iPhones despite working in every synthetic test,
// so this tracks each finger by its own touch identifier instead.
function usePressable(key, press, release, disabled) {
  const ref = useRef(null)
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled
  const touchIdRef = useRef(null)
  const mouseDownRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onTouchStart = (e) => {
      e.preventDefault()
      if (disabledRef.current) return
      touchIdRef.current = e.changedTouches[0].identifier
      press(key)
    }
    const onTouchEnd = (e) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null
          release(key)
        }
      }
    }
    const onMouseDown = (e) => {
      e.preventDefault()
      if (disabledRef.current) return
      mouseDownRef.current = true
      press(key)
    }
    const onMouseUp = () => {
      if (!mouseDownRef.current) return
      mouseDownRef.current = false
      release(key)
    }
    const onContextMenu = (e) => e.preventDefault()

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('touchcancel', onTouchEnd, { passive: false })
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [key, press, release])

  return ref
}

export default function Controls({ press, release, disabled, showShoulders }) {
  const upRef = usePressable('UP', press, release, disabled)
  const rightRef = usePressable('RIGHT', press, release, disabled)
  const downRef = usePressable('DOWN', press, release, disabled)
  const leftRef = usePressable('LEFT', press, release, disabled)
  const aRef = usePressable('A', press, release, disabled)
  const bRef = usePressable('B', press, release, disabled)
  const selectRef = usePressable('SELECT', press, release, disabled)
  const startRef = usePressable('START', press, release, disabled)
  const lRef = usePressable('L', press, release, disabled)
  const rRef = usePressable('R', press, release, disabled)

  return (
    <div className="gb-controls">
      {showShoulders && (
        <div className="gb-shoulders">
          <button ref={lRef} className="shoulder-btn shoulder-l">L</button>
          <button ref={rRef} className="shoulder-btn shoulder-r">R</button>
        </div>
      )}

      <div className="gb-dpad">
        <button ref={upRef} className="dpad-btn dpad-up" aria-label="Haut" />
        <button ref={rightRef} className="dpad-btn dpad-right" aria-label="Droite" />
        <button ref={downRef} className="dpad-btn dpad-down" aria-label="Bas" />
        <button ref={leftRef} className="dpad-btn dpad-left" aria-label="Gauche" />
        <div className="dpad-center" />
      </div>

      <div className="gb-ab">
        <button ref={bRef} className="round-btn btn-b">B</button>
        <button ref={aRef} className="round-btn btn-a">A</button>
      </div>

      <div className="gb-startselect">
        <button ref={selectRef} className="pill-btn">Select</button>
        <button ref={startRef} className="pill-btn">Start</button>
      </div>
    </div>
  )
}
