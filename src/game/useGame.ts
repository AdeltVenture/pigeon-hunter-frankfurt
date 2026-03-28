import { useRef, useEffect, useCallback, useState } from 'react';
import type { RefObject } from 'react';
import type { Pigeon, ShotEffect, Particle, HUDState, BehaviorType } from './types';
import {
  renderBackground, renderPigeon, renderEffect, renderCrosshair, renderHUD,
} from './renderer';

// ─── Internal game state (all in ref for performance) ─────────────────────────

interface GameInternal {
  // Camera
  cameraX: number;
  targetCameraX: number;

  // Crosshair (screen px)
  crosshairX: number;
  crosshairY: number;

  // Input
  joystickX: number;
  joystickY: number;
  shootPressed: boolean;
  shootCooldown: number;

  // Player
  score: number;
  wave: number;
  health: number;
  ammo: number;
  maxAmmo: number;
  reloading: boolean;
  reloadProgress: number; // 0..1

  // Entities
  pigeons: Pigeon[];
  effects: ShotEffect[];
  nextId: number;

  // Wave
  waveSpawned: number;
  waveTarget: number;
  spawnTimer: number;
  betweenWaves: boolean;
  betweenWavesTimer: number;
  waveMessage: string;
  waveMessageTimer: number;

  // Timing
  startTime: number;
  lastFrameTime: number;
  elapsed: number;

