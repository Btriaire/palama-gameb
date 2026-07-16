export default function Screen({ gbCanvasRef, gbaCanvasRef, activeCore, isReady, error, placeholderText, filterStyle, scanlines }) {
  return (
    <div className="gb-screen">
      <canvas
        ref={gbCanvasRef}
        width={160}
        height={144}
        className="gb-canvas"
        style={{ display: activeCore === 'gba' ? 'none' : 'block', filter: filterStyle }}
      />
      <canvas
        ref={gbaCanvasRef}
        width={240}
        height={160}
        className="gb-canvas"
        style={{ display: activeCore === 'gba' ? 'block' : 'none', filter: filterStyle }}
      />
      {scanlines && <div className="gb-screen-filter scanlines" />}
      {!isReady && (
        <div className="gb-screen-overlay">
          <span>{error ? `Erreur : ${error}` : placeholderText}</span>
        </div>
      )}
    </div>
  )
}
