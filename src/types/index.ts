import type { Vector3 } from 'three'

export type TileType = 'buildable' | 'path' | 'base' | 'impassable'
export type TileOwner = 'player' | 'enemy' | 'neutral'

export type Tile = {
  id: string
  x: number
  z: number
  type: TileType
  owner: TileOwner
  elevation: number       // -1 = valley, 0 = flat, 1 = raised, 2 = hill (impassable)
  isWalkable: boolean
  turretId: string | null
}

export type GameMap = {
  cols: number
  rows: number
  tiles: Tile[][]
  waypoints: Vector3[][]  // one array per lane [lane0, lane1, lane2]
}

export type Side = 'player' | 'enemy'

export type RobotType = 'scout' | 'bruiser' | 'sapper'
export type TurretType = 'pulse' | 'cannon' | 'beam'

export type Robot = {
  id: string
  side: Side
  type: RobotType
  hp: number
  maxHp: number
  speed: number
  damage: number
  laneIndex: number
  waypointIndex: number
  position: [number, number, number]
  isDead: boolean
}

export type Turret = {
  id: string
  side: Side
  type: TurretType
  tileId: string
  position: [number, number, number]
  range: number
  damage: number
  cooldown: number
  cooldownTimer: number
  targetId: string | null
}

export type Projectile = {
  id: string
  from: [number, number, number]
  to: [number, number, number]
  progress: number  // 0–1
  damage: number
  targetId: string
}

export type DataCenter = {
  side: Side
  hp: number
  maxHp: number
  position: [number, number, number]
}

export type GamePhase = 'build' | 'wave' | 'victory' | 'defeat'

export type GameState = {
  phase: GamePhase
  wave: number
  playerCredits: number
  enemyCredits: number
  map: GameMap | null
  robots: Robot[]
  turrets: Turret[]
  projectiles: Projectile[]
  playerBase: DataCenter
  enemyBase: DataCenter
  selectedTurretType: TurretType
}