  // Phase
  phase: 'playing' | 'gameover';
  gameoverTimer: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RELOAD_DURATION = 2.2;
const SHOOT_COOLDOWN = 0.18;
const BETWEEN_WAVES_DELAY = 3.5;
const WAVE_MESSAGE_DURATION = 2.5;
const HUD_UPDATE_INTERVAL = 80; // ms

// ─── Pigeon factory ───────────────────────────────────────────────────────────

let _pid = 0;

function spawnPigeon(wave: number, isBoss: boolean): Pigeon {
  const psycho = Math.min(0.95, 0.1 + wave * 0.06 + Math.random() * 0.3);
  const behaviors: BehaviorType[] = ['drifter', 'zigzagger', 'diver', 'circler'];
  const behaviorWeights = [0.40, 0.30, 0.20, 0.10];
  let r = Math.random();
  let behavior: BehaviorType = 'drifter';
  for (let i = 0; i < behaviors.length; i++) {
    if (r < behaviorWeights[i]) { behavior = behaviors[i]; break; }
    r -= behaviorWeights[i];
  }

  const spawnSide = Math.random() < 0.5 ? -1 : 1;
  const worldX = spawnSide * (600 + Math.random() * 600);

  return {
    id: ++_pid,
    worldX,
    normalY: 0.02 + Math.random() * 0.10,
    scale: 0.30,
    vx: 0,
    vy: 0.018 + psycho * 0.025 + Math.random() * 0.015,
    state: 'flying',
    hitTimer: 0,
    deadTimer: 0.6,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 5 + psycho * 6 + Math.random() * 4,
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

function updatePigeon(p: Pigeon, dt: number, _W: number): boolean {
  p.wingPhase += p.wingSpeed * dt;
  p.zigPhase += 2.2 * dt;

  if (p.state === 'hit') {
    p.hitTimer -= dt;
    p.rotation += 4 * dt;
    p.normalY += 0.08 * dt;
    p.scale = Math.max(0, p.scale - 0.3 * dt);
    if (p.hitTimer <= 0) { p.state = 'dead'; p.deadTimer = 0.6; }
    return true;
  }

  if (p.state === 'dead') {
    p.deadTimer -= dt;
    return p.deadTimer > 0;
  }

  // Movement by behavior
  const speed = 1 + p.psycho * 1.5;
  switch (p.behavior) {
    case 'drifter':
      p.vx = Math.sin(p.zigPhase * 0.6) * 120 * speed;
      break;
    case 'zigzagger':
      p.vx = Math.sin(p.zigPhase * 2.2) * 220 * speed;
      break;
    case 'diver':
      if (p.normalY > 0.35) {
        // Dive toward center
        p.vx += (-p.worldX * 0.8 - p.vx) * dt * 3;
        p.vy = Math.min(0.45, p.vy + 0.08 * dt);
      } else {
        p.vx = Math.sin(p.zigPhase * 0.8) * 180 * speed;
      }
      break;
    case 'circler':
      p.vx = Math.cos(p.zigPhase * 0.7) * (p.isBoss ? 280 : 200) * speed;
      p.vy = 0.012 + Math.sin(p.zigPhase * 0.7) * 0.012;
      break;
  }

  p.worldX += p.vx * dt;
  p.normalY += p.vy * dt;
  p.scale = 0.28 + p.normalY * 1.35;

  // Slight facing rotation based on vx
  const targetRot = Math.atan2(p.vy * 40, p.vx) * 0.15;
  p.rotation += (targetRot - p.rotation) * dt * 5;

  // Transition to diving when close enough
  if (p.behavior !== 'diver' && p.normalY > 0.55 && Math.random() < 0.008) {
    p.behavior = 'diver';
    p.vy = Math.max(p.vy, 0.30);
  }

  return true;
}

// ─── Score helper ─────────────────────────────────────────────────────────────

function calcScore(pigeon: Pigeon, crosshairY: number, H: number): number {
  const base = pigeon.isBoss ? 500 : 100;
  const pigeonScreenY = pigeon.normalY * H * 0.72;
  const isHeadshot = crosshairY < pigeonScreenY - 5;
  return base + (isHeadshot ? 150 : 0) + Math.floor(pigeon.psycho * 80);
}

// ─── Main hook ────────────────────────────────────────────────────────────────

const INITIAL_HUD: HUDState = {
  score: 0, wave: 1, health: 3, ammo: 6, maxAmmo: 6,
  reloading: false, reloadProgress: 0, waveMessage: '', phase: 'playing',
};

export function useGame(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [hud, setHud] = useState<HUDState>(INITIAL_HUD);
  const stateRef = useRef<GameInternal | null>(null);
  const rafRef = useRef<number>(0);
  const hudTimerRef = useRef<number>(0);
  const dprRef = useRef(1);
  const sizeRef = useRef({ W: 0, H: 0 });

  // ─── Shooting logic ─────────────────────────────────────────────────────────

  const tryShoot = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.phase !== 'playing') return;
    if (s.reloading || s.ammo <= 0 || s.shootCooldown > 0) return;

    s.ammo--;
    s.shootCooldown = SHOOT_COOLDOWN;

    const { W, H } = sizeRef.current;
    const cx = s.crosshairX;
    const cy = s.crosshairY;

    // Hit detection: find closest pigeon under crosshair
    let hit: Pigeon | null = null;
    let bestDist = Infinity;

    for (const p of s.pigeons) {
      if (p.state !== 'flying' && p.state !== 'diving') continue;
      const sx = p.worldX - s.cameraX + W / 2;
      const sy = p.normalY * H * 0.72;
      const hitR = Math.max(25, p.scale * 38);
      const dist = Math.hypot(cx - sx, cy - sy);
      if (dist < hitR && dist < bestDist) {
        bestDist = dist;
        hit = p;
      }
    }

    if (hit) {
      hit.health--;
      if (hit.health <= 0) {
        hit.state = 'hit';
        hit.hitTimer = 0.35;
        const points = calcScore(hit, cy, H);
        s.score += points;
        const sx = hit.worldX - s.cameraX + W / 2;
        const sy = hit.normalY * H * 0.72;
        s.effects.push({
          id: s.nextId++,
          x: sx, y: sy,
          isHit: true,
          timer: 1.0,
          scoreText: `+${points}`,
          particles: Array.from({ length: 18 }, (_, i) => {
            const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.5;
            const spd = 60 + Math.random() * 120;
            return {
              x: sx, y: sy,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd - 30,
              decay: 1.8 + Math.random() * 1.5,
              life: 1,
              size: 3 + Math.random() * 5,
              color: Math.random() < 0.6 ? '#aaaaaa' : '#cc2200',
            } as Particle;
          }),
        });
      } else {
        // Boss hit (not dead yet)
        const sx = hit.worldX - s.cameraX + W / 2;
        const sy = hit.normalY * H * 0.72;
        s.effects.push({
          id: s.nextId++, x: sx, y: sy,
          isHit: true, timer: 0.6,
          scoreText: '💥',
          particles: [],
        });
      }
    } else {
      // Miss
      s.effects.push({
        id: s.nextId++,
        x: cx, y: cy,
        isHit: false,
        timer: 0.5,
        particles: [],
      });
    }

    if (s.ammo === 0 && !s.reloading) {
      s.reloading = true;
      s.reloadProgress = 0;
    }
  }, [canvasRef]);

