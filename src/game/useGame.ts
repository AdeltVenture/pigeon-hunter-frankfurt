import { useRef, useEffect, useCallback, useState } from 'react';
import type { RefObject } from 'react';
import type { Pigeon, ShotEffect, Particle, HUDState, BehaviorType } from './types';
import { renderBackground, renderGunBarrel, renderPigeon, renderEffect, renderCrosshair, renderHUD } from './renderer';
import { playShot, playHit, playMiss, playWaveStart } from './sounds';

interface GameInternal {
  crosshairX: number; crosshairY: number;
  shootPressed: boolean; shootCooldown: number;
  score: number; wave: number; health: number;
  pigeons: Pigeon[]; effects: ShotEffect[]; nextId: number;
  waveSpawned: number; waveTarget: number; spawnTimer: number;
  betweenWaves: boolean; betweenWavesTimer: number;
  waveMessage: string; waveMessageTimer: number;
  startTime: number; lastFrameTime: number; elapsed: number;
  phase: 'playing' | 'gameover'; gameoverTimer: number;
  shotFlash: number;
}

const SHOOT_COOLDOWN = 0.14;
const BETWEEN_WAVES_DELAY = 3.0;
const WAVE_MSG_DURATION = 2.2;
const HUD_INTERVAL = 80;

let _pid = 0;

function spawnPigeon(wave: number, isBoss: boolean, W: number): Pigeon {
  const psycho = Math.min(0.95, 0.10 + wave * 0.06 + Math.random() * 0.28);

  // Wave-scaled behavior weights — more aggressive types at higher waves
  const allBehaviors: BehaviorType[] = ['drifter', 'zigzagger', 'diver', 'circler', 'strafe', 'swoop', 'boomerang', 'kamikaze'];
  const w = Math.min(wave, 8);
  const weights = [
    Math.max(0.05, 0.35 - w * 0.04),  // drifter
    Math.max(0.08, 0.25 - w * 0.02),  // zigzagger
    0.10,                               // diver
    0.08,                               // circler
    Math.min(0.20, w * 0.025),         // strafe
    Math.min(0.18, w * 0.022),         // swoop
    Math.min(0.15, w * 0.018),         // boomerang
    Math.min(0.12, Math.max(0, (w - 3) * 0.030)), // kamikaze (wave 4+)
  ];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let behavior: BehaviorType = 'drifter';
  for (let i = 0; i < allBehaviors.length; i++) {
    if (r < weights[i]) { behavior = allBehaviors[i]; break; }
    r -= weights[i];
  }

  const side = Math.random() < 0.5 ? -1 : 1;
  const worldX = side * (W * 0.3 + Math.random() * W * 0.18);

  return {
    id: ++_pid,
    worldX,
    normalY: 0.02 + Math.random() * 0.06,
    scale: 0.42,
    vx: 0,
    vy: 0.018 + psycho * 0.025 + Math.random() * 0.014,
    state: 'flying',
    hitTimer: 0, deadTimer: 0.8,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 6 + psycho * 6 + Math.random() * 3,
    rotation: 0, psycho,
    zigPhase: Math.random() * Math.PI * 2,
    health: isBoss ? 3 : 1, maxHealth: isBoss ? 3 : 1,
    isBoss,
    behavior: isBoss ? 'circler' : behavior,
  };
}

