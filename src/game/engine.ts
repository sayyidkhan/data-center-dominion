import type { GameState, Tower, Enemy, Projectile, Particle, VisualEffect, Vec2, TowerType, Hero } from './types';
import {
  CELL_SIZE, GRID_COLS, GRID_ROWS, STARTING_GOLD, STARTING_LIVES, MAX_WAVES,
  TOWER_DEFS, ENEMY_DEFS, WAVE_DEFS, MAP_W, MAP_H, VIEWPORT_W, HERO_START, HERO_STATS,
  CANNON_ARMOR_BREAK, CANNON_DEBUFF_CHANCE, CANNON_DEBUFF_DURATION, CANNON_EXPOSED_BONUS,
  FROST_FREEZE_CHANCE, FROST_FREEZE_MS, HERO_PROJECTILE, LASER_ACTIVE_MS, LASER_CYCLE_MS,
  SCORE_PER_REWARD, SELL_REFUND_RATE, TESLA_CHAIN_RANGE, UPGRADE_DAMAGE_MULTIPLIER,
  UPGRADE_FIRE_RATE_MULTIPLIER, UPGRADE_RANGE_MULTIPLIER, WAVE_HP_SCALE_PER_WAVE,
} from './constants';
import { buildPath, buildPathGrid, distance, angleTo } from './pathfinding';

let nextId = 1;
const uid = () => `id_${nextId++}`;

export function createInitialState(): GameState {
  const path = buildPath();
  const grid = buildPathGrid(GRID_COLS, GRID_ROWS);
  // Start camera showing the data center (left side of map)
  return {
    phase: 'menu',
    wave: 0,
    maxWaves: MAX_WAVES,
    lives: STARTING_LIVES,
    maxLives: STARTING_LIVES,
    gold: STARTING_GOLD,
    score: 0,
    towers: [],
    hero: {
      id: 'hero',
      x: HERO_START.x,
      y: HERO_START.y,
      targetX: HERO_START.x,
      targetY: HERO_START.y,
      speed: HERO_STATS.speed,
      damage: HERO_STATS.damage,
      range: HERO_STATS.range * CELL_SIZE,
      fireRate: HERO_STATS.fireRate,
      lastFired: 0,
      targetId: null,
      angle: 0,
      kills: 0,
    },
    enemies: [],
    projectiles: [],
    particles: [],
    effects: [],
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
    cameraX: 0,
  };
}

