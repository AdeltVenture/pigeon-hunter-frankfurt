import { useRef, useEffect, useCallback, useState } from 'react';
import { useGame } from '../game/useGame';

interface Props {
  onGameOver: (score: number, wave: number) => void;
}

// ─── Virtual Joystick state ───────────────────────────────────────────────────

interface JoystickState {
  active: boolean;
  baseX: number;
  baseY: number;
  curX: number;
  curY: number;
}

const JOYSTICK_RADIUS = 52;
const JOYSTICK_KNOB = 24;

export default function GameCanvas({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { hud, startGame, onJoystick, onCrosshairMove, onShootStart, onShootEnd, onReload } =
    useGame(canvasRef);

  const [joystick, setJoystick] = useState<JoystickState>({
    active: false, baseX: 0, baseY: 0, curX: 0, curY: 0,
  });

  const joystickTouchId = useRef<number | null>(null);
  const crosshairTouchId = useRef<number | null>(null);
  const shootTouchId = useRef<number | null>(null);

  // Start game on mount
  useEffect(() => {
    startGame();
  }, [startGame]);

  // Watch for game over
  useEffect(() => {
    if (hud.phase === 'gameover') {
      setTimeout(() => onGameOver(hud.score, hud.wave), 600);
    }
  }, [hud.phase, hud.score, onGameOver]);

  // ─── Determine touch zone ─────────────────────────────────────────────────

  const getZone = useCallback((x: number): 'left' | 'center' | 'right' => {
    const W = window.innerWidth;
    if (x < W * 0.30) return 'left';
    if (x > W * 0.70) return 'right';
    return 'center';
  }, []);

  // ─── Touch handlers ───────────────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const zone = getZone(t.clientX);

      if (zone === 'left' && joystickTouchId.current === null) {
        joystickTouchId.current = t.identifier;
        setJoystick({ active: true, baseX: t.clientX, baseY: t.clientY, curX: t.clientX, curY: t.clientY });
        onJoystick(0, 0);
      } else if (zone === 'center' && crosshairTouchId.current === null) {
        crosshairTouchId.current = t.identifier;
        onCrosshairMove(t.clientX, t.clientY);
      } else if (zone === 'right' && shootTouchId.current === null) {
        shootTouchId.current = t.identifier;
        onShootStart();
      }
    }
  }, [getZone, onJoystick, onCrosshairMove, onShootStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      if (t.identifier === joystickTouchId.current) {
        setJoystick(prev => {
          const dx = t.clientX - prev.baseX;
          const dy = t.clientY - prev.baseY;
          const dist = Math.hypot(dx, dy);
          const clamped = Math.min(dist, JOYSTICK_RADIUS);
          const angle = Math.atan2(dy, dx);
          const nx = (clamped / JOYSTICK_RADIUS) * Math.cos(angle);
          const ny = (clamped / JOYSTICK_RADIUS) * Math.sin(angle);
          onJoystick(nx, ny);
          return { ...prev, curX: prev.baseX + Math.cos(angle) * clamped, curY: prev.baseY + Math.sin(angle) * clamped };
        });
      } else if (t.identifier === crosshairTouchId.current) {
        onCrosshairMove(t.clientX, t.clientY);
      }
    }
  }, [onJoystick, onCrosshairMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      if (t.identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setJoystick(prev => ({ ...prev, active: false }));
        onJoystick(0, 0);
      } else if (t.identifier === crosshairTouchId.current) {
        crosshairTouchId.current = null;
      } else if (t.identifier === shootTouchId.current) {
        shootTouchId.current = null;
        onShootEnd();
      }
    }
  }, [onJoystick, onShootEnd]);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: '#0a0a12', touchAction: 'none' }}
    >
      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
      />

      {/* Touch overlay – full screen */}
      <div
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />

      {/* Zone dividers (subtle visual guides) */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: '30%', width: 1,
          background: 'rgba(255,255,255,0.04)',
        }}
      />
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: '70%', width: 1,
          background: 'rgba(255,255,255,0.04)',
        }}
      />

      {/* ── Left: Joystick UI ──────────────────────────────────────────────── */}
      <div className="absolute pointer-events-none" style={{ left: '15%', bottom: '14%', transform: 'translate(-50%, 0)' }}>
        <div style={{ position: 'relative', width: JOYSTICK_RADIUS * 2, height: JOYSTICK_RADIUS * 2 }}>
          {/* Outer ring */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.05)',
          }} />
          {/* Label */}
          <div style={{
            position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.30)', fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap',
          }}>
            BEWEGEN
          </div>
          {/* Knob */}
          {joystick.active && (
            <div style={{
              position: 'absolute',
              left: (joystick.curX - joystick.baseX + JOYSTICK_RADIUS) - JOYSTICK_KNOB,
              top: (joystick.curY - joystick.baseY + JOYSTICK_RADIUS) - JOYSTICK_KNOB,
              width: JOYSTICK_KNOB * 2,
              height: JOYSTICK_KNOB * 2,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.35)',
              border: '2px solid rgba(255,255,255,0.6)',
            }} />
          )}
        </div>
      </div>

      {/* ── Center label ──────────────────────────────────────────────────── */}
      <div className="absolute pointer-events-none" style={{
        bottom: '8%', left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.20)', fontSize: 10, fontFamily: 'monospace',
      }}>
        FADENKREUZ BEWEGEN
      </div>

      {/* ── Right: Shoot button ────────────────────────────────────────────── */}
      <div className="absolute pointer-events-none" style={{ right: '7%', bottom: '12%' }}>
        <div style={{
          width: 72, height: 72,
          borderRadius: '50%',
          background: 'rgba(220, 30, 30, 0.75)',
          border: '3px solid rgba(255, 80, 80, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(220,30,30,0.5)',
        }}>
          <span style={{ fontSize: 28 }}>🔫</span>
        </div>
        <div style={{
          textAlign: 'center', marginTop: 6,
          color: 'rgba(255,100,100,0.70)', fontSize: 10, fontFamily: 'monospace',
        }}>
          SCHIESSEN
        </div>
      </div>

      {/* ── Reload button (right zone, above shoot) ────────────────────────── */}
      <div
        className="absolute pointer-events-auto"
        style={{ right: '9%', bottom: '42%' }}
        onTouchStart={(e) => { e.stopPropagation(); onReload(); }}
      >
        <div style={{
          width: 50, height: 50,
          borderRadius: '50%',
          background: hud.reloading ? 'rgba(255,140,0,0.75)' : 'rgba(60,100,60,0.65)',
          border: '2px solid rgba(100,200,100,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: hud.reloading ? '0 0 14px rgba(255,140,0,0.6)' : 'none',
        }}>
          <span style={{ fontSize: 20 }}>🔄</span>
        </div>
        <div style={{
          textAlign: 'center', marginTop: 4,
          color: 'rgba(100,200,100,0.60)', fontSize: 9, fontFamily: 'monospace',
        }}>
          NACHLADEN
        </div>
      </div>
    </div>
  );
}
