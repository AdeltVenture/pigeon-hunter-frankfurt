// Web Audio API — synthesised sounds, no external files needed

let _ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

/** Gunshot bang */
export function playShot() {
  try {
    const ctx = ac();
    const t = ctx.currentTime;
    const len = ctx.sampleRate * 0.14;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.04));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 2200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    src.start(t);
  } catch { /* silently ignore if audio unavailable */ }
}

/** Pigeon squawk + thud on hit */
export function playHit() {
  try {
    const ctx = ac();
    const t = ctx.currentTime;

    // Descending squawk
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.25);
    osc.frequency.setValueAtTime(600, t + 0.25);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.5);
    oGain.gain.setValueAtTime(0.45, t);
    oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(oGain); oGain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.5);

    // Feather-flutter noise burst
    const nLen = ctx.sampleRate * 0.25;
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nLen * 0.35));
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = nBuf;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.18;
    nSrc.connect(nGain); nGain.connect(ctx.destination);
    nSrc.start(t);
  } catch { /* ignore */ }
}

/** Quiet miss click */
export function playMiss() {
  try {
    const ctx = ac();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.08);
  } catch { /* ignore */ }
}

/** Wave start fanfare */
export function playWaveStart() {
  try {
    const ctx = ac();
    const t = ctx.currentTime;
    [0, 0.12, 0.22].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = [440, 550, 660][i];
      gain.gain.setValueAtTime(0.12, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.18);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t + delay); osc.stop(t + delay + 0.18);
    });
  } catch { /* ignore */ }
}