  // ─── Game loop ──────────────────────────────────────────────────────────────

  const loop = useCallback((ts: number) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;

    const dt = Math.min((ts - s.lastFrameTime) / 1000, 0.05);
    s.lastFrameTime = ts;
    s.elapsed = (ts - s.startTime) / 1000;

    const ctx = canvas.getContext('2d')!;
    const { W, H } = sizeRef.current;

    // ── Update ──────────────────────────────────────────────────────────────

    // Camera
    const cameraSpeed = 380;
    s.targetCameraX = Math.max(-500, Math.min(500, s.targetCameraX + s.joystickX * cameraSpeed * dt));
    s.cameraX += (s.targetCameraX - s.cameraX) * Math.min(1, dt * 8);

    // Crosshair clamp
    s.crosshairX = Math.max(W * 0.28, Math.min(W * 0.72, s.crosshairX));
    s.crosshairY = Math.max(H * 0.08, Math.min(H * 0.88, s.crosshairY));

    // Shoot auto-repeat if held
    s.shootCooldown = Math.max(0, s.shootCooldown - dt);
    if (s.shootPressed && s.shootCooldown === 0 && !s.reloading && s.ammo > 0) {
      tryShoot();
    }

    // Reload
    if (s.reloading) {
      s.reloadProgress = Math.min(1, s.reloadProgress + dt / RELOAD_DURATION);
      if (s.reloadProgress >= 1) {
        s.reloading = false;
        s.ammo = s.maxAmmo;
      }
    }

    // Pigeons update
    s.pigeons = s.pigeons.filter(p => {
      const alive = updatePigeon(p, dt, W);
      if (alive && p.normalY > 0.95 && (p.state === 'flying' || p.state === 'diving')) {
        // Pigeon reached player
        p.state = 'dead';
        s.health = Math.max(0, s.health - 1);
        if (s.health === 0) {
          s.phase = 'gameover';
          s.gameoverTimer = 1.5;
        }
        return false;
      }
      return alive;
    });

    // Effects update
    s.effects = s.effects.filter(e => {
      e.timer -= dt;
      e.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 160 * dt; // gravity
        p.life -= p.decay * dt;
      });
      e.particles = e.particles.filter(p => p.life > 0);
      return e.timer > 0 || e.particles.length > 0;
    });

    // Wave message countdown
    if (s.waveMessageTimer > 0) {
      s.waveMessageTimer -= dt;
      if (s.waveMessageTimer <= 0) s.waveMessage = '';
    }

    // Wave spawning
    if (!s.betweenWaves && s.phase === 'playing') {
      s.spawnTimer -= dt;
      const remaining = s.pigeons.filter(p => p.state !== 'dead').length;

      if (s.waveSpawned < s.waveTarget && s.spawnTimer <= 0) {
        const isBoss = s.waveTarget <= 1 && s.wave % 5 === 0;
        s.pigeons.push(spawnPigeon(s.wave, isBoss));
        s.waveSpawned++;
        s.spawnTimer = Math.max(0.5, 2.2 - s.wave * 0.1);
      }

      if (s.waveSpawned >= s.waveTarget && remaining === 0) {
        // Wave complete
        s.betweenWaves = true;
        s.betweenWavesTimer = BETWEEN_WAVES_DELAY;
        s.wave++;
        s.waveMessage = `WELLE ${s.wave} KOMMT!`;
        s.waveMessageTimer = WAVE_MESSAGE_DURATION;
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

    // Game over delay
    if (s.phase === 'gameover') {
      s.gameoverTimer -= dt;
    }

    // ── Render ──────────────────────────────────────────────────────────────

    ctx.clearRect(0, 0, W, H);

    renderBackground(ctx, W, H, s.cameraX, s.elapsed);

    // Sort pigeons back-to-front (small scale first)
    const sortedPigeons = [...s.pigeons].sort((a, b) => a.scale - b.scale);
    for (const p of sortedPigeons) {
      const sx = p.worldX - s.cameraX + W / 2;
      const sy = p.normalY * H * 0.72;
      renderPigeon(ctx, p, sx, sy);
    }

    for (const e of s.effects) renderEffect(ctx, e);

    if (s.phase === 'playing') {
      renderCrosshair(ctx, s.crosshairX, s.crosshairY, s.reloading, s.reloadProgress);
    }

    renderHUD(ctx, W, H, {
      score: s.score,
      wave: s.wave,
      health: s.health,
      ammo: s.ammo,
      maxAmmo: s.maxAmmo,
      reloading: s.reloading,
      reloadProgress: s.reloadProgress,
      waveMessage: s.waveMessage,
      phase: s.phase,
    });

    // ── HUD state update (throttled) ────────────────────────────────────────

    const now = Date.now();
    if (now - hudTimerRef.current > HUD_UPDATE_INTERVAL) {
      hudTimerRef.current = now;
      setHud({
        score: s.score,
        wave: s.wave,
        health: s.health,
        ammo: s.ammo,
        maxAmmo: s.maxAmmo,
        reloading: s.reloading,
        reloadProgress: s.reloadProgress,
        waveMessage: s.waveMessage,
        phase: s.phase,
      });
    }

    if (s.phase !== 'gameover' || s.gameoverTimer > 0) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      // Final HUD update
      setHud(prev => ({ ...prev, phase: 'gameover' }));
    }
  }, [canvasRef, tryShoot]);

  // ─── Resize handler ─────────────────────────────────────────────────────────

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const W = window.innerWidth;
    const H = window.innerHeight;
    sizeRef.current = { W, H };
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Re-center crosshair
    if (stateRef.current) {
      stateRef.current.crosshairX = W / 2;
      stateRef.current.crosshairY = H / 2;
    }
  }, [canvasRef]);

  // ─── Start game ─────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    handleResize();

    const { W, H } = sizeRef.current;

    const now = performance.now();
    stateRef.current = {
      cameraX: 0,
      targetCameraX: 0,
      crosshairX: W / 2,
      crosshairY: H / 2,
      joystickX: 0,
      joystickY: 0,
      shootPressed: false,
      shootCooldown: 0,
      score: 0,
      wave: 1,
      health: 3,
      ammo: 6,
      maxAmmo: 6,
      reloading: false,
      reloadProgress: 0,
      pigeons: [],
      effects: [],
      nextId: 1,
      waveSpawned: 0,
      waveTarget: 6,
      spawnTimer: 0.8,
      betweenWaves: false,
      betweenWavesTimer: 0,
      waveMessage: 'JAGD BEGINNT!',
      waveMessageTimer: 2.5,
      startTime: now,
      lastFrameTime: now,
      elapsed: 0,
      phase: 'playing',
      gameoverTimer: 1.5,
    };

    setHud(INITIAL_HUD);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [canvasRef, handleResize, loop]);

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleResize]);

  // ─── Input handlers ─────────────────────────────────────────────────────────

  const onJoystick = useCallback((dx: number, _dy: number) => {
    if (stateRef.current) stateRef.current.joystickX = dx;
  }, []);

  const onCrosshairMove = useCallback((x: number, y: number) => {
    if (stateRef.current) {
      stateRef.current.crosshairX = x;
      stateRef.current.crosshairY = y;
    }
  }, []);

  const onShootStart = useCallback(() => {
    if (stateRef.current) {
      stateRef.current.shootPressed = true;
      tryShoot();
    }
  }, [tryShoot]);

  const onShootEnd = useCallback(() => {
    if (stateRef.current) stateRef.current.shootPressed = false;
  }, []);

  const onReload = useCallback(() => {
    const s = stateRef.current;
    if (s && !s.reloading && s.ammo < s.maxAmmo) {
      s.reloading = true;
      s.reloadProgress = 0;
    }
  }, []);

  return { hud, startGame, onJoystick, onCrosshairMove, onShootStart, onShootEnd, onReload };
}
