import { useRef, useEffect, useCallback, useState } from 'react';
import type { RefObject } from 'react';
import type { Pigeon, ShotEffect, Particle, HUDState, BehaviorType } from './types';
import { renderBackground, renderPigeon, renderEffect, renderCrosshair, renderHUD } from './renderer';
import { playShot, playHit, playMiss, playWaveStart } from './sounds';

// ─── Internal state ───────────────────────────────────────────────────────────

interface GameInternal {
  crosshairX: number;
  crosshairY: number;
  shootPressed: boolean;
  shootCooldown: number;
  score: number;
  wave: number;
  health: number;
  pigeons: Pigeon[];
  effects: ShotEffect[];
  nextId: number;
  waveSpawned: number;
  waveTarget: number;
  spawnTimer: number;
  betweenWaves: boolean;
  betweenWavesTimer: number;
  waveMessage: string;
  waveMessageTimer: number;
  startTime: number;
  lastFrameTime: number;
  elapsed: number;
  phase: 'playing' | 'gameover';
  gameoverTimer: number;
}

const SHOOT_COOLDOWN = 0.15;
const BETWEEN_WAVES_DELAY = 3.0;
const WAVE_MSG_DURATION = 2.2;
const HUD_INTERVAL = 80;

// ─── Pigeon factory ───────────────────────────────────────────────────────────

let _pid = 0;

function spawnPigeon(wave: number, isBoss: boolean, W: number): Pigeon {
  const psycho = Math.min(0.95, 0.08 + wave * 0.055 + Math.random() * 0.28);
  const behaviors: BehaviorType[] = ['drifter', 'zigzagger', 'diver', 'circler'];
  const weights = [0.40, 0.30, 0.20, 0.10];
  let r = Math.random();
  let behavior: BehaviorType = 'drifter';
  for (let i = 0; i < behaviors.length; i++) {
    if (r < weights[i]) { behavior = behaviors[i]; break; }
    r -= weights[i];
  }

  // Spawn within visible screen width, from the sides
  const side = Math.random() < 0.5 ? -1 : 1;
  const worldX = side * (W * 0.3 + Math.random() * W * 0.18);

  return {
    id: ++_pid,
    worldX,
    normalY: 0.02 + Math.random() * 0.08,
    scale: 0.42,
    vx: 0,
    vy: 0.016 + psycho * 0.022 + Math.random() * 0.012,
    state: 'flying',
    hitTimer: 0,
    deadTimer: 0.8,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 5 + psycho * 5 + Math.random() * 3,
    rotation: 0,
    psycho,
    zigPhase: Math.random() * Math.PI * 2,
    health: isBoss ? 3 : 1,
    maxHealth: isBoss ? 3 : 1,
    isBoss,
    behavior: isBoss ? 'circler' : behavior,
  };
}

// ─── Pigeon update ────────────────────────────────────────────────────────────

function updatePigeon(p: Pigeon, dt: number, W: number): boolean {
  p.wingPhase += p.wingSpeed * dt;
  p.zigPhase += 2.0 * dt;

  if (p.state === 'hit') {
    p.hitTimer -= dt;
    p.rotation += 6 * dt;
    p.normalY += 0.06 * dt;
    if (p.hitTimer <= 0) { p.state = 'dead'; p.deadTimer = 0.8; }
    return true;
  }
  if (p.state === 'dead') {
    p.deadTimer -= dt;
    p.normalY += 0.18 * dt; // fall down
    p.rotation += 8 * dt;
    return p.deadTimer > 0;
  }

  const speed = 1 + p.psycho * 1.4;
  switch (p.behavior) {
    case 'drifter':
      p.vx = Math.sin(p.zigPhase * 0.55) * 110 * speed;
      break;
    case 'zigzagger':
      p.vx = Math.sin(p.zigPhase * 2.0) * 200 * speed;
      break;
    case 'diver':
      if (p.normalY > 0.32) {
        p.vx += (-p.worldX * 0.9 - p.vx) * dt * 3;
        p.vy = Math.min(0.42, p.vy + 0.07 * dt);
      } else {
        p.vx = Math.sin(p.zigPhase * 0.8) * 160 * speed;
      }
      break;
    case 'circler':
      p.vx = Math.cos(p.zigPhase * 0.65) * (p.isBoss ? 260 : 180) * speed;
      p.vy = 0.010 + Math.sin(p.zigPhase * 0.65) * 0.011;
      break;
  }

  p.worldX += p.vx * dt;
  p.normalY += p.vy * dt;
  p.scale = 0.42 + p.normalY * 1.55; // bigger base scale

  // Bounce at screen edges
  const halfW = W * 0.50;
  if (Math.abs(p.worldX) > halfW) {
    p.worldX = Math.sign(p.worldX) * halfW;
    p.vx *= -1;
  }

  // Rotation toward movement
  p.rotation += (Math.atan2(p.vy * 35, p.vx) * 0.12 - p.rotation) * dt * 4;

  // Transition to diving when close
  if (p.behavior !== 'diver' && p.normalY > 0.52 && Math.random() < 0.007) {
    p.behavior = 'diver';
    p.vy = Math.max(p.vy, 0.28);
  }

  return true;
}

