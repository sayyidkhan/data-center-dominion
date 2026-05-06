import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Group } from 'three'
import type { DataCenter as DC } from '../types'

function RackLight({ color, x, y, z }: { color: string; x: number; y: number; z: number }) {
  const ref = useRef<Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    const mat = ref.current.material as { emissiveIntensity: number }
    mat.emissiveIntensity = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.5 + x * 3 + y)
  })
  return (
    <mesh ref={ref} position={[x, y, z]}>
      <boxGeometry args={[0.18, 0.07, 0.06]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
    </mesh>
  )
}

export function DataCenterMesh({ base }: { base: DC }) {
  const groupRef = useRef<Group>(null)
  const color = base.side === 'player' ? '#22d3ee' : '#f472b6'
  const darkColor = base.side === 'player' ? '#0c1f2e' : '#2a0c1e'
  const healthPct = base.hp / base.maxHp

  return (
    <group ref={groupRef} position={base.position}>

      {/* Wide base platform */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[14, 0.3, 6]} />
        <meshStandardMaterial color={darkColor} emissive={color} emissiveIntensity={0.08} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Glowing edge strip on platform front */}
      <mesh position={[0, 0.32, 2.8]}>
        <boxGeometry args={[14, 0.06, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0.32, -2.8]}>
        <boxGeometry args={[14, 0.06, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>

      {/* 3 main server tower blocks */}
      {[-4, 0, 4].map((xOff, i) => (
        <group key={i} position={[xOff, 0, 0]}>
          {/* Tower body */}
          <mesh position={[0, 3.5, 0]} castShadow>
            <boxGeometry args={[2.8, 7, 2.2]} />
            <meshStandardMaterial color={darkColor} emissive={color} emissiveIntensity={0.06} metalness={0.85} roughness={0.15} />
          </mesh>
          {/* Glowing vertical edge lines */}
          {[-1.3, 1.3].map((ex, j) => (
            <mesh key={j} position={[ex, 3.5, 1.12]}>
              <boxGeometry args={[0.06, 7.2, 0.04]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
            </mesh>
          ))}
          {/* Rack lights on face */}
          {[1, 2, 3, 4, 5, 6].map((row) =>
            [-0.6, -0.2, 0.2, 0.6].map((col) => (
              <RackLight key={`${row}_${col}`} color={color} x={col} y={row} z={1.12} />
            ))
          )}
          {/* Top cap */}
          <mesh position={[0, 7.2, 0]}>
            <boxGeometry args={[3, 0.2, 2.4]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} metalness={0.9} />
          </mesh>
          {/* Antenna */}
          <mesh position={[0, 8.4, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 2.4, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
          </mesh>
          <mesh position={[0, 9.7, 0]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
          </mesh>
        </group>
      ))}

      {/* Connecting bridge between towers */}
      <mesh position={[0, 5.5, 0]}>
        <boxGeometry args={[11, 0.2, 0.4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>

      {/* Floating HP bar above the complex */}
      <group position={[0, 11, 0]}>
        <mesh>
          <boxGeometry args={[6, 0.3, 0.06]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[(healthPct - 1) * 3, 0, 0.04]}>
          <boxGeometry args={[6 * healthPct, 0.22, 0.06]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
        </mesh>
      </group>

      {/* Ground glow halo */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  )
}