export function commandHeroMove(state: GameState, x: number, y: number): GameState {
  const heroRadius = CELL_SIZE * 0.45;
  const targetX = Math.max(heroRadius, Math.min(MAP_W - heroRadius, x));
  const targetY = Math.max(heroRadius, Math.min(MAP_H - heroRadius, y));

  return {
    ...state,
    hero: {
      ...state.hero,
      targetX,
      targetY,
      angle: angleTo(state.hero, { x: targetX, y: targetY }),
    },
    selectedTowerId: null,
    selectedTowerType: null,
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
    beamTargetId: null,
    laserCycleMs: 0,
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
  let sellValue = Math.floor(def.cost * SELL_REFUND_RATE);
  for (let i = 0; i < tower.level - 1; i++) {
    sellValue += Math.floor((def.upgradeCost[i] || 0) * SELL_REFUND_RATE);
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
    damage: Math.floor(tower.damage * UPGRADE_DAMAGE_MULTIPLIER),
    range: tower.range * UPGRADE_RANGE_MULTIPLIER,
    fireRate: tower.fireRate * UPGRADE_FIRE_RATE_MULTIPLIER,
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
  const waveScale = 1 + (state.wave - 1) * WAVE_HP_SCALE_PER_WAVE;
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
    frozenTimer: 0,
    armorBreakTimer: 0,
    armorBreakAmount: 0,
    exposedTimer: 0,
    exposedMultiplier: 0,
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

  // Hero movement and machine-gun support fire
  s = tickHero(s, dt, deltaMs * state.gameSpeed);

  // Tower targeting & firing
  s = tickTowers(s, deltaMs * state.gameSpeed);

  // Move projectiles
  s = tickProjectiles(s, dt);

  // Update particles
  s = tickParticles(s, dt);

  // Update short-lived area effects
  s = tickEffects(s, dt);

  // Check wave complete
  if (s.waveSpawned >= s.enemiesInWave.length && s.enemies.length === 0 && s.phase === 'playing') {
    const waveDef = WAVE_DEFS[s.wave - 1];
    s = {
      ...s,
      phase: s.wave >= MAX_WAVES ? 'victory' : 'wave_complete',
      gold: s.gold + waveDef.goldBonus,
      totalGoldEarned: s.totalGoldEarned + waveDef.goldBonus,
      score: s.score + waveDef.goldBonus * 10,
      projectiles: [],
      particles: [],
      effects: [],
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

    if (e.frozenTimer > 0) {
      e.frozenTimer = Math.max(0, e.frozenTimer - dt * 1000);
      alive.push(e);
      continue;
    }

    if (e.slowTimer > 0) {
      e.slowTimer = Math.max(0, e.slowTimer - dt * 1000);
      if (e.slowTimer === 0) e.slowFactor = 1;
    }

    if (e.armorBreakTimer > 0) {
      e.armorBreakTimer = Math.max(0, e.armorBreakTimer - dt * 1000);
      if (e.armorBreakTimer === 0) e.armorBreakAmount = 0;
    }

    if (e.exposedTimer > 0) {
      e.exposedTimer = Math.max(0, e.exposedTimer - dt * 1000);
      if (e.exposedTimer === 0) e.exposedMultiplier = 0;
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

function findBestTarget(source: Pick<Tower, 'x' | 'y' | 'range'> | Pick<Hero, 'x' | 'y' | 'range'>, enemies: Enemy[]): Enemy | null {
  let best: Enemy | null = null;
  let bestProgress = -1;

  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    const dist = distance(source, enemy);
    if (dist <= source.range) {
      const prog = enemy.pathIndex + enemy.pathProgress;
      if (prog > bestProgress) {
        bestProgress = prog;
        best = enemy;
      }
    }
  }

  return best;
}

function tickHero(state: GameState, dt: number, deltaMs: number): GameState {
  let hero = { ...state.hero };
  const newProjectiles = [...state.projectiles];

  const moveDist = distance(hero, { x: hero.targetX, y: hero.targetY });
  if (moveDist > 1) {
    const step = Math.min(moveDist, hero.speed * dt);
    const moveAngle = Math.atan2(hero.targetY - hero.y, hero.targetX - hero.x);
    hero = {
      ...hero,
      x: hero.x + Math.cos(moveAngle) * step,
      y: hero.y + Math.sin(moveAngle) * step,
      angle: moveAngle,
    };
  }

  const best = findBestTarget(hero, state.enemies);
  const lastFired = hero.lastFired + deltaMs;
  const interval = 1000 / hero.fireRate;

  if (best) {
    hero = { ...hero, targetId: best.id, angle: angleTo(hero, best) };

    if (lastFired >= interval) {
      newProjectiles.push({
        id: uid(),
        type: 'machine_round',
        x: hero.x,
        y: hero.y,
        targetId: best.id,
        speed: HERO_PROJECTILE.speed,
        damage: hero.damage,
        towerId: hero.id,
        splashRadius: 0,
        color: HERO_PROJECTILE.color,
        size: HERO_PROJECTILE.size,
        slowAmount: 0,
        slowDuration: 0,
      });
      hero = { ...hero, lastFired: 0 };
    } else {
      hero = { ...hero, lastFired };
    }
  } else {
    hero = { ...hero, targetId: null, lastFired };
  }

  return {
    ...state,
    hero,
    projectiles: newProjectiles,
  };
}

function activeLaserMsDuring(prevCycleMs: number, elapsedMs: number): number {
  let cursor = prevCycleMs % LASER_CYCLE_MS;
  let remaining = elapsedMs;
  let activeMs = 0;

  while (remaining > 0) {
    const phaseEnd = cursor < LASER_ACTIVE_MS ? LASER_ACTIVE_MS : LASER_CYCLE_MS;
    const segmentMs = Math.min(remaining, phaseEnd - cursor);
    if (cursor < LASER_ACTIVE_MS) activeMs += segmentMs;
    remaining -= segmentMs;
    cursor = (cursor + segmentMs) % LASER_CYCLE_MS;
  }

  return activeMs;
}

function spawnDeathParticles(enemy: Enemy): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const spd = 80 + Math.random() * 120;
    particles.push({
      id: uid(),
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 0.6 + Math.random() * 0.4,
      color: enemy.isBoss ? '#ff6600' : '#ff4444',
      size: enemy.isBoss ? 6 : 3,
    });
  }

  return particles;
}

function nearestChainEnemy(from: Vec2, enemies: Enemy[], excludeId?: string): Enemy | null {
  let best: Enemy | null = null;
  let bestDist = Infinity;

  for (const enemy of enemies) {
    if (!enemy.isAlive || enemy.id === excludeId) continue;
    const dist = distance(from, enemy);
    if (dist <= TESLA_CHAIN_RANGE && dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }

  return best;
}

function calculateDamage(rawDamage: number, enemy: Enemy, minimum = 1): number {
  const effectiveArmor = Math.max(0, (enemy.armor || 0) - enemy.armorBreakAmount);
  const armoredDamage = Math.max(minimum, rawDamage - effectiveArmor);
  return Math.max(minimum, armoredDamage * (1 + enemy.exposedMultiplier));
}

function applyCannonDebuff(enemy: Enemy, towerLevel: number): 'armor_break' | 'exposed' | null {
  if (Math.random() >= CANNON_DEBUFF_CHANCE[towerLevel]) return null;

  const duration = CANNON_DEBUFF_DURATION[towerLevel];
  if (Math.random() < 0.5) {
    enemy.armorBreakAmount = Math.max(enemy.armorBreakAmount, CANNON_ARMOR_BREAK[towerLevel]);
    enemy.armorBreakTimer = Math.max(enemy.armorBreakTimer, duration);
    return 'armor_break';
  }

  enemy.exposedMultiplier = Math.max(enemy.exposedMultiplier, CANNON_EXPOSED_BONUS[towerLevel]);
  enemy.exposedTimer = Math.max(enemy.exposedTimer, duration);
  return 'exposed';
}

function tickTowers(state: GameState, deltaMs: number): GameState {
  const newProjectiles = [...state.projectiles];
  const enemies = state.enemies.map(e => ({ ...e }));
  const newParticles = [...state.particles];
  const newEffects = [...state.effects];
  let gold = state.gold;
  let score = state.score;
  let kills = state.totalKills;
  let totalGoldEarned = state.totalGoldEarned;

  const towers = state.towers.map(tower => {
    if (tower.type === 'laser') {
      const prevCycleMs = tower.laserCycleMs ?? 0;
      const nextCycleMs = (prevCycleMs + deltaMs) % LASER_CYCLE_MS;
      const activeMs = activeLaserMsDuring(prevCycleMs, deltaMs);
      const best = findBestTarget(tower, enemies);
      const isFiring = activeMs > 0 && best !== null;

      if (isFiring && best) {
        const enemy = enemies.find(e => e.id === best.id);
        if (enemy?.isAlive) {
          const rawDamage = tower.damage * tower.fireRate * (activeMs / 1000);
          enemy.hp -= calculateDamage(rawDamage, enemy, activeMs / 1000);

          if (enemy.hp <= 0) {
            enemy.isAlive = false;
            gold += enemy.reward;
            totalGoldEarned += enemy.reward;
            score += enemy.reward * SCORE_PER_REWARD;
            kills++;

            for (let i = 0; i < 12; i++) {
              const angle = (Math.PI * 2 * i) / 12;
              const spd = 80 + Math.random() * 120;
              newParticles.push({
                id: uid(),
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 0.6 + Math.random() * 0.4,
                maxLife: 0.6 + Math.random() * 0.4,
                color: enemy.isBoss ? '#ff6600' : '#ff4444',
                size: enemy.isBoss ? 6 : 3,
              });
            }

            return {
              ...tower,
              targetId: enemy.id,
              beamTargetId: enemy.id,
              laserCycleMs: nextCycleMs,
              angle: angleTo(tower, enemy),
              kills: tower.kills + 1,
            };
          }
        }
      }

      return {
        ...tower,
        targetId: best?.id ?? null,
        beamTargetId: isFiring ? best?.id ?? null : null,
        laserCycleMs: nextCycleMs,
        angle: best ? angleTo(tower, best) : tower.angle,
      };
    }

    const interval = 1000 / tower.fireRate;
    if (deltaMs + tower.lastFired < interval) {
      // Track target angle even if not firing
      const target = enemies.find(e => e.id === tower.targetId);
      if (target) {
        return { ...tower, lastFired: tower.lastFired + deltaMs, angle: angleTo(tower, target) };
      }
      return { ...tower, beamTargetId: null, lastFired: tower.lastFired + deltaMs };
    }

    // Find target: enemy closest to end of path in range
    const best = findBestTarget(tower, enemies);

    if (!best) return { ...tower, targetId: null, beamTargetId: null, lastFired: tower.lastFired + deltaMs };

    const def = TOWER_DEFS[tower.type];
    if (tower.type === 'tesla') {
      const hops = tower.level + 1;
      const points: Vec2[] = [{ x: tower.x, y: tower.y }];
      let current: Vec2 = best;
      let currentTarget: Enemy | null = best;
      let towerKills = 0;

      for (let hop = 0; hop < hops && currentTarget; hop++) {
        const damageScale = Math.max(0.55, 1 - hop * 0.15);
        const dmg = calculateDamage(Math.round(tower.damage * damageScale), currentTarget);
        currentTarget.hp -= dmg;
        points.push({ x: currentTarget.x, y: currentTarget.y });

        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 70 + Math.random() * 130;
          newParticles.push({
            id: uid(),
            x: currentTarget.x,
            y: currentTarget.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.22 + Math.random() * 0.18,
            maxLife: 0.22 + Math.random() * 0.18,
            color: i % 2 === 0 ? '#fff59d' : '#ffee58',
            size: 1.5 + Math.random() * 2.5,
          });
        }

        if (currentTarget.hp <= 0 && currentTarget.isAlive) {
          currentTarget.isAlive = false;
          gold += currentTarget.reward;
          totalGoldEarned += currentTarget.reward;
          score += currentTarget.reward * SCORE_PER_REWARD;
          kills++;
          towerKills++;
          newParticles.push(...spawnDeathParticles(currentTarget));
        }

        current = currentTarget;
        currentTarget = nearestChainEnemy(current, enemies, currentTarget.id) ?? nearestChainEnemy(current, enemies);
      }

      if (points.length > 1) {
        newEffects.push({
          id: uid(),
          type: 'lightning_zap',
          points,
          life: 0.24,
          maxLife: 0.24,
        });
      }

      return {
        ...tower,
        targetId: best.id,
        beamTargetId: null,
        lastFired: 0,
        angle: angleTo(tower, best),
        kills: tower.kills + towerKills,
      };
    }

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
      beamTargetId: null,
      lastFired: 0,
      angle: angleTo(tower, best),
    };
  });

  return {
    ...state,
    towers,
    enemies: enemies.filter(e => e.isAlive),
    projectiles: newProjectiles,
    particles: newParticles,
    effects: newEffects,
    gold,
    score,
    totalKills: kills,
    totalGoldEarned,
  };
}

function tickProjectiles(state: GameState, dt: number): GameState {
  const hits: { enemyId: string; towerId: string; towerType: Tower['type'] | null; towerLevel: number; projectileType: Projectile['type']; damage: number; slow: number; slowDur: number; splashRadius: number; x: number; y: number }[] = [];
  const surviving: Projectile[] = [];
  const newParticles = [...state.particles];
  const newEffects = [...state.effects];

  for (const proj of state.projectiles) {
    const target = state.enemies.find(e => e.id === proj.targetId);
    if (!target) continue;

    const dist = distance(proj, target);
    const moveAmount = proj.speed * dt;

    if (dist <= moveAmount + 4) {
      const sourceTower = state.towers.find(t => t.id === proj.towerId);
      // Hit!
      hits.push({
        enemyId: target.id,
        towerId: proj.towerId,
        towerType: sourceTower?.type ?? null,
        towerLevel: sourceTower?.level ?? 1,
        projectileType: proj.type,
        damage: proj.damage,
        slow: proj.slowAmount,
        slowDur: proj.slowDuration,
        splashRadius: proj.splashRadius,
        x: target.x,
        y: target.y,
      });

      // Spawn hit particles
      const isFrost = proj.type === 'frost_bolt';
      const isMachineRound = proj.type === 'machine_round';
      const particleCount = isFrost ? 26 : isMachineRound ? 3 : 6;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.35;
        const speed = isFrost ? 70 + Math.random() * 170 : 60 + Math.random() * 80;
        const color = isFrost
          ? ['#e0f7fa', '#b2ebf2', '#80deea', '#ffffff'][i % 4]
          : isMachineRound ? HERO_PROJECTILE.color : proj.color;
        newParticles.push({
          id: uid(),
          x: target.x,
          y: target.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: isFrost ? 0.55 + Math.random() * 0.35 : 0.4 + Math.random() * 0.3,
          maxLife: isFrost ? 0.55 + Math.random() * 0.35 : 0.4 + Math.random() * 0.3,
          color,
          size: isFrost ? 1.5 + Math.random() * 4 : 2 + Math.random() * 3,
        });
      }

      if (isFrost) {
        newEffects.push({
          id: uid(),
          type: 'frost_blast',
          x: target.x,
          y: target.y,
          radius: Math.max(proj.splashRadius, CELL_SIZE * 1.3),
          life: 0.55,
          maxLife: 0.55,
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
  let hero = { ...state.hero };
  let gold = state.gold;
  let score = state.score;
  let kills = state.totalKills;
  let totalGoldEarned = state.totalGoldEarned;

  for (const hit of hits) {
    const targets = hit.splashRadius > 0
      ? enemies.filter(e => distance({ x: hit.x, y: hit.y }, e) <= hit.splashRadius)
      : enemies.filter(e => e.id === hit.enemyId);

    for (const e of targets) {
      const dmg = calculateDamage(hit.damage, e);
      e.hp -= dmg;

      if (hit.towerType === 'cannon') {
        const debuff = applyCannonDebuff(e, hit.towerLevel);
        if (debuff) {
          const color = debuff === 'armor_break' ? '#ffab40' : '#64b5f6';
          for (let i = 0; i < 7; i++) {
            const angle = (Math.PI * 2 * i) / 7;
            const speed = 45 + Math.random() * 80;
            newParticles.push({
              id: uid(),
              x: e.x,
              y: e.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 0.28 + Math.random() * 0.18,
              maxLife: 0.28 + Math.random() * 0.18,
              color,
              size: 1.5 + Math.random() * 2.5,
            });
          }
        }
      }

      if (hit.slow > 0) {
        e.slowFactor = Math.min(e.slowFactor, 1 - hit.slow);
        e.slowTimer = hit.slowDur;

        if (hit.projectileType === 'frost_bolt' && Math.random() < FROST_FREEZE_CHANCE) {
          e.frozenTimer = Math.max(e.frozenTimer, FROST_FREEZE_MS);
        }
      }

      if (e.hp <= 0) {
        e.isAlive = false;
        gold += e.reward;
        totalGoldEarned += e.reward;
        score += e.reward * SCORE_PER_REWARD;
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

        // Credit kill to the source that landed the projectile.
        const towerIdx = towers.findIndex(t => t.id === hit.towerId);
        if (towerIdx >= 0) towers[towerIdx] = { ...towers[towerIdx], kills: towers[towerIdx].kills + 1 };
        else if (hit.towerId === hero.id) hero = { ...hero, kills: hero.kills + 1 };
      }
    }
  }

  return {
    ...state,
    enemies: enemies.filter(e => e.isAlive),
    projectiles: surviving,
    particles: newParticles,
    effects: newEffects,
    gold,
    score,
    totalKills: kills,
    totalGoldEarned,
    towers,
    hero,
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

function tickEffects(state: GameState, dt: number): GameState {
  const effects = state.effects
    .map(effect => ({
      ...effect,
      life: effect.life - dt,
    }))
    .filter(effect => effect.life > 0);

  return { ...state, effects };
}
