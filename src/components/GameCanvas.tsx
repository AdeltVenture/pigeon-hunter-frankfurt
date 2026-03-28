import { useRef, useEffect } from 'react';
import { useGame } from '../game/useGame';

interface Props {
  onGameOver: (score: number, wave: number) => void;
}

export default function GameCanvas({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { hud, startGame, onAimMove, onShootStart, onShootEnd } = useGame(canvasRef);
  const activeTouchRef = useRef<number | null>(null);

  useEffect(() => { startGame(); }, [startGame]);

  useEffect(() => {
    if (hud.phase === 'gameover') {
      const t = setTimeout(() => onGameOver(hud.score, hud.wave), 700);
      return () => clearTimeout(t);
    }
  }, [hud.phase, hud.score, hud.wave, onGameOver]);

  // ── Mouse (PC) ──────────────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent) => {
    onAimMove(e.clientX, e.clientY);
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { onAimMove(e.clientX, e.clientY); onShootStart(); }
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 0) onShootEnd();
  };

  // ── Touch (Mobile) ──────────────────────────────────────────────────────────
  // Tap or drag anywhere = aim + shoot
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    activeTouchRef.current = t.identifier;
    onAimMove(t.clientX, t.clientY);
    onShootStart();
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === activeTouchRef.current) {
        onAimMove(t.clientX, t.clientY);
        break;
      }
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchRef.current) {
        activeTouchRef.current = null;
        onShootEnd();
        break;
      }
    }
  };

  return (
    <div
      style={{
        position: 'relative', width: '100%', height: '100%',
        background: '#0a0a12', touchAction: 'none',
        cursor: 'none', // hide system cursor; we draw our own crosshair
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
      />

      {/* Mobile hint (shown briefly) */}
      {hud.wave === 1 && (
        <div style={{
          position: 'absolute', bottom: '5%', left: '50%', transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace',
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          Tippen &amp; Ziehen zum Schießen
        </div>
      )}
    </div>
  );
}
