import type { GameState, Tower, Enemy, Projectile, Particle, Vec2, TowerType } from './types';
import {
  CELL_SIZE, GRID_COLS, GRID_ROWS, STARTING_GOLD, STARTING_LIVES, MAX_WAVES,
  TOWER_DEFS, ENEMY_DEFS, WAVE_DEFS,
} from './constants';
import { buildPath, buildPathGrid, distance, angleTo } from './pathfinding';

let nextId = 1;
const uid = () => `id_${nextId++}`;

export function createInitialState(): GameState {
  const path = buildPath();
  const grid = buildPathGrid(GRID_COLS, GRID_ROWS);
  return {
    phase: 'menu',
    wave: 0,
    maxWaves: MAX_WAVES,
    lives: STARTING_LIVES,
    maxLives: STARTING_LIVES,
    gold: STARTING_GOLD,
    score: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    path,
    grid,
    selectedTowerType: null,
    selectedTowerId: null,
    waveEnemiesLeft: 0,
    waveSpawned: 0,
    spawnTimer: 0,
    enemiesInWave: [],
    gameSpeed: 1,
    totalKills: 0,
    totalGoldEarned: STARTING_GOLD,
  };
}

export function placeTower(state: GameState, gridX: number, gridY: number, type: TowerType): GameState {
  const def = TOWER_DEFS[type];
  if (state.gold < def.cost) return state;
  if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) return state;
  if (state.grid[gridY][gridX] !== 'empty') return state;

  const newGrid = state.grid.map(row => [...row]);
  newGrid[gridY][gridX] = 'tower';

  const tower: Tower = {
    id: uid(),
    type,
    gridX,
    gridY,
    x: gridX * CELL_SIZE + CELL_SIZE / 2,
    y: gridY * CELL_SIZE + CELL_SIZE / 2,
    level: 1,
    damage: def.damage,
    range: def.range * CELL_SIZE,
    fireRate: def.fireRate,
    lastFired: 0,
    targetId: null,
    angle: 0,
    kills: 0,
  };

  return {
    ...state,
    gold: state.gold - def.cost,
    towers: [...state.towers, tower],
    grid: newGrid,
    selectedTowerType: null,
  };
}

export function sellTower(state: GameState, towerId: string): GameState {
  const tower = state.towers.find(t => t.id === towerId);
  if (!tower) return state;

  const def = TOWER_DEFS[tower.type];
  let sellValue = Math.floor(def.cost * 0.6);
  for (let i = 0; i < tower.level - 1; i++) {
    sellValue += Math.floor((def.upgradeCost[i] || 0) * 0.6);
  }

  const newGrid = state.grid.map(row => [...row]);
  newGrid[tower.gridY][tower.gridX] = 'empty';

  return {
    ...state,
    gold: state.gold + sellValue,
    towers: state.towers.filter(t => t.id !== towerId),
    grid: newGrid,
    selectedTowerId: null,
  };
}

export function upgradeTower(state: GameState, towerId: string): GameState {
  const tower = state.towers.find(t => t.id === towerId);
  if (!tower || tower.level >= 3) return state;

  const def = TOWER_DEFS[tower.type];
  const cost = def.upgradeCost[tower.level - 1];
  if (state.gold < cost) return state;

  const newTower: Tower = {
    ...tower,
    level: tower.level + 1,
    damage: Math.floor(tower.damage * 1.5),
    range: tower.range * 1.15,
    fireRate: tower.fireRate * 1.2,
  };

  return {
    ...state,
    gold: state.gold - cost,
    towers: state.towers.map(t => t.id === towerId ? newTower : t),
  };
}

export function startWave(state: GameState): GameState {
  if (state.phase !== 'playing' && state.phase !== 'wave_complete') return state;
  const waveIndex = state.wave;
  if (waveIndex >= MAX_WAVES) return state;

  const waveDef = WAVE_DEFS[waveIndex];
  const enemiesInWave = waveDef.enemies.flatMap(group =>
    Array.from({ length: group.count }, (_, i) => ({
      type: group.type,
      delay: i * group.interval,
    }))
  ).sort((a, b) => a.delay - b.delay);

  return {
    ...state,
    phase: 'playing',
    wave: waveIndex + 1,
    waveEnemiesLeft: enemiesInWave.length,
    waveSpawned: 0,
    spawnTimer: 0,
    enemiesInWave,
  };
}

