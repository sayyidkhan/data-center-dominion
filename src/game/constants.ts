import type { TowerDef, EnemyDef, TowerType, EnemyType } from './types';

export const CELL_SIZE = 36;
export const GRID_COLS = 42;        // full map width
export const GRID_ROWS = 14;
export const VIEWPORT_COLS = 32;    // visible columns at once
export const VIEWPORT_W = CELL_SIZE * VIEWPORT_COLS;
export const VIEWPORT_H = CELL_SIZE * GRID_ROWS;
export const MAP_W = CELL_SIZE * GRID_COLS;
export const MAP_H = CELL_SIZE * GRID_ROWS;

/** Fixed HUD strip height — room for readable labels + stats + controls. */
export const HUD_SLOT_H = 116;

/** Bottom shop / mecha panel height (fixed shell; menu uses empty placeholder). */
export const FOOTER_H = 292;

/** Min width for footer `1fr 2fr 1fr` grid (hero | shop | briefing) before horizontal scroll. */
export const FOOTER_GRID_MIN_W = 1120;

// Legacy aliases kept for compatibility
export const CANVAS_WIDTH = VIEWPORT_W;
export const CANVAS_HEIGHT = VIEWPORT_H;

export const STARTING_GOLD = 200;
export const STARTING_LIVES = 20;
export const MAX_WAVES = 15;

export const HERO_START = {
  x: CELL_SIZE * 4.5,
  y: CELL_SIZE * 7,
};

export const HERO_STATS = {
  speed: 145,
  damage: 5,
  range: 3.75,
  fireRate: 4,
};

// Castle is at LEFT, gate faces RIGHT at row 7 (vertical center of 14-row grid).
// Path snakes right-to-left. Last waypoint must be [3, 7] so enemies march
// directly into the gate opening which is centered on row 7.
export const PATH_WAYPOINTS: [number, number][] = [
  [41, 2],   // spawn: top-right
  [36, 2],
  [36, 6],
  [31, 6],
  [31, 2],
  [26, 2],
  [26, 10],
  [21, 10],
  [21, 6],
  [16, 6],
  [16, 11],
  [11, 11],
  [11, 3],
  [6,  3],
  [6,  10],
  [3,  10],
  [3,  7],   // align with data center intake bay
];

export const TOWER_DEFS: Record<TowerType, TowerDef> = {
  cannon: {
    type: 'cannon',
    name: 'Cannon',
    cost: 75,
    damage: 45,
    range: 3.5,
    fireRate: 1.2,
    color: '#4a7fa5',
    accentColor: '#00d4ff',
    description: 'Debuff tower. Cracks armor and exposes priority targets.',
    projectileType: 'bullet',
    splashRadius: 0,
    slowAmount: 0,
    slowDuration: 0,
    upgradeCost: [100, 175],
  },
  laser: {
    type: 'laser',
    name: 'Laser',
    cost: 120,
    damage: 18,
    range: 4,
    fireRate: 8,
    color: '#e040fb',
    accentColor: '#ce93d8',
    description: 'Rapid-fire laser. Low damage but high DPS.',
    projectileType: 'laser_beam',
    splashRadius: 0,
    slowAmount: 0,
    slowDuration: 0,
    upgradeCost: [150, 250],
  },
  frost: {
    type: 'frost',
    name: 'Frost',
    cost: 100,
    damage: 20,
    range: 3,
    fireRate: 0.6,
    color: '#29b6f6',
    accentColor: '#80deea',
    description: 'Slows enemies. Essential for crowd control.',
    projectileType: 'frost_bolt',
    splashRadius: 2.25,
    slowAmount: 0.4,
    slowDuration: 2000,
    upgradeCost: [130, 210],
  },
  tesla: {
    type: 'tesla',
    name: 'Tesla',
    cost: 150,
    damage: 80,
    range: 3,
    fireRate: 0.8,
    color: '#ffee58',
    accentColor: '#fff176',
    description: 'Chain lightning. Hits multiple enemies.',
    projectileType: 'lightning',
    splashRadius: 1.5,
    slowAmount: 0,
    slowDuration: 0,
    upgradeCost: [200, 350],
  },
  missile: {
    type: 'missile',
    name: 'Missile',
    cost: 200,
    damage: 200,
    range: 5,
    fireRate: 0.4,
    color: '#ff7043',
    accentColor: '#ffab91',
    description: 'Massive splash damage. Slow fire rate.',
    projectileType: 'missile',
    splashRadius: 2,
    slowAmount: 0,
    slowDuration: 0,
    upgradeCost: [275, 450],
  },
};

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  grunt: {
    type: 'grunt',
    hp: 80,
    speed: 80,
    reward: 10,
    armor: 0,
    color: '#ef5350',
    size: 10,
    isBoss: false,
  },
  speeder: {
    type: 'speeder',
    hp: 40,
    speed: 160,
    reward: 15,
    armor: 0,
    color: '#ff9800',
    size: 8,
    isBoss: false,
  },
  tank: {
    type: 'tank',
    hp: 400,
    speed: 45,
    reward: 30,
    armor: 15,
    color: '#78909c',
    size: 16,
    isBoss: false,
  },
  swarm: {
    type: 'swarm',
    hp: 25,
    speed: 120,
    reward: 5,
    armor: 0,
    color: '#ab47bc',
    size: 7,
    isBoss: false,
  },
  boss: {
    type: 'boss',
    hp: 2000,
    speed: 55,
    reward: 200,
    armor: 30,
    color: '#d32f2f',
    size: 22,
    isBoss: true,
  },
};

