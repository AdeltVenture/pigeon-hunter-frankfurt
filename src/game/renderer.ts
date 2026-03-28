import type { Pigeon, ShotEffect, HUDState } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function absPr(seed: number): number {
  return Math.abs((Math.sin(seed * 127.1 + 311.7) * 43758.5) % 1);
}

// ─── Frankfurt Building Data ──────────────────────────────────────────────────

interface BuildingDef {
  cx: number; w: number; h: number;
  type: 'rect' | 'triangle_top' | 'pyramid' | 'stepped' | 'cylinder' | 'twin';
  windows: boolean;
}

const FAR_BUILDINGS: BuildingDef[] = [
  { cx: 0.38, w: 0.030, h: 0.88, type: 'triangle_top', windows: false }, // Commerzbank
  { cx: 0.22, w: 0.036, h: 0.72, type: 'pyramid',      windows: false }, // Messeturm
  { cx: 0.54, w: 0.026, h: 0.82, type: 'cylinder',     windows: false }, // Main Tower
  { cx: 0.64, w: 0.058, h: 0.66, type: 'twin',         windows: false }, // Westend Gate
  { cx: 0.12, w: 0.024, h: 0.54, type: 'stepped',      windows: false },
  { cx: 0.74, w: 0.028, h: 0.60, type: 'triangle_top', windows: false },
  { cx: 0.84, w: 0.020, h: 0.48, type: 'rect',         windows: false },
  { cx: 0.06, w: 0.028, h: 0.46, type: 'rect',         windows: false },
  { cx: 0.92, w: 0.022, h: 0.42, type: 'rect',         windows: false },
  { cx: 0.47, w: 0.018, h: 0.38, type: 'rect',         windows: false },
];

const MID_BUILDINGS: BuildingDef[] = [
  { cx: 0.07, w: 0.10, h: 0.42, type: 'rect',    windows: true },
  { cx: 0.23, w: 0.12, h: 0.36, type: 'stepped', windows: true },
  { cx: 0.40, w: 0.09, h: 0.48, type: 'rect',    windows: true },
  { cx: 0.55, w: 0.14, h: 0.38, type: 'rect',    windows: true },
  { cx: 0.72, w: 0.10, h: 0.44, type: 'rect',    windows: true },
  { cx: 0.88, w: 0.11, h: 0.34, type: 'stepped', windows: true },
  { cx: 0.63, w: 0.06, h: 0.32, type: 'rect',    windows: true },
];

const NEAR_BUILDINGS: BuildingDef[] = [
  { cx: 0.055, w: 0.14, h: 0.30, type: 'rect', windows: true },
  { cx: 0.945, w: 0.14, h: 0.28, type: 'rect', windows: true },
];

// ─── Building draw ────────────────────────────────────────────────────────────

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: BuildingDef, W: number, skyH: number,
  fillColor: string, winColor: string, winDark: string, idx: number,
) {
  const bx = b.cx * W;
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
      ctx.moveTo(left, top + bh * 0.12); ctx.lineTo(bx, top); ctx.lineTo(left + bw, top + bh * 0.12);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(bx - 1.5, top - bh * 0.13, 3, bh * 0.13);
      break;
    case 'pyramid':
      ctx.fillRect(left, top + bh * 0.18, bw, bh * 0.82);
      ctx.beginPath();
      ctx.moveTo(left, top + bh * 0.18); ctx.lineTo(bx, top); ctx.lineTo(left + bw, top + bh * 0.18);
      ctx.closePath(); ctx.fill();
      break;
    case 'stepped':
      ctx.fillRect(left, top + bh * 0.55, bw, bh * 0.45);
      ctx.fillRect(left + bw * 0.10, top + bh * 0.25, bw * 0.80, bh * 0.30);
      ctx.fillRect(left + bw * 0.22, top, bw * 0.56, bh * 0.25);
      break;
    case 'cylinder': {
      const cw = bw * 0.76;
      ctx.fillRect(bx - cw / 2, top + bh * 0.05, cw, bh * 0.95);
      ctx.fillRect(bx - bw * 0.5, top, bw, bh * 0.05);
      ctx.beginPath();
      ctx.ellipse(bx, top, bw * 0.38, bh * 0.06, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(bx - 1, top - bh * 0.10, 2, bh * 0.10);
      break;
    }
    case 'twin': {
      const tw = bw * 0.38;
      ctx.fillRect(left, top, tw, bh);
      ctx.fillRect(left + bw - tw, top, tw, bh);
      ctx.fillRect(left, top + bh * 0.08, bw, bh * 0.04);
      break;
    }
  }

  // Sunlit right edge highlight
  ctx.fillStyle = 'rgba(255, 240, 200, 0.18)';
  ctx.fillRect(left + bw * 0.78, top, bw * 0.22, bh);

  // Windows (deterministic)
  if (b.windows) {
    const ww = Math.max(2, bw * 0.09);
    const wh = Math.max(2, bw * 0.11);
    const cols = Math.max(1, Math.floor(bw / (ww * 2.3)));
    const rows = Math.max(1, Math.floor(bh * 0.65 / (wh * 2.3)));
    const sx = left + (bw - cols * ww * 2.3) / 2;
    const sy = top + bh * 0.18;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = absPr(idx * 97 + c * 13 + r * 31) > 0.35 ? winColor : winDark;
        ctx.fillRect(sx + c * ww * 2.3, sy + r * wh * 2.3, ww, wh);
      }
    }
  }
}

