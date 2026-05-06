import type { RobotType, TurretType } from '../types'

export const TILE_SIZE = 2

export const ROBOT_STATS: Record<RobotType, { hp: number; speed: number; damage: number; reward: number }> = {
  scout:   { hp: 40,  speed: 4.0, damage: 5,  reward: 10 },
  bruiser: { hp: 120, speed: 2.0, damage: 15, reward: 20 },
  sapper:  { hp: 60,  speed: 1.5, damage: 40, reward: 30 },
}

export const TURRET_STATS: Record<TurretType, { damage: number; range: number; cooldown: number; cost: number }> = {
  pulse:  { damage: 10, range: 5, cooldown: 0.8,  cost: 50  },
  cannon: { damage: 35, range: 4, cooldown: 2.5,  cost: 100 },
  beam:   { damage: 8,  range: 6, cooldown: 0.3,  cost: 150 },
}

export const TURRET_COLORS: Record<TurretType, string> = {
  pulse:  '#22d3ee',
  cannon: '#fbbf24',
  beam:   '#a78bfa',
}

export const SIDE_COLOR: Record<'player' | 'enemy', string> = {
  player: '#22d3ee',
  enemy:  '#f472b6',
}

export const WAVE_CONFIG = [
  { scouts: 3, bruisers: 1, sappers: 0 },
  { scouts: 4, bruisers: 2, sappers: 1 },
  { scouts: 6, bruisers: 3, sappers: 2 },
]

export const CREDIT_TICK_INTERVAL = 3  // seconds between passive income
export const CREDIT_TICK_AMOUNT   = 15
