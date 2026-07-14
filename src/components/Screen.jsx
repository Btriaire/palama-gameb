export default function Screen({ canvasRef, isReady, error, placeholderText }) {
  return (
    <div className="gb-screen">
      <canvas ref={canvasRef} width={160} height={144} className="gb-canvas" />
      {!isReady && (
        <div className="gb-screen-overlay">
          <span>{error ? `Erreur : ${error}` : placeholderText}</span>
        </div>
      )}
    </div>
  )
}