// ─── Clouds ───────────────────────────────────────────────────────────────────

const CLOUD_DEFS = [
  { x: 0.08, y: 0.12, s: 0.11, spd: 8 },
  { x: 0.35, y: 0.07, s: 0.16, spd: 5 },
  { x: 0.62, y: 0.18, s: 0.09, spd: 10 },
  { x: 0.82, y: 0.10, s: 0.13, spd: 7 },
];

function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx - r * 0.45, cy + r * 0.12, r * 0.65, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + r * 0.45, cy + r * 0.12, r * 0.65, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  // Soft shadow at bottom
  ctx.fillStyle = 'rgba(180,210,240,0.25)';
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.5, r * 0.85, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
}

// ─── Sky ──────────────────────────────────────────────────────────────────────

function renderSky(ctx: CanvasRenderingContext2D, W: number, skyH: number, t: number) {
  // Bright daytime sky
  const grad = ctx.createLinearGradient(0, 0, 0, skyH);
  grad.addColorStop(0.00, '#1a6ab8');
  grad.addColorStop(0.30, '#3d8fd4');
  grad.addColorStop(0.60, '#74b8e8');
  grad.addColorStop(0.82, '#a8d8f0');
  grad.addColorStop(1.00, '#cce8f5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, skyH);

  // Sun glow (top-right area)
  const sunGlow = ctx.createRadialGradient(W * 0.82, skyH * 0.08, 0, W * 0.82, skyH * 0.08, skyH * 0.45);
  sunGlow.addColorStop(0, 'rgba(255, 245, 180, 0.55)');
  sunGlow.addColorStop(0.4, 'rgba(255, 220, 100, 0.20)');
  sunGlow.addColorStop(1, 'rgba(255, 200, 50, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, W, skyH);

  // Sun disc
  ctx.fillStyle = 'rgba(255, 252, 200, 0.95)';
  ctx.beginPath();
  ctx.arc(W * 0.82, skyH * 0.10, skyH * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // Clouds (slowly drifting)
  CLOUD_DEFS.forEach(c => {
    const cx = ((c.x * W + t * c.spd) % (W + 200)) - 100;
    drawCloud(ctx, cx, c.y * skyH, c.s * W);
  });
}

// ─── Street ───────────────────────────────────────────────────────────────────

function renderStreet(ctx: CanvasRenderingContext2D, W: number, H: number, skyH: number) {
  const sh = H - skyH;
  const vp = W / 2;

  // Street canyon side walls
  ctx.fillStyle = '#b8a888';
  ctx.fillRect(0, skyH, W * 0.13, sh);
  ctx.fillRect(W * 0.87, skyH, W * 0.13, sh);

  // Light sunlit stripe on right wall
  ctx.fillStyle = 'rgba(255, 240, 200, 0.25)';
  ctx.fillRect(W * 0.87, skyH, W * 0.04, sh);

  // Asphalt — lighter grey
  const asp = ctx.createLinearGradient(0, skyH, 0, H);
  asp.addColorStop(0, '#9a9890');
  asp.addColorStop(0.4, '#808078');
  asp.addColorStop(1, '#606058');
  ctx.fillStyle = asp;
  ctx.fillRect(W * 0.13, skyH, W * 0.74, sh);

  // Sidewalks
  ctx.fillStyle = '#c0b8a8';
  ctx.fillRect(W * 0.13, skyH, W * 0.06, sh);
  ctx.fillRect(W * 0.81, skyH, W * 0.06, sh);

  // Perspective lines
  ctx.strokeStyle = 'rgba(80,75,65,0.5)';
  ctx.lineWidth = 1.5;
  [[W * 0.19], [W * 0.81]].forEach(([x]) => {
    ctx.beginPath(); ctx.moveTo(x, skyH); ctx.lineTo(vp, skyH + sh * 0.3); ctx.stroke();
  });

  // White dashes
  ctx.strokeStyle = 'rgba(240,238,220,0.7)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([W * 0.025, W * 0.025]);
  ctx.beginPath(); ctx.moveTo(vp, skyH + sh * 0.08); ctx.lineTo(vp, H); ctx.stroke();
  ctx.setLineDash([]);

  // Trees along sidewalk
  renderTrees(ctx, W, H, skyH, sh);

  // Streetlights
  renderStreetlight(ctx, W * 0.17, skyH, sh * 0.52, true);
  renderStreetlight(ctx, W * 0.83, skyH, sh * 0.52, false);
}

function renderTrees(ctx: CanvasRenderingContext2D, W: number, _H: number, skyH: number, sh: number) {
  const positions = [0.135, 0.175, 0.83, 0.87];
  positions.forEach((xf, i) => {
    const x = xf * W;
    const trunkH = sh * 0.45;
    const trunkY = skyH + sh * 0.35;
    const crownR = sh * 0.20;
    const crownY = skyH + sh * 0.28;

    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.beginPath();
    ctx.ellipse(x + sh * 0.04, skyH + sh * 0.78, crownR * 0.65, crownR * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(x - 4, trunkY, 8, trunkH);

    // Crown layers (depth effect)
    ctx.fillStyle = '#2e6e1a';
    ctx.beginPath(); ctx.ellipse(x + 3, crownY + 4, crownR * 1.0, crownR * 0.90, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a8a22';
    ctx.beginPath(); ctx.ellipse(x - 4, crownY, crownR * 0.80, crownR * 0.78, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4aa02a';
    ctx.beginPath(); ctx.ellipse(x + (i % 2 === 0 ? -2 : 2), crownY - crownR * 0.2, crownR * 0.68, crownR * 0.65, 0, 0, Math.PI * 2); ctx.fill();

    // Sunlit highlight
    ctx.fillStyle = 'rgba(100, 200, 60, 0.35)';
    ctx.beginPath(); ctx.ellipse(x + crownR * 0.3, crownY - crownR * 0.15, crownR * 0.38, crownR * 0.35, 0.4, 0, Math.PI * 2); ctx.fill();
  });
}

function renderStreetlight(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, right: boolean) {
  const dir = right ? 1 : -1;
  ctx.fillStyle = '#6a6858';
  ctx.fillRect(x - 2, y, 4, h * 0.60);
  ctx.fillRect(x - 2, y + 3, dir * h * 0.13, 3);
  ctx.fillStyle = '#e8e0c0';
  ctx.fillRect(x + dir * (h * 0.13 - 6), y - 2, 12, 6);
}

// ─── Full background ──────────────────────────────────────────────────────────

export function renderBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const skyH = H * 0.70;

  renderSky(ctx, W, skyH, t);

  // Far buildings — silver glass (Commerzbank style)
  FAR_BUILDINGS.forEach((b, i) =>
    drawBuilding(ctx, b, W, skyH, '#b8c8d8', 'rgba(120,180,230,0.45)', 'rgba(60,90,130,0.3)', i));

  // Mid buildings — concrete/stone
  MID_BUILDINGS.forEach((b, i) =>
    drawBuilding(ctx, b, W, skyH, '#c8c0b0', 'rgba(200,220,240,0.6)', 'rgba(80,70,55,0.55)', i + 100));

  // Near buildings — warm Frankfurt sandstone
  NEAR_BUILDINGS.forEach((b, i) =>
    drawBuilding(ctx, b, W, skyH, '#c4a878', 'rgba(180,200,220,0.55)', 'rgba(70,55,35,0.6)', i + 200));

  renderStreet(ctx, W, H, skyH);
}

// ─── Pigeon (Moorhuhn-style — round, big, funny) ──────────────────────────────

export function renderPigeon(ctx: CanvasRenderingContext2D, pigeon: Pigeon, sx: number, sy: number) {
  if (pigeon.state === 'dead' && pigeon.deadTimer <= 0) return;

  const alpha = pigeon.state === 'dead' ? Math.max(0, pigeon.deadTimer / 0.6) : 1;
  const s = pigeon.scale;
  const isHit = pigeon.state === 'hit';
  const isDead = pigeon.state === 'dead';
  const wA = Math.sin(pigeon.wingPhase) * (isDead ? pigeon.wingPhase * 2 : 0.7);

  // Color variants based on psycho level
  const rb = Math.floor(138 + pigeon.psycho * 42);
  const gb = Math.floor(125 - pigeon.psycho * 45);
  const bb2 = Math.floor(115 - pigeon.psycho * 45);
  const bodyCol = isHit ? '#ff5533' : `rgb(${rb},${gb},${bb2})`;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(sx, sy);
  ctx.scale(s, s);

  // Spin when dead or hit
  if (isDead) {
    ctx.rotate(pigeon.rotation * 12);
  } else {
    ctx.rotate(pigeon.rotation);
  }

  // Ground shadow
  if (!isDead && pigeon.normalY > 0.3) {
    ctx.save();
    ctx.scale(1, 0.12);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(2, -300 / 0.12, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Wings ──
  // Rear wing
  ctx.save();
  ctx.rotate(-wA);
  ctx.fillStyle = isHit ? '#cc4422' : `rgb(${rb - 20},${gb - 15},${bb2 - 15})`;
  ctx.beginPath(); ctx.ellipse(-20, 5, 28, 11, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ── Body (fat & round — Moorhuhn!) ──
  ctx.fillStyle = bodyCol;
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 23, 0, 0, Math.PI * 2); ctx.fill();

  // Iridescent neck patch
  if (!isHit) {
    const ng = ctx.createLinearGradient(-8, -14, 12, 2);
    ng.addColorStop(0, pigeon.psycho > 0.5 ? '#cc3322' : '#5a9a50');
    ng.addColorStop(0.5, pigeon.psycho > 0.5 ? '#aa2255' : '#8a60a8');
    ng.addColorStop(1, pigeon.psycho > 0.5 ? '#aa3300' : '#4a8a60');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.ellipse(6, -6, 15, 11, -0.3, 0, Math.PI * 2); ctx.fill();
  }

  // Tail
  ctx.fillStyle = isHit ? '#cc4422' : `rgb(${rb - 15},${gb - 12},${bb2 - 12})`;
  ctx.beginPath();
  ctx.moveTo(-26, -5); ctx.lineTo(-40, -9); ctx.lineTo(-40, 9); ctx.lineTo(-26, 5);
  ctx.closePath(); ctx.fill();

  // Front wing
  ctx.save();
  ctx.rotate(wA);
  ctx.fillStyle = isHit ? '#ff6644' : `rgb(${rb + 10},${gb + 5},${bb2 + 5})`;
  ctx.beginPath(); ctx.ellipse(14, -3, 28, 11, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ── Head (big & round) ──
  const headCol = isHit ? '#ff5533' : `rgb(${rb - 8},${gb - 8},${bb2 + 5})`;
  ctx.fillStyle = headCol;
  ctx.beginPath(); ctx.arc(28, -11, 18, 0, Math.PI * 2); ctx.fill();

  // ── Big googly eye ──
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(34, -15, 11, 0, Math.PI * 2); ctx.fill();

  // Pupil — wiggles when psycho
  const wigX = pigeon.psycho > 0.45 ? Math.sin(pigeon.zigPhase * 4) * 3 : 0;
  const wigY = pigeon.psycho > 0.45 ? Math.cos(pigeon.zigPhase * 3) * 2 : 0;
  ctx.fillStyle = isHit ? '#ff0000' : (pigeon.psycho > 0.55 ? '#cc0000' : '#1a1a1a');
  ctx.beginPath(); ctx.arc(35 + wigX, -14 + wigY, 5.5, 0, Math.PI * 2); ctx.fill();
  // Eye shine
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.beginPath(); ctx.arc(37 + wigX, -16 + wigY, 2.2, 0, Math.PI * 2); ctx.fill();

  // Angry eyebrow for psycho
  if (pigeon.psycho > 0.48) {
    ctx.strokeStyle = pigeon.psycho > 0.7 ? '#aa0000' : '#553300';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(24, -27); ctx.lineTo(42, -24);
    ctx.stroke();
  }

  // Stars spinning when hit
  if (isHit) {
    for (let i = 0; i < 6; i++) {
      const a = pigeon.hitTimer * 18 + (i * Math.PI * 2) / 6;
      ctx.font = '13px sans-serif';
      ctx.fillText('⭐', Math.cos(a) * 38 - 6, Math.sin(a) * 38 + 5);
    }
  }

  // ── Orange beak ──
  ctx.fillStyle = '#ff8c00';
  ctx.beginPath();
  ctx.moveTo(44, -11); ctx.lineTo(57, -9); ctx.lineTo(44, -7);
  ctx.closePath(); ctx.fill();
  // Beak line
  ctx.strokeStyle = '#cc6600';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(44, -9); ctx.lineTo(57, -9); ctx.stroke();

  // ── Cute orange feet ──
  if (!isDead) {
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 2.5;
    [[-6, 1], [6, -1]].forEach(([ox, _]) => {
      ctx.beginPath();
      ctx.moveTo(ox, 22); ctx.lineTo(ox - 3, 30);
      ctx.moveTo(ox - 3, 30); ctx.lineTo(ox - 9, 34);
      ctx.moveTo(ox - 3, 30); ctx.lineTo(ox - 3, 36);
      ctx.moveTo(ox - 3, 30); ctx.lineTo(ox + 3, 34);
      ctx.stroke();
    });
  }

  // ── Boss crown ──
  if (pigeon.isBoss) {
    ctx.fillStyle = '#ffd700';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(22 + i * 5 - 3, -30);
      ctx.lineTo(22 + i * 5, -40 - Math.abs(i) * 3);
      ctx.lineTo(22 + i * 5 + 3, -30);
      ctx.closePath(); ctx.fill();
    }
    // Boss health bar
    if (pigeon.health > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-32, -58, 64, 7);
      ctx.fillStyle = '#ff3300';
      ctx.fillRect(-32, -58, 64 * (pigeon.health / pigeon.maxHealth), 7);
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
      const rise = (1 - effect.timer) * 50;
      ctx.globalAlpha = Math.min(1, effect.timer * 2);
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(effect.scoreText, effect.x, effect.y - rise);
      ctx.fillStyle = '#ffe000';
      ctx.fillText(effect.scoreText, effect.x, effect.y - rise);
    }
  } else {
    // Miss ring
    ctx.globalAlpha = effect.timer * 0.7;
    ctx.strokeStyle = 'rgba(255,100,50,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, (1 - effect.timer) * 22 + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Crosshair ────────────────────────────────────────────────────────────────

export function renderCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);

  const len = 28;
  const gap = 8;

  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 2;

  ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(-gap, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gap, 0);  ctx.lineTo(len, 0);  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -len); ctx.lineTo(0, -gap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, gap);  ctx.lineTo(0, len);  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,80,80,0.95)';
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, len + 5, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
}

// ─── Canvas HUD ───────────────────────────────────────────────────────────────

export function renderHUD(ctx: CanvasRenderingContext2D, W: number, _H: number, hud: HUDState) {
  ctx.save();
  ctx.font = 'bold 15px monospace';
  ctx.textBaseline = 'top';

  // Dark pill background helper
  const pill = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.40)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
  };

  // Score
  pill(8, 8, 160, 28);
  ctx.fillStyle = '#ffe040';
  ctx.fillText(`SCORE: ${hud.score.toLocaleString()}`, 14, 14);

  // Wave
  const wt = `WELLE ${hud.wave}`;
  const ww = ctx.measureText(wt).width;
  pill(W / 2 - ww / 2 - 10, 8, ww + 20, 28);
  ctx.fillStyle = '#80cfff';
  ctx.fillText(wt, W / 2 - ww / 2, 14);

  // Health hearts
  pill(W - 108, 8, 100, 28);
  ctx.font = 'bold 20px sans-serif';
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < hud.health ? '#ff3355' : 'rgba(255,51,85,0.25)';
    ctx.fillText('♥', W - 100 + i * 30, 11);
  }

  // Wave message
  if (hud.waveMessage) {
    ctx.font = 'bold 28px monospace';
    const mw = ctx.measureText(hud.waveMessage).width;
    pill(W / 2 - mw / 2 - 18, _H / 2 - 26, mw + 36, 52);
    ctx.fillStyle = '#ffdd00';
    ctx.textBaseline = 'middle';
    ctx.fillText(hud.waveMessage, W / 2 - mw / 2, _H / 2);
  }

  ctx.restore();
}
