import type { Pigeon, ShotEffect, HUDState } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  ctx.fillStyle = 'rgba(180,210,240,0.25)';
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.5, r * 0.85, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
}

// ─── Sky ──────────────────────────────────────────────────────────────────────

function renderSky(ctx: CanvasRenderingContext2D, W: number, skyH: number, t: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, skyH);
  grad.addColorStop(0.00, '#1a6ab8');
  grad.addColorStop(0.30, '#3d8fd4');
  grad.addColorStop(0.60, '#74b8e8');
  grad.addColorStop(0.82, '#a8d8f0');
  grad.addColorStop(1.00, '#cce8f5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, skyH);

  // Sun glow (top-left — Mainufer perspective)
  const sunGlow = ctx.createRadialGradient(W * 0.11, skyH * 0.06, 0, W * 0.11, skyH * 0.06, skyH * 0.58);
  sunGlow.addColorStop(0,    'rgba(255,255,220,0.72)');
  sunGlow.addColorStop(0.18, 'rgba(255,238,140,0.38)');
  sunGlow.addColorStop(0.45, 'rgba(255,210,80, 0.16)');
  sunGlow.addColorStop(1,    'rgba(255,200,50, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, W, skyH);

  // Sun disc
  ctx.fillStyle = 'rgba(255,255,230,0.98)';
  ctx.beginPath(); ctx.arc(W * 0.11, skyH * 0.08, skyH * 0.058, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,248,180,0.28)';
  ctx.lineWidth = skyH * 0.014;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.04;
    const r1 = skyH * 0.08, r2 = skyH * 0.20;
    ctx.beginPath();
    ctx.moveTo(W * 0.11 + Math.cos(a) * r1, skyH * 0.08 + Math.sin(a) * r1);
    ctx.lineTo(W * 0.11 + Math.cos(a) * r2, skyH * 0.08 + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  CLOUD_DEFS.forEach(c => {
    const cx = ((c.x * W + t * c.spd) % (W + 200)) - 100;
    drawCloud(ctx, cx, c.y * skyH, c.s * W);
  });
}

// ─── Frankfurt Skyline Silhouette ─────────────────────────────────────────────
// Each entry: [leftX, rightX, heightFrac, topStyle?]
// x values: fraction of W; height: fraction of skyH

type BldData = [number, number, number, ('pyramid' | 'pointed' | 'round')?];

// Faint atmospheric depth layer
const FAR_BLDS: BldData[] = [
  [0.00, 0.055, 0.26], [0.04, 0.095, 0.32], [0.08, 0.130, 0.28],
  [0.12, 0.170, 0.44], [0.16, 0.200, 0.30], [0.19, 0.235, 0.48],
  [0.22, 0.270, 0.38], [0.26, 0.305, 0.36], [0.30, 0.350, 0.52],
  [0.33, 0.378, 0.40], [0.37, 0.422, 0.62], [0.41, 0.458, 0.48],
  [0.45, 0.498, 0.44], [0.49, 0.538, 0.55], [0.53, 0.578, 0.42],
  [0.57, 0.618, 0.38], [0.61, 0.658, 0.32], [0.65, 0.698, 0.40],
  [0.69, 0.738, 0.35], [0.73, 0.778, 0.28], [0.77, 0.818, 0.30],
  [0.81, 0.858, 0.24], [0.85, 0.902, 0.26], [0.89, 0.942, 0.20],
  [0.93, 1.005, 0.18],
];

// Main Frankfurt skyline — recognisable silhouette
const MAIN_BLDS: BldData[] = [
  // Far left — low structures
  [0.000, 0.028, 0.18], [0.018, 0.052, 0.22], [0.042, 0.076, 0.19],
  [0.068, 0.100, 0.27], [0.090, 0.122, 0.23], [0.110, 0.142, 0.35],
  // Messeturm complex (left icon — red sandstone pyramid top)
  [0.128, 0.184, 0.50], [0.140, 0.174, 0.70],
  [0.148, 0.165, 0.83, 'pyramid'],
  // Medium buildings between Messe and Westend
  [0.176, 0.218, 0.40], [0.208, 0.240, 0.34],
  // Westend Tower group (stepped)
  [0.228, 0.270, 0.54], [0.240, 0.262, 0.73],
  // Trianon group
  [0.264, 0.308, 0.44], [0.295, 0.338, 0.60],
  [0.335, 0.368, 0.44],
  // COMMERZBANK — tallest, triangle/pointed top
  [0.358, 0.402, 0.78], [0.363, 0.396, 0.93, 'pointed'],
  // Post-Commerzbank filler
  [0.398, 0.430, 0.48],
  // Deutsche Bank twin towers
  [0.426, 0.452, 0.65], [0.456, 0.482, 0.65],
  // Medium filler
  [0.476, 0.508, 0.46], [0.496, 0.527, 0.53],
  // MAIN TOWER — tall cylinder with round observatory
  [0.502, 0.538, 0.64], [0.508, 0.528, 0.85, 'round'],
  // Taunusturm
  [0.536, 0.570, 0.60], [0.554, 0.578, 0.57],
  // Right cluster (tapering down toward edges)
  [0.578, 0.618, 0.48], [0.610, 0.648, 0.42],
  [0.642, 0.678, 0.38], [0.670, 0.708, 0.34],
  [0.703, 0.740, 0.32], [0.732, 0.768, 0.28],
  [0.763, 0.800, 0.26], [0.795, 0.832, 0.24],
  [0.828, 0.865, 0.28], [0.860, 0.898, 0.22],
  [0.892, 0.930, 0.26], [0.926, 0.964, 0.20],
  [0.958, 1.005, 0.17],
];

function drawBldGroup(
  ctx: CanvasRenderingContext2D,
  W: number, skyH: number,
  color: string,
  blds: BldData[],
) {
  ctx.fillStyle = color;
  blds.forEach(([x1, x2, hf, top]) => {
    const bx = x1 * W, bw = (x2 - x1) * W, bh = hf * skyH;
    const ty = skyH - bh;
    ctx.fillRect(bx, ty, bw, bh);
    switch (top) {
      case 'pyramid':
        ctx.beginPath();
        ctx.moveTo(bx, ty);
        ctx.lineTo(bx + bw / 2, ty - bh * 0.26);
        ctx.lineTo(bx + bw, ty);
        ctx.fill();
        break;
      case 'pointed':
        ctx.beginPath();
        ctx.moveTo(bx - bw * 0.10, ty + bh * 0.10);
        ctx.lineTo(bx + bw / 2, ty - bh * 0.04);
        ctx.lineTo(bx + bw * 1.10, ty + bh * 0.10);
        ctx.fill();
        // Antenna
        ctx.fillRect(bx + bw * 0.44, ty - bh * 0.12, bw * 0.12, bh * 0.15);
        break;
      case 'round': {
        const cr = bw * 0.90;
        ctx.beginPath();
        ctx.arc(bx + bw / 2, ty + bh * 0.05, cr, Math.PI, 0);
        ctx.fill();
        // Antenna
        ctx.fillRect(bx + bw * 0.42, ty - bh * 0.14, bw * 0.16, bh * 0.22);
        break;
      }
    }
  });
}

function drawHorizonTrees(ctx: CanvasRenderingContext2D, W: number, skyH: number) {
  ctx.fillStyle = 'rgba(8,18,48,0.80)';
  const n = 38;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * W;
    const r = W * (0.022 + Math.sin(i * 3.7 + 1.2) * 0.007);
    const yBase = skyH - r * (0.20 + Math.sin(i * 2.3 + 0.8) * 0.07);
    ctx.beginPath();
    ctx.ellipse(x, yBase, r * (1.0 + Math.sin(i * 4.1) * 0.10), r * (0.88 + Math.sin(i * 5.3) * 0.08), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrassMeadow(ctx: CanvasRenderingContext2D, W: number, H: number, skyH: number) {
  const sh = H - skyH;
  const g = ctx.createLinearGradient(0, skyH, 0, H);
  g.addColorStop(0.00, '#56b63e');
  g.addColorStop(0.28, '#489a30');
  g.addColorStop(0.62, '#388022');
  g.addColorStop(1.00, '#285c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, skyH, W, sh);
  // Sunlit top strip
  ctx.fillStyle = 'rgba(110,195,70,0.18)';
  ctx.fillRect(0, skyH, W, sh * 0.10);
  // Grass blade fringe
  ctx.strokeStyle = 'rgba(40,120,20,0.28)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 45; i++) {
    const gx = (i / 44) * W;
    const gh = sh * (0.055 + Math.sin(i * 6.3) * 0.018);
    ctx.beginPath();
    ctx.moveTo(gx, skyH);
    ctx.quadraticCurveTo(gx + Math.sin(i * 2.8) * 4, skyH - gh * 0.5, gx + Math.sin(i * 1.9) * 3, skyH - gh);
    ctx.stroke();
  }
}

export function renderBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const skyH = H * 0.72;
  renderSky(ctx, W, skyH, t);

  // Atmospheric depth layer
  drawBldGroup(ctx, W, skyH, 'rgba(40,62,130,0.22)', FAR_BLDS);

  // Main Frankfurt silhouette
  drawBldGroup(ctx, W, skyH, 'rgba(8,18,48,0.92)', MAIN_BLDS);

  // Organic tree line at base of skyline
  drawHorizonTrees(ctx, W, skyH);

  // Green meadow
  drawGrassMeadow(ctx, W, H, skyH);
}

// ─── Shotgun barrel (FPS view) ───────────────────────────────────────────────

export function renderGunBarrel(ctx: CanvasRenderingContext2D, W: number, H: number, shotFlash: number, crosshairX: number, crosshairY: number) {
  const recoil = shotFlash * 18;
  const barrelLen = H * 0.25;

  // Barrel tracks crosshair — stronger factor for visible movement
  const dx = crosshairX - W / 2;
  const dy = H * 0.80 - crosshairY;
  const rawAngle = Math.atan2(dx, Math.max(8, dy));
  const angle = Math.max(-0.45, Math.min(0.45, rawAngle * 0.50));

  ctx.save();
  ctx.translate(W / 2, H + recoil);
  ctx.rotate(angle);

  // Stock (wood)
  const woodGrad = ctx.createLinearGradient(-45, -70, 45, 0);
  woodGrad.addColorStop(0, '#3a1e08');
  woodGrad.addColorStop(0.3, '#6a3810');
  woodGrad.addColorStop(0.6, '#5a2e0c');
  woodGrad.addColorStop(1, '#2a1206');
  ctx.fillStyle = woodGrad;
  ctx.beginPath(); ctx.roundRect(-44, -65, 88, 70, [10, 10, 0, 0]); ctx.fill();
  ctx.strokeStyle = 'rgba(30,12,3,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath(); ctx.moveTo(-40, -58 + i * 9); ctx.lineTo(40, -53 + i * 9); ctx.stroke();
  }

  // Double barrel
  const sep = 16;
  [-sep / 2 - 9, sep / 2 - 9].forEach((ox, idx) => {
    const bw = 18;
    const mg = ctx.createLinearGradient(ox - bw / 2, 0, ox + bw / 2, 0);
    mg.addColorStop(0, '#1a1a1a'); mg.addColorStop(0.2, '#484848');
    mg.addColorStop(0.5, '#6a6a6a'); mg.addColorStop(0.8, '#484848'); mg.addColorStop(1, '#0e0e0e');
    ctx.fillStyle = mg;
    ctx.fillRect(ox - bw / 2, -barrelLen, bw, barrelLen - 40);
    ctx.fillStyle = '#111';
    ctx.fillRect(ox - bw / 2 - 1, -barrelLen, bw + 2, 7);
    ctx.fillStyle = '#050505';
    ctx.beginPath(); ctx.ellipse(ox, -barrelLen + 4, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,200,200,0.26)';
    ctx.fillRect(ox - bw / 2 + 3, -barrelLen + 8, 4, barrelLen - 52);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(ox - bw / 2, -barrelLen * 0.38, bw, 5);
    if (shotFlash > 0.01) {
      const fa = Math.min(1, shotFlash * 1.2);
      const fr = shotFlash * 22 + idx * 4;
      ctx.save();
      ctx.globalAlpha = fa * 0.95;
      const fg = ctx.createRadialGradient(ox, -barrelLen, 0, ox, -barrelLen, fr * 1.8);
      fg.addColorStop(0, '#fff'); fg.addColorStop(0.25, '#ffe060');
      fg.addColorStop(0.6, '#ff7700'); fg.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(ox, -barrelLen, fr * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = fa * 0.22;
      ctx.fillStyle = '#ccc';
      ctx.beginPath(); ctx.arc(ox, -barrelLen - fr, fr * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });

  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(-(sep / 2 + 18), -barrelLen * 0.12, sep + 36, 7);
  const fsG = ctx.createLinearGradient(-20, 0, 20, 0);
  fsG.addColorStop(0, '#3a1e08'); fsG.addColorStop(0.5, '#5a2e0c'); fsG.addColorStop(1, '#2a1206');
  ctx.fillStyle = fsG;
  ctx.beginPath(); ctx.roundRect(-20, -barrelLen * 0.36, 40, barrelLen * 0.3, 5); ctx.fill();

  ctx.restore();
}

// ─── Pigeon (Moorhuhn-style — round, big, funny) ──────────────────────────────

export function renderPigeon(ctx: CanvasRenderingContext2D, pigeon: Pigeon, sx: number, sy: number) {
  if (pigeon.state === 'dead' && pigeon.deadTimer <= 0) return;

  const alpha = pigeon.state === 'dead' ? Math.max(0, pigeon.deadTimer / 0.6) : 1;
  const s = pigeon.scale;
  const isHit = pigeon.state === 'hit';
  const isDead = pigeon.state === 'dead';
  const wA = Math.sin(pigeon.wingPhase) * (isDead ? pigeon.wingPhase * 2 : 0.7);

  const rb = Math.floor(138 + pigeon.psycho * 42);
  const gb = Math.floor(125 - pigeon.psycho * 45);
  const bb2 = Math.floor(115 - pigeon.psycho * 45);
  const bodyCol = isHit ? '#ff5533' : `rgb(${rb},${gb},${bb2})`;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(sx, sy);
  ctx.scale(s, s);

  if (isDead) {
    ctx.rotate(pigeon.rotation * 12);
  } else {
    ctx.rotate(pigeon.rotation);
  }

  if (!isDead && pigeon.normalY > 0.3) {
    ctx.save();
    ctx.scale(1, 0.12);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(2, -300 / 0.12, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(-wA);
  ctx.fillStyle = isHit ? '#cc4422' : `rgb(${rb - 20},${gb - 15},${bb2 - 15})`;
  ctx.beginPath(); ctx.ellipse(-20, 5, 28, 11, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = bodyCol;
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 23, 0, 0, Math.PI * 2); ctx.fill();

  if (!isHit) {
    const ng = ctx.createLinearGradient(-8, -14, 12, 2);
    ng.addColorStop(0, pigeon.psycho > 0.5 ? '#cc3322' : '#5a9a50');
    ng.addColorStop(0.5, pigeon.psycho > 0.5 ? '#aa2255' : '#8a60a8');
    ng.addColorStop(1, pigeon.psycho > 0.5 ? '#aa3300' : '#4a8a60');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.ellipse(6, -6, 15, 11, -0.3, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = isHit ? '#cc4422' : `rgb(${rb - 15},${gb - 12},${bb2 - 12})`;
  ctx.beginPath();
  ctx.moveTo(-26, -5); ctx.lineTo(-40, -9); ctx.lineTo(-40, 9); ctx.lineTo(-26, 5);
  ctx.closePath(); ctx.fill();

  ctx.save();
  ctx.rotate(wA);
  ctx.fillStyle = isHit ? '#ff6644' : `rgb(${rb + 10},${gb + 5},${bb2 + 5})`;
  ctx.beginPath(); ctx.ellipse(14, -3, 28, 11, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const headCol = isHit ? '#ff5533' : `rgb(${rb - 8},${gb - 8},${bb2 + 5})`;
  ctx.fillStyle = headCol;
  ctx.beginPath(); ctx.arc(28, -11, 18, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(34, -15, 11, 0, Math.PI * 2); ctx.fill();

  const wigX = pigeon.psycho > 0.45 ? Math.sin(pigeon.zigPhase * 4) * 3 : 0;
  const wigY = pigeon.psycho > 0.45 ? Math.cos(pigeon.zigPhase * 3) * 2 : 0;
  ctx.fillStyle = isHit ? '#ff0000' : (pigeon.psycho > 0.55 ? '#cc0000' : '#1a1a1a');
  ctx.beginPath(); ctx.arc(35 + wigX, -14 + wigY, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.beginPath(); ctx.arc(37 + wigX, -16 + wigY, 2.2, 0, Math.PI * 2); ctx.fill();

  if (pigeon.psycho > 0.48) {
    ctx.strokeStyle = pigeon.psycho > 0.7 ? '#aa0000' : '#553300';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(24, -27); ctx.lineTo(42, -24);
    ctx.stroke();
  }

  if (isHit) {
    for (let i = 0; i < 6; i++) {
      const a = pigeon.hitTimer * 18 + (i * Math.PI * 2) / 6;
      ctx.font = '13px sans-serif';
      ctx.fillText('⭐', Math.cos(a) * 38 - 6, Math.sin(a) * 38 + 5);
    }
  }

  ctx.fillStyle = '#ff8c00';
  ctx.beginPath();
  ctx.moveTo(44, -11); ctx.lineTo(57, -9); ctx.lineTo(44, -7);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#cc6600';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(44, -9); ctx.lineTo(57, -9); ctx.stroke();

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

  if (pigeon.isBoss) {
    ctx.fillStyle = '#ffd700';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(22 + i * 5 - 3, -30);
      ctx.lineTo(22 + i * 5, -40 - Math.abs(i) * 3);
      ctx.lineTo(22 + i * 5 + 3, -30);
      ctx.closePath(); ctx.fill();
    }
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

  const len = 28, gap = 8;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
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

  const pill = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.40)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
  };

  pill(8, 8, 160, 28);
  ctx.fillStyle = '#ffe040';
  ctx.fillText(`SCORE: ${hud.score.toLocaleString()}`, 14, 14);

  const wt = `WELLE ${hud.wave}`;
  const ww = ctx.measureText(wt).width;
  pill(W / 2 - ww / 2 - 10, 8, ww + 20, 28);
  ctx.fillStyle = '#80cfff';
  ctx.fillText(wt, W / 2 - ww / 2, 14);

  pill(W - 108, 8, 100, 28);
  ctx.font = 'bold 20px sans-serif';
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < hud.health ? '#ff3355' : 'rgba(255,51,85,0.25)';
    ctx.fillText('♥', W - 100 + i * 30, 11);
  }

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
