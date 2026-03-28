import { useState, useCallback } from 'react';
import IntroScreen from './components/IntroScreen';
import GameCanvas from './components/GameCanvas';
import GameOverScreen from './components/GameOverScreen';

type Screen = 'intro' | 'game' | 'gameover';

export default function App() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [finalScore, setFinalScore] = useState(0);
  const [finalWave, setFinalWave] = useState(1);
  const [gameKey, setGameKey] = useState(0);

  const handleStart = useCallback(() => {
    setGameKey(k => k + 1);
    setScreen('game');
  }, []);

  const handleGameOver = useCallback((score: number, wave: number) => {
    setFinalScore(score);
    setFinalWave(wave);
    setScreen('gameover');
  }, []);

  const handleRestart = useCallback(() => {
    setGameKey(k => k + 1);
    setScreen('game');
  }, []);

  return (
    <div style={{ width: '100vw', height: '100svh', position: 'relative', overflow: 'hidden' }}>
      {screen === 'intro' && <IntroScreen onStart={handleStart} />}
      {screen === 'game' && (
          <GameCanvas
          key={gameKey}
          onGameOver={handleGameOver}
        />
      )}
      {screen === 'gameover' && (
        <GameOverScreen
          score={finalScore}
          wave={finalWave}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
