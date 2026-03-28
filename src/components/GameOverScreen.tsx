import { useState, useEffect } from 'react';

interface Props {
  score: number;
  wave: number;
  onRestart: () => void;
}

const HIGHSCORE_KEY = 'clemens_highscore';
const HIGHSCORE_WAVE_KEY = 'clemens_highscore_wave';

export default function GameOverScreen({ score, wave, onRestart }: Props) {
  const [visible, setVisible] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [highscore, setHighscore] = useState(0);

  useEffect(() => {
    const prev = parseInt(localStorage.getItem(HIGHSCORE_KEY) || '0', 10);
    if (score > prev) {
      localStorage.setItem(HIGHSCORE_KEY, String(score));
      localStorage.setItem(HIGHSCORE_WAVE_KEY, String(wave));
      setIsNewRecord(true);
      setHighscore(score);
    } else {
      setHighscore(prev);
    }
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, [score, wave]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, #1a0505 0%, #0a0202 100%)',
        fontFamily: 'monospace',
      }}
    >
      {/* Blood splatter background */}
      <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden', opacity: 0.12 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${10 + i * 12}%`,
            top: `${5 + (i % 3) * 30}%`,
            fontSize: `${30 + i * 8}px`,
            transform: `rotate(${i * 40}deg)`,
          }}>
            🩸
          </div>
        ))}
      </div>

      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.85)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.4, 0.64, 1)',
          maxWidth: 400,
          width: '90vw',
          textAlign: 'center',
        }}
      >
        {/* Pigeon icon */}
        <div style={{ fontSize: 56, marginBottom: 8, filter: 'grayscale(0.3)' }}>
          🕊️💀
        </div>

        {/* Title */}
        <div style={{
          color: '#cc2222',
          fontSize: 26,
          fontWeight: 'bold',
          letterSpacing: 3,
          textShadow: '0 0 20px rgba(200,30,30,0.8)',
          marginBottom: 4,
        }}>
          CLEMENS IST GEFALLEN
        </div>
        <div style={{
          color: 'rgba(180,100,100,0.7)',
          fontSize: 12,
          letterSpacing: 2,
          marginBottom: 28,
        }}>
          Frankfurt trauert.
        </div>

        {/* Stats card */}
        <div style={{
          background: 'rgba(30, 10, 10, 0.8)',
          border: '1px solid rgba(150, 50, 50, 0.4)',
          borderRadius: 10,
          padding: '18px 24px',
          marginBottom: 20,
        }}>
          <StatRow icon="🎯" label="CLEMENS' PUNKTE" value={score.toLocaleString()} highlight />
          <StatRow icon="🌊" label="ERREICHTE WELLE" value={`Welle ${wave}`} />
          {isNewRecord ? (
            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: 'rgba(255, 200, 0, 0.15)',
              border: '1px solid rgba(255, 200, 0, 0.4)',
              borderRadius: 6,
              color: '#ffdd00',
              fontSize: 12,
              fontWeight: 'bold',
              letterSpacing: 2,
            }}>
              ⭐ NEUER REKORD! ⭐
            </div>
          ) : (
            <StatRow icon="🏆" label="CLEMENS' BESTLEISTUNG" value={highscore.toLocaleString()} />
          )}
        </div>

        {/* Flavor text */}
        <div style={{
          color: 'rgba(150, 100, 100, 0.6)',
          fontSize: 10,
          letterSpacing: 1,
          marginBottom: 24,
          fontStyle: 'italic',
        }}>
          "Die Tauben haben gewonnen... diesmal."
        </div>

        {/* Restart button */}
        <button
          onClick={onRestart}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #5a1a1a, #3a0d0d)',
            border: '2px solid rgba(200, 60, 60, 0.6)',
            borderRadius: 8,
            color: '#ff8888',
            fontSize: 15,
            fontWeight: 'bold',
            letterSpacing: 3,
            fontFamily: 'monospace',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(180,30,30,0.3)',
          }}
        >
          🔄 NOCHMAL KÄMPFEN
        </button>

        <div style={{ marginTop: 12, color: 'rgba(100,60,60,0.5)', fontSize: 9, letterSpacing: 1 }}>
          Frankfurt braucht CLEMENS!
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value, highlight }: {
  icon: string; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 0',
      borderBottom: '1px solid rgba(100,30,30,0.2)',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ color: 'rgba(180,120,120,0.7)', fontSize: 9, letterSpacing: 1 }}>{label}</span>
      </div>
      <span style={{
        color: highlight ? '#ff6666' : '#cc9999',
        fontSize: highlight ? 20 : 14,
        fontWeight: highlight ? 'bold' : 'normal',
        textShadow: highlight ? '0 0 12px rgba(200,50,50,0.6)' : 'none',
      }}>
        {value}
      </span>
    </div>
  );
}
