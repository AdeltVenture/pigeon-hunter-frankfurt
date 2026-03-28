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

  // Sun glow (top-LEFT — like Frankfurt Mainufer photo from Sachsenhausen)
  const sunGlow = ctx.createRadialGradient(W * 0.11, skyH * 0.06, 0, W * 0.11, skyH * 0.06, skyH * 0.58);
  sunGlow.addColorStop(0,   'rgba(255, 255, 220, 0.72)');
  sunGlow.addColorStop(0.18,'rgba(255, 238, 140, 0.38)');
  sunGlow.addColorStop(0.45,'rgba(255, 210, 80,  0.16)');
  sunGlow.addColorStop(1,   'rgba(255, 200, 50,  0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, W, skyH);

  // Sun disc
  ctx.fillStyle = 'rgba(255, 255, 230, 0.98)';
  ctx.beginPath(); ctx.arc(W * 0.11, skyH * 0.08, skyH * 0.058, 0, Math.PI * 2); ctx.fill();
  // Subtle sun rays
  ctx.strokeStyle = 'rgba(255,248,180,0.28)';
  ctx.lineWidth = skyH * 0.014;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.04;
    const r1 = skyH * 0.08; const r2 = skyH * 0.20;
    ctx.beginPath();
    ctx.moveTo(W * 0.11 + Math.cos(a) * r1, skyH * 0.08 + Math.sin(a) * r1);
    ctx.lineTo(W * 0.11 + Math.cos(a) * r2, skyH * 0.08 + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Clouds (slowly drifting)
  CLOUD_DEFS.forEach(c => {
    const cx = ((c.x * W + t * c.spd) % (W + 200)) - 100;
    drawCloud(ctx, cx, c.y * skyH, c.s * W);
  });
}

// ─── Mainufer (Frankfurt riverside meadow) ────────────────────────────────────

function renderMainufer(ctx: CanvasRenderingContext2D, W: number, H: number, skyH: number) {
  const sh = H - skyH;

  // Base: lush green meadow
  const meadow = ctx.createLinearGradient(0, skyH, 0, H);
  meadow.addColorStop(0, '#5aaa40');
  meadow.addColorStop(0.38, '#4a9a32');
  meadow.addColorStop(0.68, '#3a8828');
  meadow.addColorStop(1, '#2a6818');
  ctx.fillStyle = meadow;
  ctx.fillRect(0, skyH, W, sh);

  // Far tree band — 3 depth layers across full width
  const treeLayers = [
    { n: 18, yOff: 2, hScale: 0.42, rScale: 0.08, col: '#3a6a28' },
    { n: 14, yOff: 5, hScale: 0.35, rScale: 0.07, col: '#4a8830' },
    { n: 11, yOff: 8, hScale: 0.28, rScale: 0.06, col: '#6aaa48' },
  ];
  treeLayers.forEach(({ n, yOff, hScale, rScale, col }) => {
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const tx = (i / (n - 1)) * W;
      const th = sh * (hScale + Math.sin(i * 2.7 + n) * 0.06);
      const tr = sh * (rScale + Math.sin(i * 3.1 + n) * 0.015);
      ctx.beginPath();
      ctx.ellipse(tx, skyH + yOff, tr * 1.4, th * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Main river strip
  const riverY = skyH + sh * 0.30;
  const riverH = sh * 0.17;
  const riverGrad = ctx.createLinearGradient(0, riverY, 0, riverY + riverH);
  riverGrad.addColorStop(0, '#7aacca');
  riverGrad.addColorStop(0.45, '#8ab8d4');
  riverGrad.addColorStop(1, '#5e8ead');
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, riverY, W, riverH);
  // Shimmer
  ctx.strokeStyle = 'rgba(200,235,255,0.32)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const ly = riverY + riverH * (0.18 + i * 0.11);
    const lx = W * (0.04 + i * 0.09);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + W * (0.06 + Math.sin(i * 1.9) * 0.025), ly + 1);
    ctx.stroke();
  }

  // Eiserner Steg bridge silhouette
  const bridgeY = riverY + riverH * 0.10;
  const bridgeH = riverH * 0.52;
  ctx.strokeStyle = '#6a7860';
  ctx.fillStyle = '#6a7860';
  // Bridge deck
  ctx.fillRect(0, bridgeY + bridgeH, W, 4);
  // Truss arches
  const nTruss = 9;
  for (let i = 0; i < nTruss; i++) {
    const tx = (i / nTruss) * W;
    const tw = W / nTruss;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tx, bridgeY + bridgeH);
    ctx.quadraticCurveTo(tx + tw / 2, bridgeY, tx + tw, bridgeY + bridgeH);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let j = 1; j < 4; j++) {
      const sx = tx + (j / 4) * tw;
      const arcY = bridgeY + bridgeH - bridgeH * Math.sin((j / 4) * Math.PI);
      ctx.beginPath(); ctx.moveTo(sx, bridgeY + bridgeH); ctx.lineTo(sx, arcY); ctx.stroke();
    }
  }
  // Handrail
  ctx.fillStyle = '#7a8870';
  ctx.fillRect(0, bridgeY, W, 2.5);

  // Embankment path (Sachsenhäuser Ufer)
  const pathY = riverY - sh * 0.038;
  ctx.fillStyle = '#c8bc98';
  ctx.fillRect(0, pathY, W, sh * 0.060);
  ctx.fillStyle = 'rgba(180,168,138,0.28)';
  for (let i = 0; i < 14; i++) {
    ctx.fillRect(i * W / 14, pathY + 2, W / 14 - 2, 3);
  }

  // Grass fringe at embankment top
  ctx.strokeStyle = '#78c058';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 60; i++) {
    const gx = (i / 59) * W;
    const gh = sh * (0.028 + Math.sin(i * 7.1) * 0.010);
    ctx.beginPath();
    ctx.moveTo(gx, pathY);
    ctx.quadraticCurveTo(gx + Math.sin(i * 2.3) * 3, pathY - gh * 0.55, gx + Math.sin(i * 1.5) * 2, pathY - gh);
    ctx.stroke();
  }

  // Foreground trees (large, close-up)
  const fgPos = [0.07, 0.20, 0.80, 0.93];
  fgPos.forEach((xf, i) => {
    const x = xf * W;
    const crownR = sh * 0.30;
    const trunkH = sh * 0.36;
    const baseY = H;
    const trunkY = baseY - trunkH;
    const crownY = trunkY - crownR * 0.50;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(x + sh * 0.025, baseY - sh * 0.015, crownR * 0.72, crownR * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(x - 7, trunkY, 14, trunkH);
    ctx.fillStyle = 'rgba(130,90,50,0.38)';
    ctx.fillRect(x - 2, trunkY, 5, trunkH);

    // Crown depth layers
    ctx.fillStyle = '#2a5e18';
    ctx.beginPath(); ctx.ellipse(x + 5, crownY + 7, crownR, crownR * 0.88, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a7822';
    ctx.beginPath(); ctx.ellipse(x - 6, crownY, crownR * 0.84, crownR * 0.80, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a9030';
    ctx.beginPath(); ctx.ellipse(x + (i % 2 === 0 ? -4 : 4), crownY - crownR * 0.16, crownR * 0.70, crownR * 0.68, 0, 0, Math.PI * 2); ctx.fill();

    // Sun highlight on left trees (sun is top-left)
    if (i < 2) {
      ctx.fillStyle = 'rgba(120,210,70,0.30)';
      ctx.beginPath(); ctx.ellipse(x - crownR * 0.22, crownY - crownR * 0.20, crownR * 0.42, crownR * 0.36, -0.3, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// ─── Full background ──────────────────────────────────────────────────────────

// ─── Frankfurt Landmark Functions ────────────────────────────────────────────

function drawCommerzbank(ctx: CanvasRenderingContext2D, W: number, skyH: number) {
  const cx = W * 0.42; const bh = skyH * 0.91;
  const bw = Math.max(18, W * 0.025); const top = skyH - bh; const left = cx - bw / 2;
  const gr = ctx.createLinearGradient(left, 0, left + bw, 0);
  gr.addColorStop(0, '#4878a0'); gr.addColorStop(0.2, '#8ab8d4'); gr.addColorStop(0.5, '#72a8c8'); gr.addColorStop(1, '#3a6080');
  ctx.fillStyle = gr;
  ctx.fillRect(left, top + bh * 0.13, bw, bh * 0.87);
  ctx.beginPath(); ctx.moveTo(left - 3, top + bh * 0.13); ctx.lineTo(cx, top); ctx.lineTo(left + bw + 3, top + bh * 0.13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6090b0'; ctx.fillRect(cx - 1, top - bh * 0.09, 2, bh * 0.09);
  ctx.fillStyle = '#ff3300'; ctx.beginPath(); ctx.arc(cx, top - bh * 0.09, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(15,30,60,0.5)';
  [0.36, 0.55, 0.73].forEach(yf => ctx.fillRect(left, top + bh * yf, bw, 4));
  ctx.strokeStyle = 'rgba(40,70,120,0.22)'; ctx.lineWidth = 0.7;
  for (let i = 2; i < 40; i++) { const fy = top + bh * 0.14 + (i / 40) * bh * 0.84; ctx.beginPath(); ctx.moveTo(left, fy); ctx.lineTo(left + bw, fy); ctx.stroke(); }
  ctx.fillStyle = 'rgba(180,230,255,0.16)'; ctx.fillRect(left + 2, top + bh * 0.13, bw * 0.28, bh * 0.86);
}

function drawMesseturm(ctx: CanvasRenderingContext2D, W: number, skyH: number) {
  const cx = W * 0.17; const bh = skyH * 0.80;
  const bw = Math.max(26, W * 0.040); const top = skyH - bh; const left = cx - bw / 2;
  const gr = ctx.createLinearGradient(left, 0, left + bw, 0);
  gr.addColorStop(0, '#5a3020'); gr.addColorStop(0.3, '#9a6038'); gr.addColorStop(0.7, '#8a5030'); gr.addColorStop(1, '#4a2818');
  ctx.fillStyle = gr;
  ctx.fillRect(left, top + bh * 0.23, bw, bh * 0.77);
  ctx.beginPath(); ctx.moveTo(left - 5, top + bh * 0.23); ctx.lineTo(cx, top); ctx.lineTo(left + bw + 5, top + bh * 0.23); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a2010'; ctx.beginPath(); ctx.arc(cx, top, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(35,15,8,0.28)';
  for (let i = 1; i < 11; i++) ctx.fillRect(left, top + bh * 0.25 + (i / 11) * bh * 0.72, bw, 2.5);
  const cols = 5; const rows = 11; const ww = (bw - 8) / (cols * 1.7); const wh = ww * 1.2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    ctx.fillStyle = absPr(c * 7 + r * 13) > 0.38 ? 'rgba(190,150,100,0.55)' : 'rgba(45,22,10,0.55)';
    ctx.fillRect(left + 4 + c * ww * 1.7, top + bh * 0.28 + r * wh * 2.3, ww, wh);
  }
}

function drawMainTower(ctx: CanvasRenderingContext2D, W: number, skyH: number) {
  const cx = W * 0.62; const bh = skyH * 0.86;
  const bw = Math.max(20, W * 0.026); const top = skyH - bh; const left = cx - bw / 2;
  const gr = ctx.createLinearGradient(left, 0, left + bw, 0);
  gr.addColorStop(0, '#304860'); gr.addColorStop(0.15, '#5888b8'); gr.addColorStop(0.5, '#70a8d0'); gr.addColorStop(1, '#2a3a58');
  ctx.fillStyle = gr;
  ctx.fillRect(left, top + bh * 0.10, bw, bh * 0.90);
  const cw = bw + 10; ctx.fillStyle = '#5080a0'; ctx.fillRect(cx - cw / 2, top, cw, bh * 0.10);
  ctx.fillStyle = 'rgba(80,150,200,0.45)'; ctx.fillRect(cx - cw / 2, top + bh * 0.10 - 3, cw, 3);
  ctx.fillStyle = 'rgba(140,210,255,0.38)';
  for (let i = 0; i < 8; i++) ctx.fillRect(cx - cw / 2 + 3 + i * ((cw - 6) / 8), top + 2, (cw - 6) / 8 - 2, bh * 0.08 - 4);
  ctx.fillStyle = '#5888a8'; ctx.fillRect(cx - 1, top - bh * 0.14, 2, bh * 0.14);
  ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(cx, top - bh * 0.14, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(50,90,140,0.25)'; ctx.lineWidth = 0.7;
  for (let i = 2; i < 34; i++) { const fy = top + bh * 0.11 + (i / 34) * bh * 0.87; ctx.beginPath(); ctx.moveTo(left, fy); ctx.lineTo(left + bw, fy); ctx.stroke(); }
  ctx.fillStyle = 'rgba(160,225,255,0.16)'; ctx.fillRect(left + 2, top + bh * 0.10, bw * 0.24, bh * 0.88);
}

function drawDeutscheBank(ctx: CanvasRenderingContext2D, W: number, skyH: number) {
  const cx = W * 0.52; const bh = skyH * 0.64;
  const tw = Math.max(14, W * 0.019); const gap = Math.max(5, W * 0.008); const top = skyH - bh;
  [cx - gap / 2 - tw, cx + gap / 2].forEach((left, idx) => {
    const gr = ctx.createLinearGradient(left, 0, left + tw, 0);
    gr.addColorStop(0, '#283848'); gr.addColorStop(0.3, '#486070'); gr.addColorStop(1, '#182838');
    ctx.fillStyle = gr; ctx.fillRect(left, top, tw, bh);
    const ww = (tw - 4) / (3 * 1.7); const wh = ww;
    for (let r = 0; r < 15; r++) for (let c = 0; c < 3; c++) {
      ctx.fillStyle = absPr(c * 5 + r * 11 + idx * 50) > 0.42 ? 'rgba(120,185,225,0.48)' : 'rgba(18,32,50,0.6)';
      ctx.fillRect(left + 2 + c * ww * 1.7, top + 8 + r * wh * 2.3, ww, wh);
    }
    ctx.fillStyle = 'rgba(100,175,220,0.13)'; ctx.fillRect(left + 2, top, tw * 0.26, bh);
  });
  ctx.fillStyle = '#304050'; ctx.fillRect(cx - gap / 2 - tw, top + bh * 0.40, tw * 2 + gap, 5);
}

function drawWestendTower(ctx: CanvasRenderingContext2D, W: number, skyH: number) {
  const cx = W * 0.28; const bh = skyH * 0.74;
  const bw = Math.max(20, W * 0.028); const top = skyH - bh; const left = cx - bw / 2;
  const gr = ctx.createLinearGradient(left, 0, left + bw, 0);
  gr.addColorStop(0, '#787870'); gr.addColorStop(0.3, '#b0aea6'); gr.addColorStop(1, '#686860');
  ctx.fillStyle = gr; ctx.fillRect(left, top + bh * 0.22, bw, bh * 0.78);
  ctx.fillStyle = '#9a9890'; ctx.fillRect(cx - bw * 0.41, top + bh * 0.12, bw * 0.82, bh * 0.10);
  ctx.fillStyle = '#aeaca4'; ctx.fillRect(cx - bw * 0.30, top + bh * 0.04, bw * 0.60, bh * 0.08);
  ctx.fillStyle = '#b8b6ae'; ctx.fillRect(cx - bw * 0.19, top, bw * 0.38, bh * 0.04);
  const ww = (bw - 6) / (4 * 1.9); const wh = ww * 1.1;
  for (let r = 0; r < 13; r++) for (let c = 0; c < 4; c++) {
    ctx.fillStyle = absPr(c * 9 + r * 17 + 200) > 0.34 ? 'rgba(170,198,210,0.50)' : 'rgba(38,38,35,0.55)';
    ctx.fillRect(left + 3 + c * ww * 1.9, top + bh * 0.26 + r * wh * 2.3, ww, wh);
  }
}

function drawTrianon(ctx: CanvasRenderingContext2D, W: number, skyH: number) {
  const cx = W * 0.36; const bh = skyH * 0.62;
  const bw = Math.max(22, W * 0.030); const top = skyH - bh; const left = cx - bw / 2;
  const gr = ctx.createLinearGradient(left, 0, left + bw, 0);
  gr.addColorStop(0, '#a0a09a'); gr.addColorStop(0.3, '#d4d2ca'); gr.addColorStop(1, '#9a9892');
  ctx.fillStyle = gr; ctx.fillRect(left, top + bh * 0.05, bw, bh * 0.95);
  ctx.fillRect(cx - bw * 0.42, top, bw * 0.84, bh * 0.05);
  const ww = Math.max(2, (bw - 8) / (5 * 2.4)); const wh = Math.max(3, ww * 2.0);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 5; c++) {
    ctx.fillStyle = absPr(c * 11 + r * 7 + 300) > 0.36 ? 'rgba(140,195,230,0.55)' : 'rgba(55,52,48,0.5)';
    ctx.fillRect(left + 4 + c * ww * 2.4, top + bh * 0.09 + r * wh * 2.1, ww, wh);
  }
  ctx.fillStyle = 'rgba(215,232,242,0.17)'; ctx.fillRect(left + 2, top, bw * 0.24, bh);
}

function drawTaunusturm(ctx: CanvasRenderingContext2D, W: number, skyH: number) {
  const cx = W * 0.76; const bh = skyH * 0.58;
  const bw = Math.max(16, W * 0.022); const top = skyH - bh; const left = cx - bw / 2;
  const gr = ctx.createLinearGradient(left, 0, left + bw, 0);
  gr.addColorStop(0, '#384a60'); gr.addColorStop(0.3, '#5880a8'); gr.addColorStop(1, '#283a58');
  ctx.fillStyle = gr; ctx.fillRect(left, top, bw, bh);
  ctx.fillStyle = '#4a6888'; ctx.fillRect(cx - 1, top - bh * 0.06, 2, bh * 0.06);
  const ww = (bw - 4) / (3 * 1.8); const wh = ww;
  for (let r = 0; r < 13; r++) for (let c = 0; c < 3; c++) {
    ctx.fillStyle = absPr(c * 6 + r * 19 + 400) > 0.40 ? 'rgba(130,200,235,0.50)' : 'rgba(28,45,72,0.6)';
    ctx.fillRect(left + 2 + c * ww * 1.8, top + 6 + r * wh * 2.4, ww, wh);
  }
  ctx.fillStyle = 'rgba(130,195,240,0.14)'; ctx.fillRect(left + 2, top, bw * 0.25, bh);
}

export function renderBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const skyH = H * 0.70;
  renderSky(ctx, W, skyH, t);

  // Far backdrop fillers
  const fillers = [
    { cx: 0.06 * W, bw: W * 0.030, bh: skyH * 0.40, c: '#8090a0' },
    { cx: 0.09 * W, bw: W * 0.020, bh: skyH * 0.48, c: '#7888a0' },
    { cx: 0.84 * W, bw: W * 0.025, bh: skyH * 0.44, c: '#8090a0' },
    { cx: 0.89 * W, bw: W * 0.035, bh: skyH * 0.36, c: '#909890' },
    { cx: 0.93 * W, bw: W * 0.020, bh: skyH * 0.46, c: '#8898a8' },
    { cx: 0.47 * W, bw: W * 0.016, bh: skyH * 0.34, c: '#9090a0' },
  ];
  fillers.forEach(f => {
    ctx.fillStyle = f.c; ctx.fillRect(f.cx - f.bw / 2, skyH - f.bh, f.bw, f.bh);
    ctx.fillStyle = 'rgba(140,170,220,0.10)'; ctx.fillRect(f.cx - f.bw / 2 + 2, skyH - f.bh, f.bw * 0.28, f.bh);
  });

  // Frankfurt iconic landmarks
  drawTaunusturm(ctx, W, skyH);
  drawWestendTower(ctx, W, skyH);
  drawTrianon(ctx, W, skyH);
  drawDeutscheBank(ctx, W, skyH);
  drawMainTower(ctx, W, skyH);
  drawMesseturm(ctx, W, skyH);
  drawCommerzbank(ctx, W, skyH);

  // Mid buildings
  MID_BUILDINGS.forEach((b, i) =>
    drawBuilding(ctx, b, W, skyH, '#c8c0b0', 'rgba(200,220,240,0.6)', 'rgba(80,70,55,0.55)', i + 100));

  // Near buildings
  NEAR_BUILDINGS.forEach((b, i) =>
    drawBuilding(ctx, b, W, skyH, '#c4a878', 'rgba(180,200,220,0.55)', 'rgba(70,55,35,0.6)', i + 200));

  renderMainufer(ctx, W, H, skyH);
}

// ─── Shotgun barrel (FPS view) ───────────────────────────────────────────────

export function renderGunBarrel(ctx: CanvasRenderingContext2D, W: number, H: number, shotFlash: number, crosshairX: number, crosshairY: number) {
  const recoil = shotFlash * 18;
  const barrelLen = H * 0.25;

  // Barrel tracks crosshair with soft damping
  const dx = crosshairX - W / 2;
  const dy = H * 0.80 - crosshairY;
  const rawAngle = Math.atan2(dx, Math.max(8, dy));
  const angle = Math.max(-0.40, Math.min(0.40, rawAngle * 0.30));

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
    // Tip ring
    ctx.fillStyle = '#111';
    ctx.fillRect(ox - bw / 2 - 1, -barrelLen, bw + 2, 7);
    // Bore
    ctx.fillStyle = '#050505';
    ctx.beginPath(); ctx.ellipse(ox, -barrelLen + 4, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(200,200,200,0.26)';
    ctx.fillRect(ox - bw / 2 + 3, -barrelLen + 8, 4, barrelLen - 52);
    // Rib band
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(ox - bw / 2, -barrelLen * 0.38, bw, 5);
    // Muzzle flash
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

  // Connector band
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(-(sep / 2 + 18), -barrelLen * 0.12, sep + 36, 7);
  // Forestock wood
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
