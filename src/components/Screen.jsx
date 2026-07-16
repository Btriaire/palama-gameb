export default function Screen({ gbCanvasRef, gbaCanvasRef, activeCore, isReady, error, placeholderText, filterStyle, scanlines, pixelSharp, fps }) {
  const imageRendering = pixelSharp === false ? 'auto' : 'pixelated'
  return (
    <div className="gb-screen" style={{ filter: filterStyle }}>
      <canvas
        ref={gbCanvasRef}
        width={160}
        height={144}
        className="gb-canvas"
        style={{ display: activeCore === 'gba' ? 'none' : 'block', imageRendering }}
      />
      <canvas
        ref={gbaCanvasRef}
        width={240}
        height={160}
        className="gb-canvas"
        style={{ display: activeCore === 'gba' ? 'block' : 'none', imageRendering }}
      />
      {scanlines && <div className="gb-screen-filter scanlines" />}
      {fps != null && <div className="gb-fps-hud">{fps} FPS</div>}
      {!isReady && (
        <div className="gb-screen-overlay">
          <span>{error ? `Erreur : ${error}` : placeholderText}</span>
        </div>
      )}
    </div>
  )
}
