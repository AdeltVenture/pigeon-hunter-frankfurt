export type BehaviorType = 'drifter' | 'zigzagger' | 'diver' | 'circler';
export type PigeonState = 'flying' | 'diving' | 'hit' | 'dead';

export interface Pigeon {
  id: number;
  worldX: number;    // world X, 0 = center, ±1500 max range
  normalY: number;   // 0 = far/top, 1 = at player (triggers damage)
  scale: number;     // derived from normalY
  vx: number;        // world px / second
  vy: number;        // normalY / second
  state: PigeonState;
  hitTimer: number;
  deadTimer: number;
  wingPhase: number;
  wingSpeed: number; // rad/s
  rotation: number;
  psycho: number;    // 0..1
  zigPhase: number;
  health: number;
  maxHealth: number;
  isBoss: boolean;
  behavior: BehaviorType;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  decay: number; // life lost per second
  life: number;  // 0..1
  size: number;
  color: string;
}

export interface ShotEffect {
  id: number;
  x: number; y: number;
  isHit: boolean;
  timer: number; // 1 → 0
  scoreText?: string;
  particles: Particle[];
}

export interface HUDState {
  score: number;
  wave: number;
  health: number;
  ammo: number;
  maxAmmo: number;
  reloading: boolean;
  reloadProgress: number;
  waveMessage: string;
  phase: 'playing' | 'gameover';
}
