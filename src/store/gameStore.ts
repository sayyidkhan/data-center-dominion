import { create } from 'zustand'
import type { GameState, GameMap, Robot, Turret, Projectile, TurretType, Side, RobotType, TurretType as TT } from '../types'
import { generateMap } from '../game/mapGenerator'
import { TURRET_STATS, ROBOT_STATS } from '../game/constants'

type GameStore = GameState & {
  initGame: () => void
  setPhase: (phase: GameState['phase']) => void
  startWave: () => void
  spawnRobot: (side: Side, type: RobotType, laneIndex: number) => void
  placeTurret: (tileId: string, type: TT, side: Side) => void
  updateRobots: (robots: Robot[]) => void
  updateTurrets: (turrets: Turret[]) => void
  updateProjectiles: (projectiles: Projectile[]) => void
  damageBase: (side: Side, amount: number) => void
  addCredits: (side: Side, amount: number) => void
  spendCredits: (side: Side, amount: number) => boolean
  setSelectedTurretType: (type: TurretType) => void
  removeRobot: (id: string) => void
  removeProjectile: (id: string) => void
}

let _robotId = 0
let _turretId = 0
let _projectileId = 0

export const newRobotId = () => `robot_${++_robotId}`
export const newTurretId = () => `turret_${++_turretId}`
export const newProjectileId = () => `proj_${++_projectileId}`

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'build',
  wave: 0,
  playerCredits: 200,
  enemyCredits: 200,
  map: null,
  robots: [],
  turrets: [],
  projectiles: [],
  selectedTurretType: 'pulse',
  playerBase: {
    side: 'player',
    hp: 100,
    maxHp: 100,
    position: [0, 0, 0],
  },
  enemyBase: {
    side: 'enemy',
    hp: 100,
    maxHp: 100,
    position: [0, 0, 0],
  },

  initGame: () => {
    const map = generateMap()
    set({
      map,
      phase: 'build',
      wave: 0,
      playerCredits: 200,
      enemyCredits: 200,
      robots: [],
      turrets: [],
      projectiles: [],
      playerBase: { side: 'player', hp: 100, maxHp: 100, position: [0, 0.5, (map.rows - 1) * 2] },
      enemyBase: { side: 'enemy', hp: 100, maxHp: 100, position: [0, 0.5, 0] },
    })
  },

  setPhase: (phase) => set({ phase }),

  startWave: () => {
    const { phase } = get()
    if (phase !== 'build') return
    set((s) => ({ phase: 'wave', wave: s.wave + 1 }))
  },

  spawnRobot: (side, type, laneIndex) => {
    const { map } = get()
    if (!map) return
    const stats = ROBOT_STATS[type]
    const waypoints = map.waypoints[laneIndex]
    if (!waypoints || waypoints.length === 0) return

    const startWp = side === 'player' ? waypoints[0] : waypoints[waypoints.length - 1]
    const robot: Robot = {
      id: newRobotId(),
      side,
      type,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      damage: stats.damage,
      laneIndex,
      waypointIndex: side === 'player' ? 0 : waypoints.length - 1,
      position: [startWp.x, 0.5, startWp.z],
      isDead: false,
    }
    set((s) => ({ robots: [...s.robots, robot] }))
  },

  placeTurret: (tileId, type, side) => {
    const { map, turrets } = get()
    if (!map) return
    const [xStr, zStr] = tileId.split('_')
    const x = parseInt(xStr)
    const z = parseInt(zStr)
    const tile = map.tiles[z]?.[x]
    if (!tile || tile.turretId || tile.type !== 'buildable') return

    const stats = TURRET_STATS[type]
    const tileSize = 2
    const elevation = tile.elevation === 1 ? 0.5 : 0
    const turret: Turret = {
      id: newTurretId(),
      side,
      type,
      tileId,
      position: [x * tileSize - (map.cols * tileSize) / 2 + tileSize / 2, elevation + 0.5, z * tileSize],
      range: stats.range + (tile.elevation === 1 ? 1 : 0),
      damage: stats.damage,
      cooldown: stats.cooldown,
      cooldownTimer: 0,
      targetId: null,
    }
    tile.turretId = turret.id
    set((s) => ({ turrets: [...s.turrets, turret] }))
  },

  updateRobots: (robots) => set({ robots }),
  updateTurrets: (turrets) => set({ turrets }),
  updateProjectiles: (projectiles) => set({ projectiles }),

  damageBase: (side, amount) => {
    if (side === 'player') {
      set((s) => {
        const hp = Math.max(0, s.playerBase.hp - amount)
        return {
          playerBase: { ...s.playerBase, hp },
          phase: hp <= 0 ? 'defeat' : s.phase,
        }
      })
    } else {
      set((s) => {
        const hp = Math.max(0, s.enemyBase.hp - amount)
        return {
          enemyBase: { ...s.enemyBase, hp },
          phase: hp <= 0 ? 'victory' : s.phase,
        }
      })
    }
  },

  addCredits: (side, amount) => {
    if (side === 'player') set((s) => ({ playerCredits: s.playerCredits + amount }))
    else set((s) => ({ enemyCredits: s.enemyCredits + amount }))
  },

  spendCredits: (side, amount) => {
    const { playerCredits, enemyCredits } = get()
    if (side === 'player') {
      if (playerCredits < amount) return false
      set((s) => ({ playerCredits: s.playerCredits - amount }))
      return true
    } else {
      if (enemyCredits < amount) return false
      set((s) => ({ enemyCredits: s.enemyCredits - amount }))
      return true
    }
  },

  setSelectedTurretType: (type) => set({ selectedTurretType: type }),

  removeRobot: (id) => set((s) => ({ robots: s.robots.filter((r) => r.id !== id) })),

  removeProjectile: (id) =>
    set((s) => ({ projectiles: s.projectiles.filter((p) => p.id !== id) })),
}))