function spawnEnemy(state: GameState, type: Parameters<typeof ENEMY_DEFS['grunt']['type'] extends infer T ? (t: T) => void : never>[0]): Enemy {
  const def = ENEMY_DEFS[type as keyof typeof ENEMY_DEFS];
  const waveScale = 1 + (state.wave - 1) * 0.12;
  return {
    id: uid(),
    type: type as Enemy['type'],
    x: state.path[0].x,
    y: state.path[0].y,
    hp: Math.floor(def.hp * waveScale),
    maxHp: Math.floor(def.hp * waveScale),
    speed: def.speed,
    reward: def.reward,
    armor: def.armor,
    pathIndex: 0,
    pathProgress: 0,
    slowFactor: 1,
    slowTimer: 0,
    isAlive: true,
    isBoss: def.isBoss,
  };
}

export function tickGame(state: GameState, deltaMs: number): GameState {
  if (state.phase !== 'playing') return state;

  const dt = (deltaMs / 1000) * state.gameSpeed;
  let s = { ...state };

  // Spawn enemies
  s = tickSpawning(s, deltaMs * state.gameSpeed);

  // Move enemies
  s = tickEnemies(s, dt);

  // Tower targeting & firing
  s = tickTowers(s, deltaMs * state.gameSpeed);

  // Move projectiles
  s = tickProjectiles(s, dt);

  // Update particles
  s = tickParticles(s, dt);

  // Check wave complete
  if (s.waveSpawned >= s.enemiesInWave.length && s.enemies.length === 0 && s.phase === 'playing') {
    const waveDef = WAVE_DEFS[s.wave - 1];
    s = {
      ...s,
      phase: s.wave >= MAX_WAVES ? 'victory' : 'wave_complete',
      gold: s.gold + waveDef.goldBonus,
      totalGoldEarned: s.totalGoldEarned + waveDef.goldBonus,
      score: s.score + waveDef.goldBonus * 10,
    };
  }

  return s;
}

function tickSpawning(state: GameState, elapsedMs: number): GameState {
  if (state.waveSpawned >= state.enemiesInWave.length) return state;

  const newTimer = state.spawnTimer + elapsedMs;
  let spawned = state.waveSpawned;
  const newEnemies = [...state.enemies];

  while (spawned < state.enemiesInWave.length) {
    const cfg = state.enemiesInWave[spawned];
    if (cfg.delay <= newTimer) {
      newEnemies.push(spawnEnemy(state, cfg.type));
      spawned++;
    } else {
      break;
    }
  }

  return { ...state, spawnTimer: newTimer, waveSpawned: spawned, enemies: newEnemies };
}

function tickEnemies(state: GameState, dt: number): GameState {
  let livesLost = 0;
  const alive: Enemy[] = [];

  for (const enemy of state.enemies) {
    if (!enemy.isAlive) continue;

    let e = { ...enemy };

    // Slow timer
    if (e.slowTimer > 0) {
      e.slowTimer = Math.max(0, e.slowTimer - dt * 1000);
      if (e.slowTimer === 0) e.slowFactor = 1;
    }

    const speed = e.speed * e.slowFactor;
    let remaining = speed * dt;
    let pi = e.pathIndex;
    let pp = e.pathProgress;

    while (remaining > 0 && pi < state.path.length - 1) {
      const from = state.path[pi];
      const to = state.path[pi + 1];
      const segLen = distance(from, to);
      const distLeft = segLen * (1 - pp);

      if (remaining >= distLeft) {
        remaining -= distLeft;
        pi++;
        pp = 0;
      } else {
        pp += remaining / segLen;
        remaining = 0;
      }
    }

    if (pi >= state.path.length - 1) {
      // Reached end
      livesLost++;
      continue;
    }

    const from = state.path[pi];
    const to = state.path[pi + 1];
    e.x = from.x + (to.x - from.x) * pp;
    e.y = from.y + (to.y - from.y) * pp;
    e.pathIndex = pi;
    e.pathProgress = pp;
    alive.push(e);
  }

  return {
    ...state,
    enemies: alive,
    lives: Math.max(0, state.lives - livesLost),
    phase: state.lives - livesLost <= 0 ? 'game_over' : state.phase,
  };
}

