import { useRef, useEffect } from 'react';

interface Props { onStart: () => void; }

// ── Canvas drawing helpers ────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#06080f');
  sky.addColorStop(0.45, '#0c1530');
  sky.addColorStop(0.72, '#1a2545');
  sky.addColorStop(0.85, '#2a1505');
  sky.addColorStop(1, '#180a04');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // City glow on horizon
  const glow = ctx.createRadialGradient(W / 2, H * 0.80, 0, W / 2, H * 0.80, W * 0.55);
  glow.addColorStop(0, 'rgba(255,110,20,0.38)');
  glow.addColorStop(0.35, 'rgba(255,55,0,0.14)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (let i = 0; i < 65; i++) {
    const sx = ((i * 137.508 + 17) % 1.0) * W;
    const sy = ((i * 97.32 + 5) % 0.5) * H;
    const flicker = 0.3 + Math.sin(t * 1.8 + i * 1.7) * 0.35 + 0.35;
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flicker * 0.9)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.5 + (i % 3) * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moon
  ctx.fillStyle = 'rgba(255,252,220,0.93)';
  ctx.beginPath(); ctx.arc(W * 0.87, H * 0.10, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(180,168,138,0.28)';
  ctx.beginPath(); ctx.arc(W * 0.87 + 7, H * 0.10 - 4, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,252,220,0.93)';
  ctx.beginPath(); ctx.arc(W * 0.87, H * 0.10, 20, 0, Math.PI * 2); ctx.fill();
}

function drawSkyline(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const groundY = H * 0.76;
  ctx.fillStyle = '#080e1c';

  // Landmark silhouettes
  type BType = 0 | 1 | 2 | 3 | 4;
  const buildings: [number, number, number, BType][] = [
    [0.17 * W, 32, groundY * 0.80, 2],  // Messeturm
    [0.27 * W, 24, groundY * 0.74, 3],  // Westend
    [0.36 * W, 28, groundY * 0.62, 0],  // Trianon
    [0.42 * W, 21, groundY * 0.91, 1],  // Commerzbank
    [0.52 * W, 40, groundY * 0.64, 4],  // DB Twins
    [0.62 * W, 22, groundY * 0.86, 0],  // Main Tower
    [0.74 * W, 20, groundY * 0.57, 0],  // Taunusturm
    [0.07 * W, 44, groundY * 0.40, 0],
    [0.86 * W, 50, groundY * 0.38, 3],
    [0.94 * W, 32, groundY * 0.33, 0],
  ];

  buildings.forEach(([cx, bw, bh, type]) => {
    const left = cx - bw / 2;
    const top = groundY - bh;
    switch (type) {
      case 0: ctx.fillRect(left, top, bw, bh); break;
      case 1: // Commerzbank: triangle crown
        ctx.fillRect(left, top + bh * 0.13, bw, bh * 0.87);
        ctx.beginPath();
        ctx.moveTo(left - 2, top + bh * 0.13); ctx.lineTo(cx, top); ctx.lineTo(left + bw + 2, top + bh * 0.13);
        ctx.closePath(); ctx.fill();
        ctx.fillRect(cx - 1, top - bh * 0.09, 2, bh * 0.09);
        break;
      case 2: // Messeturm: pyramid
        ctx.fillRect(left, top + bh * 0.23, bw, bh * 0.77);
        ctx.beginPath();
        ctx.moveTo(left - 4, top + bh * 0.23); ctx.lineTo(cx, top); ctx.lineTo(left + bw + 4, top + bh * 0.23);
        ctx.closePath(); ctx.fill();
        break;
      case 3: // Stepped
        ctx.fillRect(left, top + bh * 0.55, bw, bh * 0.45);
        ctx.fillRect(left + bw * 0.10, top + bh * 0.25, bw * 0.80, bh * 0.30);
        ctx.fillRect(left + bw * 0.22, top, bw * 0.56, bh * 0.25);
        break;
      case 4: // Twin towers
        ctx.fillRect(left, top, bw * 0.44, bh);
        ctx.fillRect(left + bw * 0.56, top, bw * 0.44, bh);
        ctx.fillRect(left, top + bh * 0.40, bw, 4);
        break;
    }

    // Lit windows
    ctx.fillStyle = 'rgba(200,225,255,0.10)';
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < Math.max(2, Math.floor(bw / 9)); c++) {
        if (Math.sin(c * 7.3 + r * 11.7) > 0.1) {
          ctx.fillRect(left + 3 + c * 9, top + bh * 0.12 + r * (bh * 0.75 / 6), 5, 3);
        }
      }
    }
    ctx.fillStyle = '#080e1c';
  });

  // Ground strip
  ctx.fillRect(0, groundY, W, H - groundY);

  // Ground glow
  const groundGlow = ctx.createLinearGradient(0, groundY - 20, 0, groundY + 20);
  groundGlow.addColorStop(0, 'rgba(255,90,20,0.15)');
  groundGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = groundGlow;
  ctx.fillRect(0, groundY - 20, W, 40);
}

