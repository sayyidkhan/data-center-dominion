import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { useGameStore } from '../store/gameStore'
import { TILE_SIZE, TURRET_STATS } from '../game/constants'
import type { Tile } from '../types'

// Heights per elevation — hills are tall raised blocks, valley is sunken
const ELEVATION_HEIGHT: Record<number, number> = {
  [-1]: 0.1,
  [0]:  0.25,
  [1]:  0.55,
  [2]:  1.8,
}

// Dark base colors — tiles should be mostly dark, accents only on edges/emissive
function getTileColor(tile: Tile): string {
  if (tile.type === 'impassable') return '#2d3748'  // grey rocky hill
  if (tile.type === 'base') return tile.owner === 'player' ? '#0c2233' : '#2a0c1e'
  if (tile.type === 'path') return '#0d1117'         // very dark — path is just the floor
  // buildable tiles: subtle side tint
  if (tile.owner === 'player') return tile.elevation === 1 ? '#0e2d3d' : '#091a24'
  if (tile.owner === 'enemy')  return tile.elevation === 1 ? '#2d0e1e' : '#1a0910'
  return '#0f1320' // neutral
}

function getEmissive(tile: Tile): [string, number] {
  if (tile.type === 'impassable') return ['#334155', 0.05]
  if (tile.type === 'path') return ['#000000', 0]
  if (tile.elevation === 1) {
    return tile.owner === 'player' ? ['#22d3ee', 0.12] : ['#f472b6', 0.12]
  }
  return ['#000000', 0]
}

function TileMesh({ tile }: { tile: Tile }) {
  const height = ELEVATION_HEIGHT[tile.elevation] ?? 0.25
  const color = getTileColor(tile)
  const [emissive, emissiveIntensity] = getEmissive(tile)

  const x = tile.x * TILE_SIZE
  const z = tile.z * TILE_SIZE

  const gap = tile.type === 'path' ? 0.05 : tile.type === 'impassable' ? 0.12 : 0.1
  const tileW = TILE_SIZE - gap

  return (
    <group>
      <mesh position={[x, height / 2, z]} receiveShadow castShadow={tile.type === 'impassable'}>
        <boxGeometry args={[tileW, height, tileW]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={tile.type === 'impassable' ? 0.95 : 0.75}
          metalness={tile.type === 'impassable' ? 0.05 : 0.25}
        />
      </mesh>
      {/* Top face highlight for hills so they read as solid terrain */}
      {tile.type === 'impassable' && (
        <mesh position={[x, height + 0.01, z]}>
          <boxGeometry args={[tileW - 0.1, 0.04, tileW - 0.1]} />
          <meshStandardMaterial color="#4b5563" roughness={1} metalness={0} />
        </mesh>
      )}
    </group>
  )
}

const LANE_COLS_SET = new Set([3, 9, 15])

// Glowing centre stripe only on lane-centre path tiles
function PathStripe({ tile }: { tile: Tile }) {
  if (!LANE_COLS_SET.has(tile.x)) return null
  const color = tile.owner === 'player' ? '#22d3ee' : tile.owner === 'enemy' ? '#f472b6' : '#334155'
  const height = ELEVATION_HEIGHT[0] ?? 0.25
  return (
    <mesh
      position={[tile.x * TILE_SIZE, height + 0.012, tile.z * TILE_SIZE]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[0.35, TILE_SIZE - 0.05]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.7}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </mesh>
  )
}

function BuildIndicator({ tile, onClick }: { tile: Tile; onClick: () => void }) {
  const meshRef = useRef<Mesh>(null)
  const height = ELEVATION_HEIGHT[tile.elevation] ?? 0.25
  const color = '#22d3ee'

  useFrame((state) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as { opacity: number }
    mat.opacity = 0.15 + 0.12 * Math.sin(state.clock.elapsedTime * 2.5)
  })

  return (
    <mesh
      ref={meshRef}
      position={[tile.x * TILE_SIZE, height + 0.015, tile.z * TILE_SIZE]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={onClick}
    >
      <planeGeometry args={[TILE_SIZE - 0.25, TILE_SIZE - 0.25]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.2}
        emissive={color}
        emissiveIntensity={0.6}
        depthWrite={false}
      />
    </mesh>
  )
}

export function MapGrid() {
  const map = useGameStore((s) => s.map)
  const phase = useGameStore((s) => s.phase)
  const selectedTurretType = useGameStore((s) => s.selectedTurretType)
  const placeTurret = useGameStore((s) => s.placeTurret)
  const spendCredits = useGameStore((s) => s.spendCredits)

  const allTiles = useMemo(() => {
    if (!map) return []
    return map.tiles.flat()
  }, [map])

  if (!map) return null

  const offsetX = -(map.cols * TILE_SIZE) / 2 + TILE_SIZE / 2

  return (
    <group position={[offsetX, 0, 0]}>
      {/* Ground plane under everything */}
      <mesh position={[(map.cols * TILE_SIZE) / 2 - TILE_SIZE / 2, -0.05, (map.rows * TILE_SIZE) / 2]} receiveShadow>
        <boxGeometry args={[map.cols * TILE_SIZE + 4, 0.1, map.rows * TILE_SIZE + 4]} />
        <meshStandardMaterial color="#060810" roughness={1} metalness={0} />
      </mesh>

      {allTiles.map((tile) => (
        <group key={tile.id}>
          <TileMesh tile={tile} />

          {/* Lane stripe on path tiles */}
          {tile.type === 'path' && (
            <PathStripe tile={tile} />
          )}

          {/* Build indicator — only on player buildable tiles in build phase */}
          {phase === 'build' &&
            tile.type === 'buildable' &&
            tile.owner === 'player' &&
            !tile.turretId && (
              <BuildIndicator
                tile={tile}
                onClick={() => {
                  const cost = TURRET_STATS[selectedTurretType].cost
                  const spent = spendCredits('player', cost)
                  if (spent) placeTurret(tile.id, selectedTurretType, 'player')
                }}
              />
            )}
        </group>
      ))}
    </group>
  )
}
