import { Vector3 } from 'three'
import type { GameMap, Tile, TileOwner, TileType } from '../types'
import { TILE_SIZE } from './constants'

// Map template: 20 cols x 40 rows
// B = buildable, P = path, H = hill (impassable), V = valley, N = neutral (no build)
// Rows go from enemy base (top, z=0) to player base (bottom, z=rows-1)

const COLS = 20
const ROWS = 40

// Lane column indices (3 lanes evenly spaced)
const LANE_COLS = [3, 9, 15]

function makeTileId(x: number, z: number) {
  return `${x}_${z}`
}

function buildTemplate(): string[][] {
  const grid: string[][] = []

  for (let z = 0; z < ROWS; z++) {
    const row: string[] = []
    for (let x = 0; x < COLS; x++) {
      // Base rows (enemy top, player bottom)
      if (z <= 1)            { row.push('E'); continue }
      if (z >= ROWS - 2)     { row.push('P_BASE'); continue }

      // Hard edges — impassable walls
      if (x === 0 || x === COLS - 1) { row.push('H'); continue }

      const isLane = LANE_COLS.includes(x)
      // Lane is 3 tiles wide for visibility: centre + both neighbours
      const isLaneWide = LANE_COLS.some((lc) => Math.abs(x - lc) <= 1)

      if (isLane) {
        row.push('P')
        continue
      }

      if (isLaneWide) {
        // Lane shoulders — walkable but darker, no building allowed
        row.push('N')
        continue
      }

      // Interior terrain
      const hash = (x * 73 + z * 37 + x * z * 11) % 100

      // Neutral contested mid-zone (rows 18–21)
      if (z >= 18 && z <= 21) {
        row.push(hash < 25 ? 'H' : 'N')
        continue
      }

      // Separator hills between lanes (cols 6–7 and 12–13)
      if ((x >= 6 && x <= 7) || (x >= 12 && x <= 13)) {
        row.push(hash < 60 ? 'H' : 'B')
        continue
      }

      if (hash < 10)      row.push('H')
      else if (hash < 16) row.push('V')
      else                row.push('B')
    }
    grid.push(row)
  }
  return grid
}

function parseTile(x: number, z: number, symbol: string, rows: number): Tile {
  const isPlayerSide = z > rows / 2
  const isEnemySide  = z < rows / 2
  const owner: TileOwner = isPlayerSide ? 'player' : isEnemySide ? 'enemy' : 'neutral'

  let type: TileType = 'buildable'
  let elevation = 0
  let isWalkable = true

  switch (symbol) {
    case 'P':
      type = 'path'; elevation = 0; isWalkable = true; break
    case 'P_BASE':
      type = 'base'; elevation = 0; isWalkable = true; break
    case 'E':
      type = 'base'; elevation = 0; isWalkable = true; break
    case 'H':
      type = 'impassable'; elevation = 2; isWalkable = false; break
    case 'V':
      type = 'buildable'; elevation = -1; isWalkable = true; break
    case 'B':
      type = 'buildable'; elevation = 0; isWalkable = true; break
    case 'N':
      type = 'path'; elevation = 0; isWalkable = true; break
    // shoulder tiles look like path but slightly raised

    default:
      type = 'buildable'; elevation = 0; isWalkable = true
  }

  // Randomly sprinkle raised tiles among buildable for high-ground bonus
  if (type === 'buildable' && elevation === 0) {
    const hash = (x * 17 + z * 53) % 100
    if (hash < 10) elevation = 1
  }

  return {
    id: makeTileId(x, z),
    x,
    z,
    type,
    owner,
    elevation,
    isWalkable,
    turretId: null,
  }
}

function buildWaypoints(rows: number): Vector3[][] {
  // Each lane: straight path from enemy base (z=2) to player base (z=rows-3)
  return LANE_COLS.map((laneX) => {
    const points: Vector3[] = []
    for (let z = 2; z <= rows - 3; z += 2) {
      const wx = laneX * TILE_SIZE - (COLS * TILE_SIZE) / 2 + TILE_SIZE / 2
      points.push(new Vector3(wx, 0.5, z * TILE_SIZE))
    }
    return points
  })
}

export function generateMap(): GameMap {
  const template = buildTemplate()
  const tiles: Tile[][] = []

  for (let z = 0; z < ROWS; z++) {
    const row: Tile[] = []
    for (let x = 0; x < COLS; x++) {
      row.push(parseTile(x, z, template[z]![x]!, ROWS))
    }
    tiles.push(row)
  }

  return {
    cols: COLS,
    rows: ROWS,
    tiles,
    waypoints: buildWaypoints(ROWS),
  }
}
