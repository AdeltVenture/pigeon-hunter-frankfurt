import type { Pigeon, ShotEffect, HUDState } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pr(seed: number): number {
  return (Math.sin(seed * 127.1 + 311.7) * 43758.5) % 1;
}

function absPr(seed: number): number {
  return Math.abs(pr(seed));
}

// ─── Frankfurt Building Data ──────────────────────────────────────────────────

interface BuildingDef {
  cx: number;   // center x as fraction of width (0..1)
  w: number;    // width as fraction of width
  h: number;    // height as fraction of sky area
  type: 'rect' | 'triangle_top' | 'pyramid' | 'stepped' | 'cylinder' | 'twin';
  windows: boolean;
}

const FAR_BUILDINGS: BuildingDef[] = [
  { cx: 0.38, w: 0.030, h: 0.90, type: 'triangle_top', windows: false }, // Commerzbank
  { cx: 0.22, w: 0.036, h: 0.74, type: 'pyramid',      windows: false }, // Messeturm
  { cx: 0.54, w: 0.026, h: 0.84, type: 'cylinder',     windows: false }, // Main Tower
  { cx: 0.64, w: 0.060, h: 0.68, type: 'twin',         windows: false }, // Westend Gate
  { cx: 0.12, w: 0.024, h: 0.56, type: 'stepped',      windows: false },
  { cx: 0.74, w: 0.028, h: 0.62, type: 'triangle_top', windows: false },
  { cx: 0.84, w: 0.020, h: 0.50, type: 'rect',         windows: false },
  { cx: 0.06, w: 0.028, h: 0.48, type: 'rect',         windows: false },
  { cx: 0.92, w: 0.022, h: 0.44, type: 'rect',         windows: false },
  { cx: 0.47, w: 0.018, h: 0.40, type: 'rect',         windows: false },
  { cx: 0.30, w: 0.020, h: 0.38, type: 'rect',         windows: false },
];

const MID_BUILDINGS: BuildingDef[] = [
  { cx: 0.07, w: 0.10, h: 0.44, type: 'rect',    windows: true },
  { cx: 0.23, w: 0.12, h: 0.38, type: 'stepped', windows: true },
  { cx: 0.40, w: 0.09, h: 0.50, type: 'rect',    windows: true },
  { cx: 0.55, w: 0.14, h: 0.40, type: 'rect',    windows: true },
  { cx: 0.72, w: 0.10, h: 0.46, type: 'rect',    windows: true },
  { cx: 0.88, w: 0.11, h: 0.36, type: 'stepped', windows: true },
  { cx: 0.17, w: 0.07, h: 0.30, type: 'rect',    windows: true },
  { cx: 0.63, w: 0.06, h: 0.34, type: 'rect',    windows: true },
  { cx: 0.96, w: 0.06, h: 0.28, type: 'rect',    windows: true },
];

const NEAR_BUILDINGS: BuildingDef[] = [
  { cx: 0.055, w: 0.14, h: 0.32, type: 'rect', windows: true },
  { cx: 0.200, w: 0.09, h: 0.26, type: 'rect', windows: true },
  { cx: 0.800, w: 0.09, h: 0.28, type: 'rect', windows: true },
  { cx: 0.945, w: 0.14, h: 0.30, type: 'rect', windows: true },
];

