export default function Screen({ gbCanvasRef, gbaCanvasRef, activeCore, isReady, error, placeholderText }) {
  return (
    <div className="gb-screen">
      <canvas
        ref={gbCanvasRef}
        width={160}
        height={144}
        className="gb-canvas"
        style={{ display: activeCore === 'gba' ? 'none' : 'block' }}
      />
      <canvas
        ref={gbaCanvasRef}
        width={240}
        height={160}
        className="gb-canvas"
        style={{ display: activeCore === 'gba' ? 'block' : 'none' }}
      />
      {!isReady && (
        <div className="gb-screen-overlay">
          <span>{error ? `Erreur : ${error}` : placeholderText}</span>
        </div>
      )}
    </div>
  )
}