export interface WaveDef {
  enemies: { type: EnemyType; count: number; interval: number }[];
  goldBonus: number;
}

export const WAVE_DEFS: WaveDef[] = [
  // Wave 1
  { enemies: [{ type: 'grunt', count: 10, interval: 800 }], goldBonus: 25 },
  // Wave 2
  { enemies: [{ type: 'grunt', count: 12, interval: 700 }, { type: 'speeder', count: 4, interval: 1200 }], goldBonus: 30 },
  // Wave 3
  { enemies: [{ type: 'speeder', count: 8, interval: 600 }, { type: 'grunt', count: 8, interval: 800 }], goldBonus: 35 },
  // Wave 4
  { enemies: [{ type: 'tank', count: 3, interval: 2000 }, { type: 'grunt', count: 10, interval: 700 }], goldBonus: 40 },
  // Wave 5
  { enemies: [{ type: 'swarm', count: 20, interval: 300 }, { type: 'speeder', count: 6, interval: 600 }], goldBonus: 50 },
  // Wave 6
  { enemies: [{ type: 'tank', count: 5, interval: 1500 }, { type: 'speeder', count: 10, interval: 500 }], goldBonus: 55 },
  // Wave 7
  { enemies: [{ type: 'grunt', count: 20, interval: 500 }, { type: 'swarm', count: 15, interval: 350 }], goldBonus: 60 },
  // Wave 8
  { enemies: [{ type: 'tank', count: 6, interval: 1200 }, { type: 'swarm', count: 20, interval: 300 }], goldBonus: 70 },
  // Wave 9 - mini boss
  { enemies: [{ type: 'boss', count: 1, interval: 5000 }, { type: 'grunt', count: 15, interval: 600 }], goldBonus: 100 },
  // Wave 10
  { enemies: [{ type: 'speeder', count: 20, interval: 400 }, { type: 'tank', count: 5, interval: 1000 }], goldBonus: 80 },
  // Wave 11
  { enemies: [{ type: 'swarm', count: 30, interval: 250 }, { type: 'tank', count: 8, interval: 900 }], goldBonus: 90 },
  // Wave 12
  { enemies: [{ type: 'boss', count: 2, interval: 3000 }, { type: 'speeder', count: 15, interval: 400 }], goldBonus: 120 },
  // Wave 13
  { enemies: [{ type: 'grunt', count: 25, interval: 400 }, { type: 'tank', count: 10, interval: 800 }, { type: 'speeder', count: 10, interval: 400 }], goldBonus: 110 },
  // Wave 14
  { enemies: [{ type: 'swarm', count: 40, interval: 200 }, { type: 'boss', count: 2, interval: 4000 }], goldBonus: 150 },
  // Wave 15 - final
  { enemies: [{ type: 'boss', count: 4, interval: 2000 }, { type: 'tank', count: 15, interval: 700 }, { type: 'swarm', count: 30, interval: 200 }], goldBonus: 300 },
];