// ─── Score ────────────────────────────────────────────────────────────────────

function calcScore(pigeon: Pigeon): number {
  const base = pigeon.isBoss ? 500 : 100;
  return base + Math.floor(pigeon.psycho * 80) + (pigeon.behavior === 'zigzagger' ? 50 : 0);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const INIT_HUD: HUDState = { score: 0, wave: 1, health: 3, waveMessage: '', phase: 'playing' };

export function useGame(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [hud, setHud] = useState<HUDState>(INIT_HUD);
  const stateRef = useRef<GameInternal | null>(null);
  const rafRef = useRef<number>(0);
  const hudTimer = useRef<number>(0);
  const sizeRef = useRef({ W: 0, H: 0 });

  // ── Shoot ────────────────────────────────────────────────────────────────

  const tryShoot = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.phase !== 'playing') return;
    if (s.shootCooldown > 0) return;

    s.shootCooldown = SHOOT_COOLDOWN;
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
              decay: 1.6 + Math.random() * 1.4,
              life: 1,
              size: 4 + Math.random() * 6,
              color: Math.random() < 0.55 ? '#c8c0b0' : (Math.random() < 0.5 ? '#cc2200' : '#f0e060'),
            } as Particle;
          }),
        });
      } else {
        // Boss partial hit
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

  // ── Game loop ────────────────────────────────────────────────────────────

  const loop = useCallback((ts: number) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;

    const dt = Math.min((ts - s.lastFrameTime) / 1000, 0.05);
    s.lastFrameTime = ts;
    s.elapsed = (ts - s.startTime) / 1000;

    const ctx = canvas.getContext('2d')!;
    const { W, H } = sizeRef.current;

    // ── Update ─────────────────────────────────────────────────────────────

    s.shootCooldown = Math.max(0, s.shootCooldown - dt);
    if (s.shootPressed && s.shootCooldown === 0) tryShoot();

    // Pigeons
    s.pigeons = s.pigeons.filter(p => {
      const alive = updatePigeon(p, dt, W);
      if (alive && p.normalY > 0.96 && (p.state === 'flying' || p.state === 'diving')) {
        p.state = 'dead';
        s.health = Math.max(0, s.health - 1);
        if (s.health === 0) { s.phase = 'gameover'; s.gameoverTimer = 1.5; }
        return false;
      }
      return alive;
    });

    // Effects
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

    // Wave message
    if (s.waveMessageTimer > 0) {
      s.waveMessageTimer -= dt;
      if (s.waveMessageTimer <= 0) s.waveMessage = '';
    }

    // Wave spawning
    if (!s.betweenWaves && s.phase === 'playing') {
      s.spawnTimer -= dt;
      const alive = s.pigeons.filter(p => p.state !== 'dead').length;
      if (s.waveSpawned < s.waveTarget && s.spawnTimer <= 0) {
        const isBoss = s.wave % 5 === 0 && s.waveSpawned === 0;
        s.pigeons.push(spawnPigeon(s.wave, isBoss, W));
        s.waveSpawned++;
        s.spawnTimer = Math.max(0.45, 2.0 - s.wave * 0.09);
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

    // ── Render ─────────────────────────────────────────────────────────────

    ctx.clearRect(0, 0, W, H);
    renderBackground(ctx, W, H, s.elapsed);

    const sorted = [...s.pigeons].sort((a, b) => a.scale - b.scale);
    for (const p of sorted) {
      renderPigeon(ctx, p, p.worldX + W / 2, p.normalY * H * 0.70);
    }
    for (const e of s.effects) renderEffect(ctx, e);
    if (s.phase === 'playing') renderCrosshair(ctx, s.crosshairX, s.crosshairY);
    renderHUD(ctx, W, H, { score: s.score, wave: s.wave, health: s.health, waveMessage: s.waveMessage, phase: s.phase });

    // Throttled React state update
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

  // ── Resize ───────────────────────────────────────────────────────────────

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

  // ── Start ────────────────────────────────────────────────────────────────

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
      waveMessage: 'LOS GEHT\'S!', waveMessageTimer: 2.2,
      startTime: now, lastFrameTime: now, elapsed: 0,
      phase: 'playing', gameoverTimer: 1.5,
    };
    setHud(INIT_HUD);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [canvasRef, handleResize, loop]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(rafRef.current); };
  }, [handleResize]);

  // ── Input handlers ───────────────────────────────────────────────────────

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
