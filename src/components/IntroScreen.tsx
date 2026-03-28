import { useState, useEffect } from 'react';

interface Props { onStart: () => void; }

export default function IntroScreen({ onStart }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 80); return () => clearTimeout(t); }, []);

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, #1a4a8a 0%, #0d2a5a 50%, #0a1a3a 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
        overflow: 'hidden',
      }}
    >
      {/* Skyline silhouette */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.12 }}>
        <svg viewBox="0 0 800 160" preserveAspectRatio="xMidYMax meet" style={{ width: '100%', display: 'block' }}>
          <polygon points="295,20 300,0 305,20 305,160 295,160" fill="white" />
          <polygon points="170,40 175,20 180,40 180,160 170,160" fill="white" />
          <rect x="395" y="25" width="18" height="135" rx="9" fill="white" />
          <rect x="480" y="45" width="40" height="115" fill="white" />
          <rect x="75" y="60" width="28" height="100" fill="white" />
          <rect x="560" y="55" width="22" height="105" fill="white" />
          <rect x="660" y="65" width="30" height="95" fill="white" />
          <rect x="20" y="75" width="20" height="85" fill="white" />
          <rect x="740" y="70" width="18" height="90" fill="white" />
        </svg>
      </div>

      {/* Main card */}
      <div style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
        transition: 'all 0.45s cubic-bezier(0.34, 1.5, 0.64, 1)',
        textAlign: 'center', padding: '0 24px', maxWidth: 420, width: '100%',
      }}>

        {/* Pigeons icon */}
        <div style={{ fontSize: 64, marginBottom: 8, lineHeight: 1 }}>🕊️💥🕊️</div>

        {/* Title */}
        <div style={{ color: '#ffffff', fontSize: 'clamp(26px, 6vw, 38px)', fontWeight: 'bold', letterSpacing: 3, textShadow: '0 0 30px rgba(100,180,255,0.8)', marginBottom: 4 }}>
          PIGEON HUNTER
        </div>
        <div style={{ color: '#80c8ff', fontSize: 'clamp(14px, 3vw, 18px)', letterSpacing: 5, marginBottom: 28 }}>
          F R A N K F U R T
        </div>

        {/* Clemens tagline */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 10, padding: '10px 20px', marginBottom: 32,
          color: 'rgba(200,220,255,0.85)', fontSize: 14, lineHeight: 1.5,
        }}>
          🕵️ <strong style={{ color: 'white' }}>Clemens</strong> braucht deine Hilfe!<br />
          <span style={{ fontSize: 12, opacity: 0.75 }}>Die Psycho-Tauben haben Frankfurt im Griff.</span>
        </div>

        {/* Controls hint */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 32 }}>
          {[['🖱️', 'Maus / Finger', 'Zielen'], ['🖱️', 'Klick / Tap', 'Schießen']].map(([icon, input, action]) => (
            <div key={action} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>{icon}</div>
              <div style={{ color: '#80c8ff', fontSize: 10, marginTop: 2 }}>{input}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>{action}</div>
            </div>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          style={{
            width: '100%', padding: '16px',
            background: 'linear-gradient(135deg, #e63232, #a01818)',
            border: '2px solid rgba(255,100,100,0.7)',
            borderRadius: 12, color: 'white',
            fontSize: 'clamp(14px, 3vw, 18px)',
            fontWeight: 'bold', letterSpacing: 4,
            fontFamily: 'monospace', cursor: 'pointer',
            boxShadow: '0 0 30px rgba(220,50,50,0.45)',
            transition: 'transform 0.12s, box-shadow 0.12s',
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(220,50,50,0.65)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(220,50,50,0.45)'; }}
        >
          🔫 JETZT JAGEN
        </button>

        <div style={{ marginTop: 14, color: 'rgba(150,180,220,0.45)', fontSize: 10, letterSpacing: 1 }}>
          📱 Querformat empfohlen auf dem Handy
        </div>
      </div>
    </div>
  );
}
