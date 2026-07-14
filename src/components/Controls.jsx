export default function Controls({ press, release, disabled }) {
  const guardedPress = (key) => (e) => {
    e.preventDefault()
    if (disabled) return
    press(key)
  }

  const guardedRelease = (key) => (e) => {
    e.preventDefault()
    release(key)
  }

  const dpadHandlers = (key) => ({
    onPointerDown: guardedPress(key),
    onPointerUp: guardedRelease(key),
    onPointerLeave: guardedRelease(key),
    onPointerCancel: guardedRelease(key),
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
