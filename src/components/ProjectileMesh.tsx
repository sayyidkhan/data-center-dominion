import { useMemo } from 'react'
import { Vector3 } from 'three'
import type { Projectile } from '../types'

export function ProjectileMesh({ projectile }: { projectile: Projectile }) {
  const pos = useMemo(() => {
    const from = new Vector3(...projectile.from)
    const to = new Vector3(...projectile.to)
    return from.lerp(to, projectile.progress)
  }, [projectile])

  return (
    <mesh position={[pos.x, pos.y, pos.z]}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#fbbf24"
        emissiveIntensity={2}
      />
    </mesh>
  )
}
