import { useEffect, useRef } from 'react'

// Keeps the screen from auto-dimming/locking while a game is actively
// playing (supported on iOS Safari 16.4+). The lock is released by the
// browser whenever the tab goes into the background, so we re-acquire it
// on visibilitychange rather than assuming it stays held.
export function useWakeLock(active) {
  const lockRef = useRef(null)

  useEffect(() => {
    if (!active || !navigator.wakeLock) return

    let cancelled = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release()
          return
        }
        lockRef.current = lock
      } catch {
        // Wake lock is a nice-to-have — ignore denial (e.g. low battery mode).
      }
    }

    acquire()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !lockRef.current) acquire()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      lockRef.current?.release()
      lockRef.current = null
    }
  }, [active])
}
