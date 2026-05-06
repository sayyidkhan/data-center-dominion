import type { Robot, Turret, Projectile } from '../types'
import { useGameStore, newProjectileId } from '../store/gameStore'
import { ROBOT_STATS, TURRET_STATS, CREDIT_TICK_INTERVAL, CREDIT_TICK_AMOUNT, WAVE_CONFIG } from './constants'

let creditTimer = 0
let spawnTimers: Record<string, number> = {}
let waveSpawnQueue: Array<{ side: 'player' | 'enemy'; type: Robot['type']; laneIndex: number; delay: number }> = []
let waveQueueTimer = 0

export function tickGame(dt: number) {
  const store = useGameStore.getState()
  if (store.phase === 'build' || store.phase === 'victory' || store.phase === 'defeat') return

  // Passive income
  creditTimer += dt
  if (creditTimer >= CREDIT_TICK_INTERVAL) {
    creditTimer = 0
    store.addCredits('player', CREDIT_TICK_AMOUNT)
    store.addCredits('enemy', CREDIT_TICK_AMOUNT)
  }

  // Wave spawn queue
  if (waveSpawnQueue.length > 0) {
    waveQueueTimer += dt
    while (waveSpawnQueue.length > 0 && waveQueueTimer >= (waveSpawnQueue[0]?.delay ?? 0)) {
      const entry = waveSpawnQueue.shift()!
      waveQueueTimer -= entry.delay
      store.spawnRobot(entry.side, entry.type, entry.laneIndex)
    }
  }

  // Move robots
  const { map, robots } = store
  if (!map) return

  const updatedRobots: Robot[] = []
  const toRemove: string[] = []

  for (const robot of robots) {
    if (robot.isDead) { toRemove.push(robot.id); continue }

    const waypoints = map.waypoints[robot.laneIndex]
    if (!waypoints) continue

    const targetIndex = robot.side === 'player'
      ? Math.min(robot.waypointIndex + 1, waypoints.length - 1)
      : Math.max(robot.waypointIndex - 1, 0)

    const targetWp = waypoints[targetIndex]
    if (!targetWp) continue

    const [rx, ry, rz] = robot.position
    const dx = targetWp.x - rx
    const dz = targetWp.z - rz
    const dist = Math.sqrt(dx * dx + dz * dz)

    // Valley speed bonus
    const tile = map.tiles[Math.round(rz / 2)]?.[Math.round((rx + map.cols) / 2)]
    const speedMult = tile?.elevation === -1 ? 1.3 : 1.0

    const speed = ROBOT_STATS[robot.type].speed * speedMult
    const step = speed * dt

    if (dist < step || dist < 0.05) {
      // Reached waypoint
      const atEnd = robot.side === 'player'
        ? targetIndex >= waypoints.length - 1
        : targetIndex <= 0

      if (atEnd) {
        // Robot reached enemy base — deal damage
        const targetSide = robot.side === 'player' ? 'enemy' : 'player'
        store.damageBase(targetSide, robot.damage)
        toRemove.push(robot.id)
        store.addCredits(robot.side, 5) // small reward for reaching base
        continue
      }

      updatedRobots.push({
        ...robot,
        waypointIndex: targetIndex,
        position: [targetWp.x, ry, targetWp.z],
      })
    } else {
      updatedRobots.push({
        ...robot,
        position: [rx + (dx / dist) * step, ry, rz + (dz / dist) * step],
      })
    }
  }

  for (const id of toRemove) store.removeRobot(id)
  store.updateRobots(updatedRobots)

  // Turrets shoot
  const freshRobots = useGameStore.getState().robots
  const updatedTurrets: Turret[] = []
  const newProjectiles: Projectile[] = [...useGameStore.getState().projectiles]

  for (const turret of store.turrets) {
    let { cooldownTimer, targetId } = turret

    cooldownTimer = Math.max(0, cooldownTimer - dt)

    // Find target: closest enemy robot in range
    const enemies = freshRobots.filter((r) => r.side !== turret.side && !r.isDead)
    let closestDist = Infinity
    let closestId: string | null = null

    for (const robot of enemies) {
      const dx = robot.position[0] - turret.position[0]
      const dz = robot.position[2] - turret.position[2]
      const d = Math.sqrt(dx * dx + dz * dz)
      if (d <= turret.range && d < closestDist) {
        closestDist = d
        closestId = robot.id
      }
    }

    targetId = closestId

    if (targetId && cooldownTimer <= 0) {
      const target = freshRobots.find((r) => r.id === targetId)
      if (target) {
        cooldownTimer = TURRET_STATS[turret.type].cooldown
        newProjectiles.push({
          id: newProjectileId(),
          from: [...turret.position],
          to: [...target.position],
          progress: 0,
          damage: turret.damage,
          targetId,
        })
      }
    }

    updatedTurrets.push({ ...turret, cooldownTimer, targetId })
  }

  store.updateTurrets(updatedTurrets)

  // Move projectiles + apply damage
  const aliveRobots = useGameStore.getState().robots
  const updatedProjectiles: Projectile[] = []

  for (const proj of newProjectiles) {
    const speed = 12
    const progress = Math.min(1, proj.progress + dt * speed)

    if (progress >= 1) {
      // Hit — apply damage
      const target = aliveRobots.find((r) => r.id === proj.targetId)
      if (target) {
        const newHp = target.hp - proj.damage
        if (newHp <= 0) {
          store.removeRobot(target.id)
          store.addCredits(proj.targetId.startsWith('robot') ? 'player' : 'enemy', ROBOT_STATS[target.type].reward)
        } else {
          store.updateRobots(
            useGameStore.getState().robots.map((r) =>
              r.id === target.id ? { ...r, hp: newHp } : r
            )
          )
        }
      }
      store.removeProjectile(proj.id)
    } else {
      updatedProjectiles.push({ ...proj, progress })
    }
  }

  store.updateProjectiles(updatedProjectiles)

  // Check wave end
  const remaining = useGameStore.getState().robots
  if (remaining.length === 0 && waveSpawnQueue.length === 0) {
    const { wave } = useGameStore.getState()
    if (wave >= WAVE_CONFIG.length) {
      store.setPhase('victory')
    } else {
      store.setPhase('build')
    }
  }
}

export function buildWaveQueue(wave: number) {
  const config = WAVE_CONFIG[wave - 1]
  if (!config) return

  waveSpawnQueue = []
  waveQueueTimer = 0
  spawnTimers = {}
  creditTimer = 0

  let delay = 0
  const lanes = [0, 1, 2]

  const addUnits = (type: Robot['type'], count: number) => {
    for (let i = 0; i < count; i++) {
      const laneIndex = lanes[i % lanes.length]!
      waveSpawnQueue.push({ side: 'player', type, laneIndex, delay })
      waveSpawnQueue.push({ side: 'enemy', type, laneIndex: (laneIndex + 1) % 3, delay: delay + 0.4 })
      delay += 1.2
    }
  }

  addUnits('scout', config.scouts)
  addUnits('bruiser', config.bruisers)
  addUnits('sapper', config.sappers)
}
