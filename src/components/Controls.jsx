import { useEffect, useRef } from 'react'
import { WasmBoy } from '../wasmboyInstance'

// --- GB/GBC: WasmBoy's own built-in touch input (ResponsiveGamepad) ---
// This is the same input path used by every other WasmBoy-based player —
// it already handles the iOS touch edge cases (stray finger movement,
// multi-touch, gesture cancellation) that a hand-rolled implementation kept
// getting wrong on real devices despite working in every synthetic test.
function useNativeDpad(ref, enabled) {
  useEffect(() => {
    if (!enabled || !ref.current) return
    const unregister = WasmBoy.ResponsiveGamepad.TouchInput.addDpadInput(ref.current, { allowMultipleDirections: true })
    return unregister
  }, [enabled])
}

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

  const dpadRef = useRef(null)
  const aRef = useRef(null)
  const bRef = useRef(null)
  const selectRef = useRef(null)
  const startRef = useRef(null)

  useNativeDpad(dpadRef, isGb && !disabled)
  useNativeButton(aRef, 'A', isGb && !disabled)
  useNativeButton(bRef, 'B', isGb && !disabled)
  useNativeButton(selectRef, 'SELECT', isGb && !disabled)
  useNativeButton(startRef, 'START', isGb && !disabled)

  const upRef = usePressable('UP', press, release, disabled, isGba)
  const rightRef = usePressable('RIGHT', press, release, disabled, isGba)
  const downRef = usePressable('DOWN', press, release, disabled, isGba)
  const leftRef = usePressable('LEFT', press, release, disabled, isGba)
  const gbaARef = usePressable('A', press, release, disabled, isGba)
  const gbaBRef = usePressable('B', press, release, disabled, isGba)
  const gbaSelectRef = usePressable('SELECT', press, release, disabled, isGba)
  const gbaStartRef = usePressable('START', press, release, disabled, isGba)
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

      {isGba ? (
        <div className="gb-dpad">
          <button ref={upRef} className="dpad-btn dpad-up" aria-label="Haut" />
          <button ref={rightRef} className="dpad-btn dpad-right" aria-label="Droite" />
          <button ref={downRef} className="dpad-btn dpad-down" aria-label="Bas" />
          <button ref={leftRef} className="dpad-btn dpad-left" aria-label="Gauche" />
          <div className="dpad-center" />
        </div>
      ) : (
        <div ref={dpadRef} className="gb-dpad gb-dpad-native" aria-label="Croix directionnelle">
          <div className="dpad-visual dpad-up" />
          <div className="dpad-visual dpad-right" />
          <div className="dpad-visual dpad-down" />
          <div className="dpad-visual dpad-left" />
          <div className="dpad-center" />
        </div>
      )}

      <div className="gb-ab">
        <button ref={isGba ? gbaBRef : bRef} className="round-btn btn-b">B</button>
        <button ref={isGba ? gbaARef : aRef} className="round-btn btn-a">A</button>
      </div>

      <div className="gb-startselect">
        <button ref={isGba ? gbaSelectRef : selectRef} className="pill-btn">Select</button>
        <button ref={isGba ? gbaStartRef : startRef} className="pill-btn">Start</button>
      </div>
    </div>
  )
}
