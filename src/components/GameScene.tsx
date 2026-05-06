import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'
import { tickGame, buildWaveQueue } from '../game/gameLoop'
import { CameraRig } from './CameraRig'
import { MapGrid } from './MapGrid'
import { DataCenterMesh } from './DataCenter'
import { RobotMesh } from './RobotMesh'
import { TurretMesh } from './TurretMesh'
import { ProjectileMesh } from './ProjectileMesh'
import { TILE_SIZE } from '../game/constants'

export function GameScene() {
  const initGame = useGameStore((s) => s.initGame)
  const map = useGameStore((s) => s.map)
  const robots = useGameStore((s) => s.robots)
  const turrets = useGameStore((s) => s.turrets)
  const projectiles = useGameStore((s) => s.projectiles)
  const playerBase = useGameStore((s) => s.playerBase)
  const enemyBase = useGameStore((s) => s.enemyBase)
  const phase = useGameStore((s) => s.phase)
  const wave = useGameStore((s) => s.wave)

  useEffect(() => {
    initGame()
  }, [initGame])

  useEffect(() => {
    if (phase === 'wave') buildWaveQueue(wave)
  }, [phase, wave])

  useFrame((_, dt) => {
    tickGame(dt)
  })

  const playerBasePos: [number, number, number] = map
    ? [0, 0, (map.rows - 2) * TILE_SIZE]
    : [0, 0, 76]
  const enemyBasePos: [number, number, number] = [0, 0, TILE_SIZE * 1]

  return (
    <>
      <CameraRig />

      {/* Depth fog — gentle, starts far */}
      <fog attach="fog" args={['#060810', 80, 220]} />

      {/* Ambient — very dim, let emissives do the work */}
      <ambientLight intensity={0.15} color="#1a2030" />

      {/* Main directional — angled from above-front, warm white */}
      <directionalLight
        position={[15, 50, 60]}
        intensity={1.0}
        color="#e0eaff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {/* Rim light from behind */}
      <directionalLight position={[-10, 20, -20]} intensity={0.3} color="#334155" />

      {/* Player base area glow — cyan */}
      <pointLight position={[0, 8, playerBasePos[2]]} color="#22d3ee" intensity={60} distance={40} decay={2} />
      {/* Enemy base area glow — magenta */}
      <pointLight position={[0, 8, enemyBasePos[2]]} color="#f472b6" intensity={60} distance={40} decay={2} />
      {/* Mid-field subtle fill */}
      <pointLight position={[0, 15, 40]} color="#0f1f3d" intensity={30} distance={60} decay={2} />

      {/* Map */}
      <MapGrid />

      {/* Data centers */}
      <DataCenterMesh base={{ ...playerBase, position: playerBasePos }} />
      <DataCenterMesh base={{ ...enemyBase,  position: enemyBasePos  }} />

      {/* Robots */}
      {robots.map((robot) => (
        <RobotMesh key={robot.id} robot={robot} />
      ))}

      {/* Turrets */}
      {turrets.map((turret) => (
        <TurretMesh key={turret.id} turret={turret} />
      ))}

      {/* Projectiles */}
      {projectiles.map((proj) => (
        <ProjectileMesh key={proj.id} projectile={proj} />
      ))}
    </>
  )
}