function drawCrazyPigeon(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const wA = Math.sin(t * 14) * 0.85;

  ctx.fillStyle = '#aa9088';
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 19, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#8a7068';
  ctx.save(); ctx.rotate(-wA);
  ctx.beginPath(); ctx.ellipse(-16, 4, 23, 9, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#b8a098';
  ctx.save(); ctx.rotate(wA);
  ctx.beginPath(); ctx.ellipse(11, -2, 23, 9, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#9a8878';
  ctx.beginPath(); ctx.arc(23, -9, 15, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(28, -13, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(20, -13, 7, 0, Math.PI * 2); ctx.fill();

  const ix = Math.cos(t * 9) * 3;
  const iy = Math.sin(t * 9) * 3;
  ctx.fillStyle = '#ff0000';
  ctx.beginPath(); ctx.arc(28 + ix, -13 + iy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(20 + ix * 0.8, -13 + iy * 0.8, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(28 + ix, -13 + iy, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(20 + ix * 0.8, -13 + iy * 0.8, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(30 + ix, -15 + iy, 1.8, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#aa0000';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(18, -23); ctx.lineTo(36, -20); ctx.stroke();

  ctx.fillStyle = '#ff8c00';
  ctx.beginPath(); ctx.moveTo(38, -9); ctx.lineTo(48, -7); ctx.lineTo(38, -5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawClemens(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, scale: number) {
  const bob = Math.sin(t * 1.9) * 6;
  const capeWave = Math.sin(t * 2.3);

  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.scale(scale, scale);

  // Subtle glow
  const glow = ctx.createRadialGradient(0, -30, 5, 0, -30, 110);
  glow.addColorStop(0, 'rgba(255,215,40,0.30)');
  glow.addColorStop(0.5, 'rgba(255,140,0,0.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, -30, 110, 0, Math.PI * 2); ctx.fill();

  // Cape (behind body)
  ctx.fillStyle = '#cc1122';
  ctx.beginPath();
  ctx.moveTo(-8, -38);
  ctx.bezierCurveTo(-48 + capeWave * 18, -2, -58 + capeWave * 22, 38, -42 + capeWave * 28, 68);
  ctx.lineTo(-6, 64);
  ctx.bezierCurveTo(-14, 32, -6, 2, -8, -38);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.stroke();

  // Body / shirt (simpler)
  ctx.fillStyle = '#909090';
  ctx.beginPath(); ctx.roundRect(-20, -12, 40, 48, [4, 4, 3, 3]); ctx.fill();

  // Batman logo (compact)
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(0, 14, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.moveTo(0, 9); ctx.lineTo(-5, 11); ctx.lineTo(-11, 9);
  ctx.lineTo(-7, 13); ctx.lineTo(-12, 17); ctx.lineTo(-6, 19);
  ctx.lineTo(-3, 17); ctx.lineTo(0, 19); ctx.lineTo(3, 17);
  ctx.lineTo(6, 19); ctx.lineTo(12, 17); ctx.lineTo(7, 13);
  ctx.lineTo(11, 9); ctx.lineTo(5, 11); ctx.closePath(); ctx.fill();

  // Legs
  ctx.fillStyle = '#3a5a9a';
  ctx.fillRect(-18, 34, 14, 38);
  ctx.fillRect(4, 34, 14, 38);
  // Boots
  ctx.fillStyle = '#1a1a3a';
  ctx.fillRect(-20, 66, 18, 12);
  ctx.fillRect(2, 66, 18, 12);

  // Left arm
  ctx.fillStyle = '#909090';
  ctx.beginPath(); ctx.roundRect(-34, -10, 18, 12, 4); ctx.fill();
  ctx.fillStyle = '#fad4a8';
  ctx.beginPath(); ctx.arc(-34, -6, 9, 0, Math.PI * 2); ctx.fill();

  // Right arm + shotgun
  ctx.fillStyle = '#909090';
  ctx.beginPath(); ctx.roundRect(16, -10, 18, 12, 4); ctx.fill();
  ctx.fillStyle = '#fad4a8';
  ctx.beginPath(); ctx.arc(34, -6, 9, 0, Math.PI * 2); ctx.fill();

  // Shotgun
  ctx.save();
  ctx.translate(36, -9);
  ctx.rotate(-0.42);
  const sg = ctx.createLinearGradient(-3, 0, 3, 0);
  sg.addColorStop(0, '#2a1008'); sg.addColorStop(0.5, '#5a2808'); sg.addColorStop(1, '#1a0804');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.roundRect(0, -3, 18, 7, 2); ctx.fill();
  [-1.5, 1.5].forEach(oy => {
    const mg = ctx.createLinearGradient(0, oy - 2.5, 0, oy + 2.5);
    mg.addColorStop(0, '#111'); mg.addColorStop(0.5, '#484848'); mg.addColorStop(1, '#111');
    ctx.fillStyle = mg; ctx.fillRect(17, oy - 2, 32, 4);
    ctx.fillStyle = '#060606'; ctx.fillRect(47, oy - 3, 4, 6);
  });
  ctx.fillStyle = '#222'; ctx.fillRect(10, -5, 9, 10);
  ctx.restore();

  // Neck
  ctx.fillStyle = '#fad4a8';
  ctx.fillRect(-7, -18, 14, 10);

  // Head (big, round, simple — no chubby cheeks, no nose)
  ctx.fillStyle = '#fad4a8';
  ctx.beginPath(); ctx.arc(0, -44, 34, 0, Math.PI * 2); ctx.fill();

  // Short blonde hair
  ctx.fillStyle = '#e8c858';
  ctx.beginPath();
  ctx.arc(0, -48, 35, Math.PI * 1.05, Math.PI * 1.95, false);
  ctx.arc(0, -48, 22, Math.PI * 1.95, Math.PI * 1.05, true);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2d870';
  ctx.beginPath();
  ctx.arc(1, -53, 34, Math.PI * 1.15, Math.PI * 1.82, false);
  ctx.arc(1, -53, 27, Math.PI * 1.82, Math.PI * 1.15, true);
  ctx.closePath(); ctx.fill();

  // Eyes (big blue, simple)
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-12, -47, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, -47, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4880c0';
  ctx.beginPath(); ctx.arc(-12, -46, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12, -46, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#181818';
  ctx.beginPath(); ctx.arc(-11, -45, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(13, -45, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath(); ctx.arc(-9, -48, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(15, -48, 1.8, 0, Math.PI * 2); ctx.fill();

  // Eyebrows (light)
  ctx.strokeStyle = '#c8a030'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-20, -61); ctx.quadraticCurveTo(-12, -65, -4, -62); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -62); ctx.quadraticCurveTo(12, -65, 20, -61); ctx.stroke();

  // Simple smile
  ctx.strokeStyle = '#d08060'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-9, -28); ctx.quadraticCurveTo(0, -22, 9, -28);
  ctx.stroke();

  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number) {
  const s = size * (0.7 + Math.sin(t * 4.2) * 0.3);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 1.6);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.fillStyle = `rgba(255,228,55,${0.55 + Math.sin(t * 3.2 + i) * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * s * 0.38, Math.sin(a) * s * 0.38);
    ctx.lineTo(Math.cos(a + Math.PI / 4) * s, Math.sin(a + Math.PI / 4) * s);
    ctx.lineTo(Math.cos(a + Math.PI / 2) * s * 0.38, Math.sin(a + Math.PI / 2) * s * 0.38);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function IntroScreen({ onStart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    const bgPigeons = Array.from({ length: 5 }, (_, i) => ({
      x: (0.05 + i * 0.22) * window.innerWidth,
      y: (0.15 + i * 0.08) * window.innerHeight,
      vx: 60 + i * 22,
    }));

    let startTs = 0;

    const frame = (ts: number) => {
      if (!startTs) startTs = ts;
      const t = (ts - startTs) / 1000;
      const dt = 0.016;
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      const ctx = canvas.getContext('2d')!;

      ctx.save();
      ctx.scale(dpr, dpr);

      drawBackground(ctx, W, H, t);
      drawSkyline(ctx, W, H);

      // Spotlight on hero
      const spot = ctx.createRadialGradient(W * 0.5, H * 0.5, 8, W * 0.5, H * 0.5, H * 0.6);
      spot.addColorStop(0, 'rgba(255,235,190,0.16)');
      spot.addColorStop(0.5, 'rgba(255,190,80,0.05)');
      spot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, H);

      // Background crazy pigeons
      bgPigeons.forEach(p => {
        p.x += p.vx * dt;
        if (p.x > W + 80) p.x = -80;
        const s = 0.85 + (p.y / H) * 0.55;
        drawCrazyPigeon(ctx, p.x, p.y, t, s);
      });

      // Clemens — slightly left of center so title stays visible
      const charScale = Math.min(H * 0.0022, W * 0.0010, 0.95);
      const charX = W * 0.38;
      const charY = H * 0.60;
      drawClemens(ctx, charX, charY, t, charScale);

      // Sparkles around Clemens
      for (let i = 0; i < 8; i++) {
        const sa = (i / 8) * Math.PI * 2 + t * 0.72;
        const baseR = 80 * charScale;
        const sr = baseR + Math.sin(t * 2.1 + i) * baseR * 0.2;
        const sx = charX + Math.cos(sa) * sr;
        const sy = (charY - 60 * charScale) + Math.sin(sa * 0.75) * sr * 0.5;
        const ss = (6 + Math.sin(t * 3.8 + i * 1.3) * 2.5) * charScale;
        drawSparkle(ctx, sx, sy, ss, t + i * 0.9);
      }

      // Controls panel — right side, next to Clemens
      const ctrlX = W * 0.60;
      const ctrlY = H * 0.44;
      const ctrlLineH = Math.min(H * 0.040, 18);
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = `bold ${ctrlLineH * 0.85}px monospace`;
      ctx.fillStyle = 'rgba(180,215,255,0.90)';
      ctx.fillText('STEUERUNG', ctrlX, ctrlY);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(150,200,255,0.35)';
      ctx.beginPath(); ctx.moveTo(ctrlX, ctrlY + 4); ctx.lineTo(ctrlX + W * 0.30, ctrlY + 4); ctx.stroke();
      const lines = [
        { icon: '>', text: 'Maus / Finger bewegen' },
        { icon: '>', text: 'Klick / Tippen: Schiessen' },
        { icon: '>', text: 'Handy: Querformat' },
      ];
      ctx.font = `${ctrlLineH * 0.78}px monospace`;
      lines.forEach((l, li) => {
        const ly = ctrlY + ctrlLineH * (1.6 + li * 1.55);
        ctx.fillStyle = 'rgba(255,200,80,0.85)';
        ctx.fillText(l.icon, ctrlX, ly);
        ctx.fillStyle = 'rgba(200,230,255,0.82)';
        ctx.fillText(l.text, ctrlX + 16, ly);
      });
      ctx.restore();

      // Title — drawn LAST so it's always on top of Clemens
      const bigSize = Math.min(W * 0.13, H * 0.17, 92);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `900 ${bigSize}px impact, 'Arial Black', monospace`;
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 40;
      ctx.fillStyle = '#ffd700';
      ctx.fillText('CLEMENS', W / 2, H * 0.12);
      ctx.shadowBlur = 70;
      ctx.strokeStyle = '#ff5500';
      ctx.lineWidth = bigSize * 0.065;
      ctx.strokeText('CLEMENS', W / 2, H * 0.12);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff5d0';
      ctx.fillText('CLEMENS', W / 2, H * 0.12);
      ctx.restore();

      // "· PIGEON HUNTER ·"
      const subSize = Math.min(W * 0.055, H * 0.072, 42);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `bold ${subSize}px impact, monospace`;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#ff3322';
      ctx.fillText('· PIGEON HUNTER ·', W / 2, H * 0.12 + bigSize * 0.88);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff6655';
      ctx.fillText('· PIGEON HUNTER ·', W / 2, H * 0.12 + bigSize * 0.88);
      ctx.restore();

      // "FRANKFURT"
      const fSize = Math.min(W * 0.028, H * 0.038, 22);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `bold ${fSize}px monospace`;
      ctx.fillStyle = 'rgba(150,205,255,0.80)';
      ctx.fillText('F R A N K F U R T', W / 2, H * 0.12 + bigSize * 0.88 + subSize * 1.15);
      ctx.restore();

      ctx.restore();
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: 'monospace' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* CTA button — bottom center */}
      <div style={{
        position: 'absolute', bottom: '5%', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <button
          onClick={onStart}
          style={{
            padding: '16px 52px',
            background: 'linear-gradient(135deg, #e63222, #9e1010)',
            border: '2px solid rgba(255,100,80,0.8)',
            borderRadius: 14, color: 'white',
            fontSize: 'clamp(15px, 3.5vw, 22px)',
            fontWeight: 'bold', letterSpacing: 4,
            fontFamily: 'impact, monospace', cursor: 'pointer',
            boxShadow: '0 0 40px rgba(230,50,30,0.65), 0 4px 20px rgba(0,0,0,0.55)',
            transition: 'transform 0.12s, box-shadow 0.12s',
            textTransform: 'uppercase',
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'scale(1.06)';
            e.currentTarget.style.boxShadow = '0 0 65px rgba(230,50,30,0.9), 0 4px 25px rgba(0,0,0,0.6)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(230,50,30,0.65), 0 4px 20px rgba(0,0,0,0.55)';
          }}
        >
          JETZT TAUBEN JAGEN
        </button>
      </div>
    </div>
  );
}