function updatePigeon(p: Pigeon, dt: number, W: number, _H: number, cxWorldX: number, cxNormY: number): boolean {
  p.wingPhase += p.wingSpeed * dt;
  p.zigPhase += 2.2 * dt;

  if (p.state === 'hit') {
    p.hitTimer -= dt;
    p.rotation += 6 * dt;
    p.normalY += 0.06 * dt;
    if (p.hitTimer <= 0) { p.state = 'dead'; p.deadTimer = 0.8; }
    return true;
  }
  if (p.state === 'dead') {
    p.deadTimer -= dt;
    p.normalY += 0.22 * dt;
    p.rotation += 10 * dt;
    return p.deadTimer > 0;
  }

  const speed = 1.2 + p.psycho * 1.8;

  switch (p.behavior) {
    case 'drifter':
      // Occasional speed burst
      p.vx = Math.sin(p.zigPhase * 0.55) * 120 * speed;
      if (Math.sin(p.zigPhase * 0.3) > 0.85) p.vx *= 2.2;
      break;

    case 'zigzagger':
      // Sharp high-frequency zig-zag with random reversals
      p.vx = Math.sin(p.zigPhase * 2.8) * 240 * speed;
      if (Math.abs(Math.sin(p.zigPhase * 1.4)) > 0.92) p.vx *= -2;
      break;

    case 'diver':
      if (p.normalY > 0.28) {
        p.vx += (-p.worldX * 1.1 - p.vx) * dt * 3.5;
        p.vy = Math.min(0.52, p.vy + 0.09 * dt);
      } else {
        p.vx = Math.sin(p.zigPhase * 1.0) * 180 * speed;
      }
      break;

    case 'circler':
      p.vx = Math.cos(p.zigPhase * 0.7) * (p.isBoss ? 280 : 200) * speed;
      p.vy = 0.012 + Math.sin(p.zigPhase * 0.7) * 0.014;
      break;

    case 'kamikaze': {
      // Locks onto crosshair and accelerates toward it aggressively
      const toDx = cxWorldX - p.worldX;
      const normDist = Math.hypot(toDx, (cxNormY - p.normalY) * W);
      if (normDist > 5) {
        const accel = 420 * speed;
        p.vx += (toDx / normDist) * accel * dt;
        const dyNorm = cxNormY - p.normalY;
        p.vy += (dyNorm > 0 ? 1 : -0.3) * 0.08 * dt;
      }
      // Speed cap
      const spd = Math.abs(p.vx);
      if (spd > 480) p.vx *= 480 / spd;
      p.vy = Math.min(0.55, Math.max(0.005, p.vy));
      // Occasional fake-out: reverse direction briefly
      if (Math.sin(p.zigPhase * 0.8) > 0.97) p.vx *= -0.6;
      break;
    }

    case 'strafe':
      // Very rapid, erratic sideways bursts — hard to track
      p.vx = Math.sign(Math.sin(p.zigPhase * 3.5)) * 280 * speed;
      if (Math.random() < 0.015) p.vx *= -1.5; // sudden snap reversal
      p.vy = 0.010 + Math.abs(Math.sin(p.zigPhase * 1.8)) * 0.018;
      break;

    case 'swoop': {
      // Fast horizontal movement + rhythmic vertical dips (swoop pattern)
      const swoopDir = Math.sin(p.zigPhase * 0.4) > 0 ? 1 : -1;
      p.vx = swoopDir * 220 * speed;
      // Swoop down then up repeatedly
      p.vy = 0.035 + Math.sin(p.zigPhase * 1.5) * 0.030;
      if (p.normalY > 0.55) p.vy = -0.02; // pull up when too low
      if (p.normalY < 0.05) p.vy = Math.max(p.vy, 0.015); // don't go off top
      break;
    }

    case 'boomerang': {
      // Flies hard in one direction, then snaps back — surprise attack
      const dir = Math.cos(p.zigPhase * 0.45) > 0 ? 1 : -1;
      p.vx = dir * 310 * speed;
      // Accelerates toward center when far out
      if (Math.abs(p.worldX) > W * 0.38) p.vx *= -1.4;
      break;
    }
  }

  p.worldX += p.vx * dt;
  p.normalY += p.vy * dt;
  p.scale = 0.42 + p.normalY * 1.55;

  // Bounce at screen edges
  const halfW = W * 0.50;
  if (Math.abs(p.worldX) > halfW) {
    p.worldX = Math.sign(p.worldX) * halfW;
    p.vx *= -1;
  }

  p.rotation += (Math.atan2(p.vy * 35, p.vx) * 0.12 - p.rotation) * dt * 4;

  // Any non-diver can transition to dive when low
  if (p.behavior !== 'diver' && p.behavior !== 'kamikaze' && p.normalY > 0.55 && Math.random() < 0.006) {
    p.behavior = 'diver';
    p.vy = Math.max(p.vy, 0.30);
  }

  return true;
}

function calcScore(pigeon: Pigeon): number {
  const base = pigeon.isBoss ? 500 : 100;
  const behaviorBonus: Record<BehaviorType, number> = {
    drifter: 0, diver: 20, circler: 30, zigzagger: 50,
    strafe: 60, swoop: 55, boomerang: 70, kamikaze: 90,
  };
  return base + Math.floor(pigeon.psycho * 80) + (behaviorBonus[pigeon.behavior] ?? 0);
}

