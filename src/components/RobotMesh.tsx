import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { Robot } from '../types'
import { SIDE_COLOR } from '../game/constants'

const ROBOT_SCALE: Record<Robot['type'], number> = {
  scout: 0.7,
  bruiser: 1.1,
  sapper: 0.85,
}

const ROBOT_BODY_COLOR: Record<Robot['type'], string> = {
  scout:   '#1e3a5f',
  bruiser: '#3b1f2b',
  sapper:  '#1f3b2e',
}

function RobotBody({ robot, color }: { robot: Robot; color: string }) {
  const groupRef = useRef<Group>(null)
  const walkCycle = useRef(0)

  useFrame((_, dt) => {
    if (!groupRef.current) return
    walkCycle.current += dt * robot.speed * 3
    const bob = Math.sin(walkCycle.current) * 0.06
    groupRef.current.position.y = robot.position[1] + bob
    // Lean forward in movement direction
    groupRef.current.rotation.z = Math.sin(walkCycle.current * 0.5) * 0.05
  })

  const scale = ROBOT_SCALE[robot.type]
  const bodyColor = ROBOT_BODY_COLOR[robot.type]
  const hpPct = robot.hp / robot.maxHp

  return (
    <group
      ref={groupRef}
      position={robot.position}
      scale={[scale, scale, scale]}
    >
      {/* Legs */}
      {[-0.15, 0.15].map((xOff, i) => (
        <mesh key={i} position={[xOff, -0.35, 0]}>
          <boxGeometry args={[0.12, 0.3, 0.12]} />
          <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.45, 0.5, 0.3]} />
        <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.3} emissive={color} emissiveIntensity={0.15} />
      </mesh>

      {/* Arms */}
      {[-0.3, 0.3].map((xOff, i) => (
        <mesh key={i} position={[xOff, 0.05, 0]}>
          <boxGeometry args={[0.1, 0.35, 0.1]} />
          <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Head */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.32, 0.28, 0.28]} />
        <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Eyes */}
      {[-0.08, 0.08].map((xOff, i) => (
        <mesh key={i} position={[xOff, 0.42, 0.14]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
      ))}

      {/* HP bar */}
      <group position={[0, 0.85, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.06, 0.02]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[(hpPct - 1) * 0.25, 0, 0.015]}>
          <boxGeometry args={[0.5 * hpPct, 0.04, 0.02]} />
          <meshStandardMaterial color={hpPct > 0.5 ? '#4ade80' : hpPct > 0.25 ? '#fbbf24' : '#ef4444'} emissive={hpPct > 0.5 ? '#4ade80' : '#ef4444'} emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  )
}

export function RobotMesh({ robot }: { robot: Robot }) {
  const color = SIDE_COLOR[robot.side]
  return <RobotBody robot={robot} color={color} />
}
