import { useEffect, useRef } from 'react'
import { WasmBoy } from '../wasmboyInstance'

// --- GB/GBC: WasmBoy's own built-in touch input (ResponsiveGamepad) ---
// addButtonInput gives us WasmBoy's proven touch-event lifecycle (listen/
// stopListening, proper multi-touch tracking) without its position-based
// "guess the direction from where you tapped" logic — addDpadInput's center-
// relative math didn't match our cross-shaped layout (arms reach close to
// the middle) and kept misfiring the wrong direction. Four discrete buttons,
// same as A/B/Select/Start, sidesteps that entirely.
function useNativeButton(ref, input, enabled) {
  useEffect(() => {
    if (!enabled || !ref.current) return
    const unregister = WasmBoy.ResponsiveGamepad.TouchInput.addButtonInput(ref.current, input)
    return unregister
  }, [enabled])
}

// --- GBA: our own touch handling (gba-kit has no equivalent built-in) ---
// Native Touch Events (not Pointer Events) — the oldest, most consistently
// implemented input API on mobile Safari.
function usePressable(key, press, release, disabled, enabled) {
  const ref = useRef(null)
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled
  const touchIdRef = useRef(null)
  const mouseDownRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return

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
  }, [key, press, release, enabled])

  return ref
}

export default function Controls({ press, release, disabled, core }) {
  const isGb = core === 'gb'
  const isGba = core === 'gba'

  // GB/GBC: registered with WasmBoy's own input system.
  const nativeUpRef = useRef(null)
  const nativeRightRef = useRef(null)
  const nativeDownRef = useRef(null)
  const nativeLeftRef = useRef(null)
  const nativeARef = useRef(null)
  const nativeBRef = useRef(null)
  const nativeSelectRef = useRef(null)
  const nativeStartRef = useRef(null)

  useNativeButton(nativeUpRef, 'DPAD_UP', isGb && !disabled)
  useNativeButton(nativeRightRef, 'DPAD_RIGHT', isGb && !disabled)
  useNativeButton(nativeDownRef, 'DPAD_DOWN', isGb && !disabled)
  useNativeButton(nativeLeftRef, 'DPAD_LEFT', isGb && !disabled)
  useNativeButton(nativeARef, 'A', isGb && !disabled)
  useNativeButton(nativeBRef, 'B', isGb && !disabled)
  useNativeButton(nativeSelectRef, 'SELECT', isGb && !disabled)
  useNativeButton(nativeStartRef, 'START', isGb && !disabled)

  // GBA: our own custom touch handling.
  const upRef = usePressable('UP', press, release, disabled, isGba)
  const rightRef = usePressable('RIGHT', press, release, disabled, isGba)
  const downRef = usePressable('DOWN', press, release, disabled, isGba)
  const leftRef = usePressable('LEFT', press, release, disabled, isGba)
  const aRef = usePressable('A', press, release, disabled, isGba)
  const bRef = usePressable('B', press, release, disabled, isGba)
  const selectRef = usePressable('SELECT', press, release, disabled, isGba)
  const startRef = usePressable('START', press, release, disabled, isGba)
  const lRef = usePressable('L', press, release, disabled, isGba)
  const rRef = usePressable('R', press, release, disabled, isGba)

  return (
    <div className="gb-controls">
      {isGba && (
        <div className="gb-shoulders">
          <button ref={lRef} className="shoulder-btn shoulder-l">L</button>
          <button ref={rRef} className="shoulder-btn shoulder-r">R</button>
        </div>
      )}

      <div className="gb-dpad">
        <button ref={isGba ? upRef : nativeUpRef} className="dpad-btn dpad-up" aria-label="Haut" />
        <button ref={isGba ? rightRef : nativeRightRef} className="dpad-btn dpad-right" aria-label="Droite" />
        <button ref={isGba ? downRef : nativeDownRef} className="dpad-btn dpad-down" aria-label="Bas" />
        <button ref={isGba ? leftRef : nativeLeftRef} className="dpad-btn dpad-left" aria-label="Gauche" />
        <div className="dpad-center" />
      </div>

      <div className="gb-ab">
        <button ref={isGba ? bRef : nativeBRef} className="round-btn btn-b">B</button>
        <button ref={isGba ? aRef : nativeARef} className="round-btn btn-a">A</button>
      </div>

      <div className="gb-startselect">
        <button ref={isGba ? selectRef : nativeSelectRef} className="pill-btn">Select</button>
        <button ref={isGba ? startRef : nativeStartRef} className="pill-btn">Start</button>
      </div>
    </div>
  )
}