// ─── Building draw ────────────────────────────────────────────────────────────

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: BuildingDef,
  W: number,
  skyH: number,
  offsetX: number,
  fillColor: string,
  winColor: string,
  idx: number,
) {
  const bx = b.cx * W + offsetX;
  const bw = b.w * W;
  const bh = b.h * skyH;
  const top = skyH - bh;
  const left = bx - bw / 2;

  ctx.fillStyle = fillColor;

  switch (b.type) {
    case 'rect':
      ctx.fillRect(left, top, bw, bh);
      break;

    case 'triangle_top':
      ctx.fillRect(left, top + bh * 0.12, bw, bh * 0.88);
      ctx.beginPath();
      ctx.moveTo(left, top + bh * 0.12);
      ctx.lineTo(bx, top);
      ctx.lineTo(left + bw, top + bh * 0.12);
      ctx.closePath();
      ctx.fill();
      // Spire
      ctx.fillStyle = fillColor;
      ctx.fillRect(bx - 1.5, top - bh * 0.14, 3, bh * 0.14);
      break;

    case 'pyramid':
      ctx.fillRect(left, top + bh * 0.18, bw, bh * 0.82);
      ctx.beginPath();
      ctx.moveTo(left, top + bh * 0.18);
      ctx.lineTo(bx, top);
      ctx.lineTo(left + bw, top + bh * 0.18);
      ctx.closePath();
      ctx.fill();
      break;

    case 'stepped':
      ctx.fillRect(left, top + bh * 0.55, bw, bh * 0.45);
      ctx.fillRect(left + bw * 0.10, top + bh * 0.25, bw * 0.80, bh * 0.30);
      ctx.fillRect(left + bw * 0.22, top, bw * 0.56, bh * 0.25);
      break;

    case 'cylinder': {
      const cw = bw * 0.76;
      ctx.fillRect(bx - cw / 2, top + bh * 0.05, cw, bh * 0.95);
      // Observation deck disc
      ctx.fillRect(bx - bw * 0.5, top, bw, bh * 0.05);
      // Dome cap
      ctx.beginPath();
      ctx.ellipse(bx, top, bw * 0.38, bh * 0.06, 0, Math.PI, 0);
      ctx.fill();
      // Antenna
      ctx.fillRect(bx - 1, top - bh * 0.10, 2, bh * 0.10);
      break;
    }

    case 'twin': {
      const tow = bw * 0.38;
      ctx.fillRect(left, top, tow, bh);
      ctx.fillRect(left + bw - tow, top, tow, bh);
      // Connecting bridge at top
      ctx.fillRect(left, top + bh * 0.08, bw, bh * 0.04);
      break;
    }
  }

  // Windows (deterministic)
  if (b.windows) {
    ctx.fillStyle = winColor;
    const ww = Math.max(2, bw * 0.09);
    const wh = Math.max(2, bw * 0.11);
    const cols = Math.max(1, Math.floor(bw / (ww * 2.3)));
    const rows = Math.max(1, Math.floor(bh * 0.65 / (wh * 2.3)));
    const sx = left + (bw - cols * ww * 2.3) / 2;
    const sy = top + bh * 0.18;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (absPr(idx * 97 + c * 13 + r * 31) > 0.40) {
          ctx.fillRect(sx + c * ww * 2.3, sy + r * wh * 2.3, ww, wh);
        }
      }
    }
  }
}

// ─── Stars (pre-generated) ────────────────────────────────────────────────────

const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: absPr(i * 17.3 + 1),
  y: absPr(i * 7.91 + 2) * 0.50,
  size: absPr(i * 3.1 + 5) * 1.8 + 0.4,
  twinkleOffset: absPr(i * 5.9 + 3) * Math.PI * 2,
}));

// ─── Sky ──────────────────────────────────────────────────────────────────────