const INIT_HUD: HUDState = { score: 0, wave: 1, health: 3, waveMessage: '', phase: 'playing' };

export function useGame(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [hud, setHud] = useState<HUDState>(INIT_HUD);
  const stateRef = useRef<GameInternal | null>(null);
  const rafRef = useRef<number>(0);
  const hudTimer = useRef<number>(0);
  const sizeRef = useRef({ W: 0, H: 0 });

  const tryShoot = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.phase !== 'playing') return;
    if (s.shootCooldown > 0) return;

    s.shootCooldown = SHOOT_COOLDOWN;
    s.shotFlash = 1.0;
    playShot();

    const { W, H } = sizeRef.current;
    const cx = s.crosshairX;
    const cy = s.crosshairY;

    let hit: Pigeon | null = null;
    let bestDist = Infinity;
    for (const p of s.pigeons) {
      if (p.state !== 'flying' && p.state !== 'diving') continue;
      const px = p.worldX + W / 2;
      const py = p.normalY * H * 0.70;
      const hitR = Math.max(32, p.scale * 52);
      const dist = Math.hypot(cx - px, cy - py);
      if (dist < hitR && dist < bestDist) { bestDist = dist; hit = p; }
    }

    if (hit) {
      hit.health--;
      if (hit.health <= 0) {
        hit.state = 'hit';
        hit.hitTimer = 0.4;
        const points = calcScore(hit);
        s.score += points;
        playHit();
        const px = hit.worldX + W / 2;
        const py = hit.normalY * H * 0.70;
        s.effects.push({
          id: s.nextId++, x: px, y: py, isHit: true, timer: 1.0,
          scoreText: `+${points}`,
          particles: Array.from({ length: 20 }, (_, i) => {
            const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.4;
            const spd = 70 + Math.random() * 130;
            return {
              x: px, y: py,
              vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 40,
              decay: 1.6 + Math.random() * 1.4, life: 1,
              size: 4 + Math.random() * 6,
              color: Math.random() < 0.55 ? '#c8c0b0' : (Math.random() < 0.5 ? '#cc2200' : '#f0e060'),
            } as Particle;
          }),
        });
      } else {
        playHit();
        const px = hit.worldX + W / 2;
        const py = hit.normalY * H * 0.70;
        s.effects.push({ id: s.nextId++, x: px, y: py, isHit: true, timer: 0.5, scoreText: '💥', particles: [] });
      }
    } else {
      playMiss();
      s.effects.push({ id: s.nextId++, x: cx, y: cy, isHit: false, timer: 0.45, particles: [] });
    }
  }, []);

  const loop = useCallback((ts: number) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;

    const dt = Math.min((ts - s.lastFrameTime) / 1000, 0.05);
    s.lastFrameTime = ts;
    s.elapsed = (ts - s.startTime) / 1000;

    const ctx = canvas.getContext('2d')!;
    const { W, H } = sizeRef.current;

    s.shootCooldown = Math.max(0, s.shootCooldown - dt);
    s.shotFlash = Math.max(0, s.shotFlash - dt * 5);
    if (s.shootPressed && s.shootCooldown === 0) tryShoot();

    // Crosshair world coords for kamikaze tracking
    const cxWorldX = s.crosshairX - W / 2;
    const cxNormY = s.crosshairY / (H * 0.70);

    s.pigeons = s.pigeons.filter(p => {
      const alive = updatePigeon(p, dt, W, H, cxWorldX, cxNormY);
      if (alive && p.normalY > 0.96 && (p.state === 'flying' || p.state === 'diving')) {
        p.state = 'dead';
        s.health = Math.max(0, s.health - 1);
        if (s.health === 0) { s.phase = 'gameover'; s.gameoverTimer = 1.5; }
        return false;
      }
      return alive;
    });

    s.effects = s.effects.filter(e => {
      e.timer -= dt;
      e.particles.forEach(p => {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 170 * dt;
        p.life -= p.decay * dt;
      });
      e.particles = e.particles.filter(p => p.life > 0);
      return e.timer > 0 || e.particles.length > 0;
    });

    if (s.waveMessageTimer > 0) {
      s.waveMessageTimer -= dt;
      if (s.waveMessageTimer <= 0) s.waveMessage = '';
    }

    if (!s.betweenWaves && s.phase === 'playing') {
      s.spawnTimer -= dt;
      const alive = s.pigeons.filter(p => p.state !== 'dead').length;
      if (s.waveSpawned < s.waveTarget && s.spawnTimer <= 0) {
        const isBoss = s.wave % 5 === 0 && s.waveSpawned === 0;
        s.pigeons.push(spawnPigeon(s.wave, isBoss, W));
        s.waveSpawned++;
        s.spawnTimer = Math.max(0.40, 1.8 - s.wave * 0.08);
      }
      if (s.waveSpawned >= s.waveTarget && alive === 0) {
        s.betweenWaves = true;
        s.betweenWavesTimer = BETWEEN_WAVES_DELAY;
        s.wave++;
        s.waveMessage = `WELLE ${s.wave}!`;
        s.waveMessageTimer = WAVE_MSG_DURATION;
        playWaveStart();
      }
    }
    if (s.betweenWaves) {
      s.betweenWavesTimer -= dt;
      if (s.betweenWavesTimer <= 0) {
        s.betweenWaves = false;
        s.waveSpawned = 0;
        s.waveTarget = 4 + s.wave * 2 + Math.floor(Math.random() * 3);
        s.spawnTimer = 0;
      }
    }

    if (s.phase === 'gameover') s.gameoverTimer -= dt;

    // ── Render ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);
    renderBackground(ctx, W, H, s.elapsed);

    const sorted = [...s.pigeons].sort((a, b) => a.scale - b.scale);
    for (const p of sorted) {
      renderPigeon(ctx, p, p.worldX + W / 2, p.normalY * H * 0.70);
    }
    for (const e of s.effects) renderEffect(ctx, e);

    // Gun barrel (FPS view) — drawn over pigeons, under crosshair
    renderGunBarrel(ctx, W, H, s.shotFlash, s.crosshairX, s.crosshairY);

    if (s.phase === 'playing') renderCrosshair(ctx, s.crosshairX, s.crosshairY);
    renderHUD(ctx, W, H, { score: s.score, wave: s.wave, health: s.health, waveMessage: s.waveMessage, phase: s.phase });

    const now = Date.now();
    if (now - hudTimer.current > HUD_INTERVAL) {
      hudTimer.current = now;
      setHud({ score: s.score, wave: s.wave, health: s.health, waveMessage: s.waveMessage, phase: s.phase });
    }

    if (s.phase !== 'gameover' || s.gameoverTimer > 0) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      setHud(prev => ({ ...prev, phase: 'gameover' }));
    }
  }, [canvasRef, tryShoot]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    sizeRef.current = { W, H };
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    if (stateRef.current) {
      stateRef.current.crosshairX = W / 2;
      stateRef.current.crosshairY = H / 2;
    }
  }, [canvasRef]);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    handleResize();
    const { W, H } = sizeRef.current;
    const now = performance.now();
    stateRef.current = {
      crosshairX: W / 2, crosshairY: H / 2,
      shootPressed: false, shootCooldown: 0,
      score: 0, wave: 1, health: 3,
      pigeons: [], effects: [], nextId: 1,
      waveSpawned: 0, waveTarget: 5, spawnTimer: 0.8,
      betweenWaves: false, betweenWavesTimer: 0,
      waveMessage: "LOS GEHT'S!", waveMessageTimer: 2.2,
      startTime: now, lastFrameTime: now, elapsed: 0,
      phase: 'playing', gameoverTimer: 1.5,
      shotFlash: 0,
    };
    setHud(INIT_HUD);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [canvasRef, handleResize, loop]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(rafRef.current); };
  }, [handleResize]);

  const onAimMove = useCallback((x: number, y: number) => {
    if (stateRef.current) { stateRef.current.crosshairX = x; stateRef.current.crosshairY = y; }
  }, []);

  const onShootStart = useCallback(() => {
    if (stateRef.current) { stateRef.current.shootPressed = true; tryShoot(); }
  }, [tryShoot]);

  const onShootEnd = useCallback(() => {
    if (stateRef.current) stateRef.current.shootPressed = false;
  }, []);

  return { hud, startGame, onAimMove, onShootStart, onShootEnd };
}