function tickTowers(state: GameState, deltaMs: number): GameState {
  const newProjectiles = [...state.projectiles];
  const towers = state.towers.map(tower => {
    const interval = 1000 / tower.fireRate;
    if (deltaMs + tower.lastFired < interval) {
      // Track target angle even if not firing
      const target = state.enemies.find(e => e.id === tower.targetId);
      if (target) {
        return { ...tower, angle: angleTo(tower, target) };
      }
      return { ...tower, lastFired: tower.lastFired + deltaMs };
    }

    // Find target: enemy closest to end of path in range
    let best: Enemy | null = null;
    let bestProgress = -1;

    for (const enemy of state.enemies) {
      if (!enemy.isAlive) continue;
      const dist = distance(tower, enemy);
      if (dist <= tower.range) {
        const prog = enemy.pathIndex + enemy.pathProgress;
        if (prog > bestProgress) {
          bestProgress = prog;
          best = enemy;
        }
      }
    }

    if (!best) return { ...tower, targetId: null, lastFired: tower.lastFired + deltaMs };

    const def = TOWER_DEFS[tower.type];
    const proj: Projectile = {
      id: uid(),
      type: def.projectileType,
      x: tower.x,
      y: tower.y,
      targetId: best.id,
      speed: def.projectileType === 'laser_beam' ? 600 : def.projectileType === 'lightning' ? 800 : 350,
      damage: tower.damage,
      towerId: tower.id,
      splashRadius: def.splashRadius * CELL_SIZE,
      color: def.accentColor,
      size: def.projectileType === 'missile' ? 7 : def.projectileType === 'bullet' ? 4 : 3,
      slowAmount: def.slowAmount,
      slowDuration: def.slowDuration,
    };
    newProjectiles.push(proj);

    return {
      ...tower,
      targetId: best.id,
      lastFired: 0,
      angle: angleTo(tower, best),
    };
  });

  return { ...state, towers, projectiles: newProjectiles };
}

function tickProjectiles(state: GameState, dt: number): GameState {
  const hits: { enemyId: string; damage: number; slow: number; slowDur: number; splashRadius: number; x: number; y: number }[] = [];
  const surviving: Projectile[] = [];
  const newParticles = [...state.particles];

  for (const proj of state.projectiles) {
    const target = state.enemies.find(e => e.id === proj.targetId);
    if (!target) continue;

    const dist = distance(proj, target);
    const moveAmount = proj.speed * dt;

    if (dist <= moveAmount + 4) {
      // Hit!
      hits.push({
        enemyId: target.id,
        damage: proj.damage,
        slow: proj.slowAmount,
        slowDur: proj.slowDuration,
        splashRadius: proj.splashRadius,
        x: target.x,
        y: target.y,
      });

      // Spawn hit particles
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
        const speed = 60 + Math.random() * 80;
        newParticles.push({
          id: uid(),
          x: target.x,
          y: target.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.4 + Math.random() * 0.3,
          color: proj.color,
          size: 2 + Math.random() * 3,
        });
      }
    } else {
      // Move toward target
      const angle = Math.atan2(target.y - proj.y, target.x - proj.x);
      surviving.push({
        ...proj,
        x: proj.x + Math.cos(angle) * moveAmount,
        y: proj.y + Math.sin(angle) * moveAmount,
      });
    }
  }

  // Apply damage
  let enemies = state.enemies.map(e => ({ ...e }));
  let towers = state.towers.map(t => ({ ...t }));
  let gold = state.gold;
  let score = state.score;
  let kills = state.totalKills;
  let totalGoldEarned = state.totalGoldEarned;

  for (const hit of hits) {
    const targets = hit.splashRadius > 0
      ? enemies.filter(e => distance({ x: hit.x, y: hit.y }, e) <= hit.splashRadius)
      : enemies.filter(e => e.id === hit.enemyId);

    for (const e of targets) {
      const dmg = Math.max(1, hit.damage - (e.armor || 0));
      e.hp -= dmg;

      if (hit.slow > 0) {
        e.slowFactor = Math.min(e.slowFactor, 1 - hit.slow);
        e.slowTimer = hit.slowDur;
      }

      if (e.hp <= 0) {
        e.isAlive = false;
        gold += e.reward;
        totalGoldEarned += e.reward;
        score += e.reward * 10;
        kills++;

        // Death explosion
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12;
          const spd = 80 + Math.random() * 120;
          newParticles.push({
            id: uid(),
            x: e.x,
            y: e.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: 0.6 + Math.random() * 0.4,
            maxLife: 0.6 + Math.random() * 0.4,
            color: e.isBoss ? '#ff6600' : '#ff4444',
            size: e.isBoss ? 6 : 3,
          });
        }

        // Credit kill to tower
        const towerIdx = towers.findIndex(t => t.id === state.projectiles.find(p => p.targetId === e.id)?.towerId);
        if (towerIdx >= 0) towers[towerIdx] = { ...towers[towerIdx], kills: towers[towerIdx].kills + 1 };
      }
    }
  }

  return {
    ...state,
    enemies: enemies.filter(e => e.isAlive),
    projectiles: surviving,
    particles: newParticles,
    gold,
    score,
    totalKills: kills,
    totalGoldEarned,
    towers,
  };
}

function tickParticles(state: GameState, dt: number): GameState {
  const alive = state.particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vx: p.vx * 0.9,
      vy: p.vy * 0.9,
      life: p.life - dt,
    }))
    .filter(p => p.life > 0);

  return { ...state, particles: alive };
}
