import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { Turret } from '../types'
import { TURRET_COLORS, SIDE_COLOR } from '../game/constants'
import { useGameStore } from '../store/gameStore'

export function TurretMesh({ turret }: { turret: Turret }) {
  const headRef = useRef<Group>(null)
  const color = TURRET_COLORS[turret.type]
  const sideColor = SIDE_COLOR[turret.side]
  const robots = useGameStore((s) => s.robots)

  useFrame(() => {
    if (!headRef.current || !turret.targetId) return
    const target = robots.find((r) => r.id === turret.targetId)
    if (!target) return
    const [tx, , tz] = target.position
    const [px, , pz] = turret.position
    headRef.current.rotation.y = -Math.atan2(tx - px, tz - pz)
  })

  return (
    <group position={turret.position}>
      {/* Base platform */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.3, 8]} />
        <meshStandardMaterial color="#1f2937" emissive={sideColor} emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Rotating head */}
      <group ref={headRef}>
        {turret.type === 'pulse' && (
          <>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.25, 0.3, 0.4, 8]} />
              <meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={0.3} metalness={0.9} />
            </mesh>
            <mesh position={[0, 0.15, 0.38]}>
              <cylinderGeometry args={[0.06, 0.06, 0.5, 8]} rotation={[Math.PI / 2, 0, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
            </mesh>
          </>
        )}

        {turret.type === 'cannon' && (
          <>
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.35, 12, 12]} />
              <meshStandardMaterial color="#1c1917" emissive={color} emissiveIntensity={0.2} metalness={0.9} />
            </mesh>
            <mesh position={[0, 0.2, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.14, 0.7, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} metalness={0.8} />
            </mesh>
          </>
        )}

        {turret.type === 'beam' && (
          <>
            <mesh position={[0, 0.25, 0]}>
              <octahedronGeometry args={[0.3]} />
              <meshStandardMaterial color="#0a0e1a" emissive={color} emissiveIntensity={0.8} metalness={0.5} />
            </mesh>
            {/* Orbital rings */}
            {[0, 60, 120].map((deg, i) => (
              <mesh key={i} position={[0, 0.25, 0]} rotation={[0, (deg * Math.PI) / 180, Math.PI / 2]}>
                <torusGeometry args={[0.38, 0.03, 8, 24]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
              </mesh>
            ))}
          </>
        )}
      </group>

      {/* Range indicator — faint circle on ground, visible in build phase */}
    </group>
  )
}
