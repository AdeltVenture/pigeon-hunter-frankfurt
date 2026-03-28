export type BehaviorType = 'drifter' | 'zigzagger' | 'diver' | 'circler';
export type PigeonState = 'flying' | 'diving' | 'hit' | 'dead';

export interface Pigeon {
  id: number;
  worldX: number;
  normalY: number;
  scale: number;
  vx: number;
  vy: number;
  state: PigeonState;
  hitTimer: number;
  deadTimer: number;
  wingPhase: number;
  wingSpeed: number;
  rotation: number;
  psycho: number;
  zigPhase: number;
  health: number;
  maxHealth: number;
  isBoss: boolean;
  behavior: BehaviorType;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  decay: number;
  life: number;
  size: number;
  color: string;
}

export interface ShotEffect {
  id: number;
  x: number; y: number;
  isHit: boolean;
  timer: number;
  scoreText?: string;
  particles: Particle[];
}

export interface HUDState {
  score: number;
  wave: number;
  health: number;
  waveMessage: string;
  phase: 'playing' | 'gameover';
}
