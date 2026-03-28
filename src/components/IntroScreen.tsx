import { useState, useEffect } from 'react';

interface Props {
  onStart: () => void;
}

export default function IntroScreen({ onStart }: Props) {
  const [visible, setVisible] = useState(false);
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setStamped(true), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, #1a1a3a 0%, #08080f 100%)',
        fontFamily: 'monospace',
      }}
    >
      {/* Background city silhouette */}
      <div className="absolute inset-0 overflow-hidden" style={{ opacity: 0.15 }}>
        <svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMax meet" style={{ width: '100%', position: 'absolute', bottom: 0 }}>
          {/* Commerzbank */}
          <polygon points="155,10 160,0 165,10 165,80 155,80" fill="#334" />
          {/* Messeturm */}
          <polygon points="100,25 104,15 108,25 108,80 100,80" fill="#334" />
          {/* Main Tower */}
          <rect x="200" y="20" width="12" height="60" rx="6" fill="#334" />
          {/* Misc */}
          <rect x="50" y="40" width="18" height="40" fill="#334" />
          <rect x="240" y="35" width="22" height="45" fill="#334" />
          <rect x="300" y="45" width="16" height="35" fill="#334" />
          <rect x="340" y="50" width="20" height="30" fill="#334" />
          <rect x="15" y="55" width="14" height="25" fill="#334" />
          <rect x="370" y="52" width="12" height="28" fill="#334" />
        </svg>
      </div>

      {/* ID Card */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
          maxWidth: 380,
          width: '90vw',
        }}
      >
        {/* Card */}
        <div style={{
          background: 'linear-gradient(145deg, #1e2a3a, #151e2a)',
          border: '2px solid rgba(100, 150, 200, 0.4)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(60,100,200,0.2)',
        }}>
          {/* Header bar */}
          <div style={{
            background: 'linear-gradient(90deg, #1a3a1a, #0d2a0d)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid rgba(80,180,80,0.3)',
          }}>
            {/* City crest */}
            <div style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #c8a000, #8a6800)',
              borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>
              🦅
            </div>
            <div>
              <div style={{ color: '#a0e0a0', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>
                Stadt Frankfurt am Main
              </div>
              <div style={{ color: '#80c880', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
                ORDNUNGSAMT
              </div>
              <div style={{ color: '#60a860', fontSize: 8, letterSpacing: 1 }}>
                Sonderkommando Taubenabwehr
              </div>
            </div>
            <div style={{ marginLeft: 'auto', color: '#4a8a4a', fontSize: 8, textAlign: 'right' }}>
              <div>NR. 069-TAU</div>
              <div>⬛ AKTIV</div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 16px 12px', display: 'flex', gap: 14 }}>
            {/* Photo */}
            <div style={{
              width: 80, height: 96, flexShrink: 0,
              background: 'linear-gradient(160deg, #2a3a4a, #1a2530)',
              border: '2px solid rgba(100,150,200,0.35)',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38,
              position: 'relative',
              overflow: 'hidden',
            }}>
              🕵️
              {/* Photo grid lines (like a real ID) */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(100,150,200,0.06) 11px, rgba(100,150,200,0.06) 12px)',
              }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Field label="NAME" value="CLEMENS" large />
              <Field label="EINHEIT" value="Taubenabwehr Spezialeinheit" />
              <Field label="RANG" value="Hauptjäger Klasse 1" />
              <Field label="DIENSTORT" value="Frankfurt am Main" />
              <Field label="AUSRÜSTUNG" value="Präzisionsgewehr Typ-069" />
            </div>
          </div>

          {/* Warning bar */}
          <div style={{
            background: 'rgba(180, 30, 30, 0.18)',
            border: '1px solid rgba(200, 50, 50, 0.35)',
            margin: '0 12px 12px',
            borderRadius: 6,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#ff8888', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>
                AKTUELLE BEDROHUNGSLAGE
              </div>
              <div style={{ color: '#cc6666', fontSize: 9, marginTop: 2 }}>
                PSYCHO-TAUBEN befallen Frankfurt! Sofortige Intervention erforderlich.
              </div>
            </div>
          </div>

          {/* Psycho stamp */}
          {stamped && (
            <div style={{
              position: 'absolute',
              top: 80, right: 20,
              transform: 'rotate(-18deg)',
              opacity: 0.85,
              animation: 'stamp 0.3s ease-out',
            }}>
              <div style={{
                border: '3px solid #cc0000',
                color: '#cc0000',
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 'bold',
                letterSpacing: 2,
                borderRadius: 3,
                textShadow: '0 0 4px rgba(200,0,0,0.5)',
                boxShadow: '0 0 8px rgba(200,0,0,0.3)',
                whiteSpace: 'nowrap',
              }}>
                HÖCHSTE ALARMST.
              </div>
            </div>
          )}

          {/* Start button */}
          <div style={{ padding: '0 12px 14px' }}>
            <button
              onClick={onStart}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #1a5a1a, #0d3a0d)',
                border: '2px solid rgba(80, 200, 80, 0.6)',
                borderRadius: 8,
                color: '#80ff80',
                fontSize: 15,
                fontWeight: 'bold',
                letterSpacing: 3,
                fontFamily: 'monospace',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(60,200,60,0.25)',
                transition: 'all 0.15s',
                textTransform: 'uppercase',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #226622, #0f480f)')}
              onMouseOut={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #1a5a1a, #0d3a0d)')}
            >
              ▶ MISSION STARTEN
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div style={{
          textAlign: 'center', marginTop: 10,
          color: 'rgba(100,120,150,0.5)', fontSize: 9, letterSpacing: 1,
        }}>
          HALTE DEIN GERÄT QUER • LANDSCAPE MODE EMPFOHLEN
        </div>
      </div>

      <style>{`
        @keyframes stamp {
          0%  { transform: rotate(-18deg) scale(3); opacity: 0; }
          60% { transform: rotate(-18deg) scale(0.9); opacity: 1; }
          100%{ transform: rotate(-18deg) scale(1); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div>
      <div style={{ color: 'rgba(100,140,180,0.6)', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        color: large ? '#e0f0ff' : '#b0c8e0',
        fontSize: large ? 18 : 10,
        fontWeight: large ? 'bold' : 'normal',
        letterSpacing: large ? 2 : 0.5,
        marginTop: 1,
      }}>
        {value}
      </div>
    </div>
  );
}