function renderSky(ctx: CanvasRenderingContext2D, W: number, skyH: number, t: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, skyH);
  grad.addColorStop(0.00, '#04040f');
  grad.addColorStop(0.45, '#09132a');
  grad.addColorStop(0.78, '#181235');
  grad.addColorStop(0.90, '#2c0f1e');
  grad.addColorStop(1.00, '#5a1e0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, skyH);

  // City glow at horizon
  const glow = ctx.createLinearGradient(0, skyH * 0.72, 0, skyH);
  glow.addColorStop(0, 'rgba(255, 90, 20, 0)');
  glow.addColorStop(1, 'rgba(255, 70, 15, 0.40)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, skyH * 0.72, W, skyH * 0.28);

  // Stars
  STARS.forEach(s => {
    const bright = 0.45 + 0.55 * Math.sin(t * 0.9 + s.twinkleOffset);
    ctx.fillStyle = `rgba(255, 250, 230, ${bright * 0.85})`;
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * skyH, s.size * 0.65, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ─── Street ───────────────────────────────────────────────────────────────────

function renderStreet(ctx: CanvasRenderingContext2D, W: number, H: number, skyH: number) {
  const sh = H - skyH;
  const vp = W / 2; // vanishing point X

  // Side building walls (street canyon)
  ctx.fillStyle = '#1c2030';
  ctx.fillRect(0, skyH, W * 0.14, sh);
  ctx.fillRect(W * 0.86, skyH, W * 0.14, sh);

  // Asphalt fill
  const asp = ctx.createLinearGradient(0, skyH, 0, H);
  asp.addColorStop(0, '#18182a');
  asp.addColorStop(0.35, '#101018');
  asp.addColorStop(1, '#060608');
  ctx.fillStyle = asp;
  ctx.fillRect(W * 0.14, skyH, W * 0.72, sh);

  // Perspective edge lines
  ctx.strokeStyle = '#2a2a44';
  ctx.lineWidth = 1.5;
  [[W * 0.14], [W * 0.86]].forEach(([from]) => {
    ctx.beginPath();
    ctx.moveTo(from, skyH);
    ctx.lineTo(vp, skyH + sh * 0.28);
    ctx.stroke();
  });

  // Sidewalk lines
  ctx.strokeStyle = 'rgba(80, 80, 110, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.14, skyH);
  ctx.lineTo(W * 0.14, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W * 0.86, skyH);
  ctx.lineTo(W * 0.86, H);
  ctx.stroke();

  // Center dashed line
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.18)';
  ctx.lineWidth = 2;
  ctx.setLineDash([W * 0.025, W * 0.025]);
  ctx.beginPath();
  ctx.moveTo(vp, skyH + sh * 0.10);
  ctx.lineTo(vp, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Street lights
  renderStreetlight(ctx, W * 0.16, skyH, sh * 0.55, true);
  renderStreetlight(ctx, W * 0.84, skyH, sh * 0.55, false);
}

function renderStreetlight(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, h: number, facesRight: boolean,
) {
  const dir = facesRight ? 1 : -1;
  ctx.fillStyle = '#2a2a40';
  ctx.fillRect(x - 2, y, 4, h * 0.58);
  ctx.fillRect(x - 2, y + 3, dir * h * 0.14, 3);
  ctx.fillStyle = '#ffdd77';
  ctx.fillRect(x + dir * (h * 0.14 - 7), y, 14, 5);
  // Light cone
  const cx2 = x + dir * (h * 0.14);
  const cone = ctx.createRadialGradient(cx2, y + 5, 0, cx2, y + 5, h * 0.38);
  cone.addColorStop(0, 'rgba(255, 185, 40, 0.18)');
  cone.addColorStop(1, 'rgba(255, 120, 0, 0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.arc(cx2, y + 5, h * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Full background render ───────────────────────────────────────────────────

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  cameraX: number, t: number,
) {
  const skyH = H * 0.72;

  renderSky(ctx, W, skyH, t);

  // Far buildings (barely move with camera)
  FAR_BUILDINGS.forEach((b, i) =>
    drawBuilding(ctx, b, W, skyH, cameraX * 0.07, '#0c1520', 'transparent', i));

  // Mid buildings
  MID_BUILDINGS.forEach((b, i) =>
    drawBuilding(ctx, b, W, skyH, cameraX * 0.22, '#1a2535', 'rgba(255, 210, 80, 0.55)', i + 100));

  // Near buildings
  NEAR_BUILDINGS.forEach((b, i) =>
    drawBuilding(ctx, b, W, skyH, cameraX * 0.50, '#252d3d', 'rgba(255, 220, 90, 0.72)', i + 200));

  renderStreet(ctx, W, H, skyH);
}

// ─── Pigeon ───────────────────────────────────────────────────────────────────

export function renderPigeon(
  ctx: CanvasRenderingContext2D,
  pigeon: Pigeon,
  sx: number, sy: number,
) {
  if (pigeon.state === 'dead' && pigeon.deadTimer <= 0) return;

  const alpha = pigeon.state === 'dead'
    ? Math.max(0, pigeon.deadTimer / 0.5)
    : 1;

  const s = pigeon.scale;
  const isHit = pigeon.state === 'hit';
  const wA = Math.sin(pigeon.wingPhase) * 0.65;

  // Psycho color tint
  const rr = Math.floor(140 + pigeon.psycho * 55);
  const gg = Math.floor(130 - pigeon.psycho * 55);
  const bb = Math.floor(148 - pigeon.psycho * 80);
  const bodyCol = isHit ? '#ff4420' : `rgb(${rr},${gg},${bb})`;
  const wingCol = isHit ? '#dd3310' : `rgb(${rr - 18},${gg - 12},${bb - 18})`;
  const headCol = isHit ? '#ff4420' : `rgb(${rr - 8},${gg - 8},${bb + 5})`;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(sx, sy);
  ctx.scale(s, s);
  ctx.rotate(pigeon.rotation);

  // Shadow on ground (only if big enough to be meaningful)
  if (pigeon.normalY > 0.4 && pigeon.state !== 'dead') {
    ctx.save();
    ctx.scale(1, 0.15);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, -90 / 0.15, 22 * s, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Rear wing
  ctx.save();
  ctx.rotate(-wA);
  ctx.fillStyle = wingCol;
  ctx.beginPath();
  ctx.ellipse(-14, 2, 19, 7, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  ctx.fillStyle = bodyCol;
  ctx.beginPath();
  ctx.ellipse(0, 0, 21, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail feathers
  ctx.fillStyle = wingCol;
  ctx.beginPath();
  ctx.moveTo(-18, -4);
  ctx.lineTo(-30, -7);
  ctx.lineTo(-30, 7);
  ctx.lineTo(-18, 4);
  ctx.closePath();
  ctx.fill();

  // Front wing
  ctx.save();
  ctx.rotate(wA);
  ctx.fillStyle = isHit ? '#ff5530' : `rgb(${rr + 8},${gg + 4},${bb + 8})`;
  ctx.beginPath();
  ctx.ellipse(10, -2, 19, 7, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Head
  ctx.fillStyle = headCol;
  ctx.beginPath();
  ctx.arc(22, -9, 11, 0, Math.PI * 2);
  ctx.fill();

  // Psycho red glow
  if (pigeon.psycho > 0.45 && !isHit) {
    ctx.shadowColor = `rgba(255, 0, 0, ${pigeon.psycho * 0.7})`;
    ctx.shadowBlur = 14 * pigeon.psycho;
  }

  // Red eye
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(27, -11, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0000';
  ctx.beginPath();
  ctx.arc(28, -11, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(29.5, -12.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#ffcc22';
  ctx.beginPath();
  ctx.moveTo(32, -9);
  ctx.lineTo(41, -7.5);
  ctx.lineTo(32, -6);
  ctx.closePath();
  ctx.fill();

  // Devil horns for ultra-psycho
  if (pigeon.psycho > 0.78 && !pigeon.isBoss) {
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.moveTo(15, -19); ctx.lineTo(11, -29); ctx.lineTo(20, -21); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(26, -19); ctx.lineTo(30, -29); ctx.lineTo(21, -21); ctx.fill();
  }

  // Boss crown
  if (pigeon.isBoss) {
    ctx.fillStyle = '#ffd700';
    [-5, 0, 5].forEach((ox, i) => {
      ctx.beginPath();
      ctx.moveTo(20 + ox - 3, -20);
      ctx.lineTo(20 + ox, -32 - i * 2);
      ctx.lineTo(20 + ox + 3, -20);
      ctx.closePath();
      ctx.fill();
    });
    // Boss health bar
    if (pigeon.health > 0) {
      const bw2 = 60;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-bw2 / 2, -50, bw2, 6);
      ctx.fillStyle = '#ff2200';
      ctx.fillRect(-bw2 / 2, -50, bw2 * (pigeon.health / pigeon.maxHealth), 6);
    }
  }

  ctx.restore();
}

// ─── Shot effects ─────────────────────────────────────────────────────────────

export function renderEffect(ctx: CanvasRenderingContext2D, effect: ShotEffect) {
  ctx.save();
  if (effect.isHit) {
    effect.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * p.life), 0, Math.PI * 2);
      ctx.fill();
    });
    if (effect.scoreText) {
      const rise = (1 - effect.timer) * 40;
      ctx.globalAlpha = Math.min(1, effect.timer * 2);
      ctx.font = `bold ${Math.floor(22)}px monospace`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(effect.scoreText, effect.x, effect.y - rise);
      ctx.fillStyle = '#ffe000';
      ctx.fillText(effect.scoreText, effect.x, effect.y - rise);
    }
  } else {
    ctx.globalAlpha = effect.timer;
    const r = 7 * effect.timer;
    ctx.fillStyle = '#ff7722';
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Crosshair ────────────────────────────────────────────────────────────────

export function renderCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  reloading: boolean, reloadProgress: number,
) {
  ctx.save();
  ctx.translate(x, y);

  const len = 30;
  const gap = 9;
  const col = reloading ? 'rgba(255, 140, 0, 0.92)' : 'rgba(255, 255, 255, 0.92)';

  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 5;
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;

  // Horizontal
  ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(-gap, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gap, 0);  ctx.lineTo(len, 0);  ctx.stroke();
  // Vertical
  ctx.beginPath(); ctx.moveTo(0, -len); ctx.lineTo(0, -gap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, gap);  ctx.lineTo(0, len);  ctx.stroke();

  // Center dot
  ctx.shadowBlur = 0;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, len + 5, 0, Math.PI * 2);
  ctx.stroke();

  // Reload progress arc
  if (reloading) {
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, len + 5, -Math.PI / 2, -Math.PI / 2 + reloadProgress * Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Canvas HUD ───────────────────────────────────────────────────────────────

export function renderHUD(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  hud: HUDState,
) {
  ctx.save();
  ctx.font = 'bold 15px monospace';
  ctx.textBaseline = 'top';

  // Score (top-left)
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(8, 8, 150, 28);
  ctx.fillStyle = '#ffe040';
  ctx.fillText(`SCORE: ${hud.score.toLocaleString()}`, 14, 14);

  // Wave (top-center)
  const waveText = `WELLE ${hud.wave}`;
  ctx.font = 'bold 15px monospace';
  const ww = ctx.measureText(waveText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(W / 2 - ww / 2 - 8, 8, ww + 16, 28);
  ctx.fillStyle = '#80cfff';
  ctx.fillText(waveText, W / 2 - ww / 2, 14);

  // Health (top-right as hearts)
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(W - 105, 8, 98, 28);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < hud.health ? '#ff3355' : '#444455';
    ctx.fillText('♥', W - 98 + i * 30, 11);
  }

  // Ammo (bottom-right area, drawn as bullets)
  const ammoX = W - 55;
  const ammoY = H - 90;
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = hud.reloading ? '#ff8800' : '#aaffaa';
  if (hud.reloading) {
    ctx.fillText(`NACHLADEN…`, W - 130, ammoY);
    // Reload bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W - 130, ammoY + 18, 120, 8);
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(W - 130, ammoY + 18, 120 * hud.reloadProgress, 8);
  } else {
    for (let i = 0; i < hud.maxAmmo; i++) {
      ctx.fillStyle = i < hud.ammo ? '#88ff88' : '#334433';
      ctx.fillRect(ammoX - i * 10, ammoY, 7, 20);
    }
  }

  // Wave message (center screen)
  if (hud.waveMessage) {
    ctx.font = 'bold 26px monospace';
    const mw = ctx.measureText(hud.waveMessage).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(W / 2 - mw / 2 - 16, H / 2 - 24, mw + 32, 48);
    ctx.fillStyle = '#ffdd00';
    ctx.textBaseline = 'middle';
    ctx.fillText(hud.waveMessage, W / 2 - mw / 2, H / 2);
  }

  ctx.restore();
}
