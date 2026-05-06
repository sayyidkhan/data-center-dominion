import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3, MathUtils } from 'three'

const PAN_SPEED = 0.15
const ZOOM_MIN = 8
const ZOOM_MAX = 80
const TILT_MIN = 20
const TILT_MAX = 70

export function CameraRig() {
  const { camera, gl } = useThree()
  const target = useRef(new Vector3(0, 0, 40))
  const azimuth = useRef(0)      // degrees, 0 = looking from player side
  const elevation = useRef(45)   // degrees tilt
  const distance = useRef(45)
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const rotateSnap = useRef(0)   // pending snap rotation delta

  // Set initial camera position — lower angle, further back to show depth
  useEffect(() => {
    target.current.set(0, 0, 42)
    distance.current = 60
    elevation.current = 35
  }, [])

  useEffect(() => {
    const canvas = gl.domElement

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      distance.current = MathUtils.clamp(
        distance.current + e.deltaY * 0.05,
        ZOOM_MIN,
        ZOOM_MAX
      )
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 1) {
        isPanning.current = true
        lastMouse.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      lastMouse.current = { x: e.clientX, y: e.clientY }

      // Pan target along world XZ plane
      const azRad = MathUtils.degToRad(azimuth.current)
      const panRight = new Vector3(Math.cos(azRad), 0, -Math.sin(azRad)).multiplyScalar(-dx * PAN_SPEED)
      const panForward = new Vector3(Math.sin(azRad), 0, Math.cos(azRad)).multiplyScalar(dy * PAN_SPEED)
      target.current.add(panRight).add(panForward)
    }

    const onMouseUp = () => { isPanning.current = false }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') rotateSnap.current -= 90
      if (e.key === 'e' || e.key === 'E') rotateSnap.current += 90
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [gl])

  useFrame((_, dt) => {
    // Apply snap rotation smoothly
    if (Math.abs(rotateSnap.current) > 0.5) {
      const step = Math.sign(rotateSnap.current) * Math.min(Math.abs(rotateSnap.current), 180 * dt)
      azimuth.current += step
      rotateSnap.current -= step
    }

    const azRad = MathUtils.degToRad(azimuth.current)
    const elRad = MathUtils.degToRad(
      MathUtils.clamp(elevation.current, TILT_MIN, TILT_MAX)
    )

    const x = target.current.x + distance.current * Math.sin(azRad) * Math.cos(elRad)
    const y = target.current.y + distance.current * Math.sin(elRad)
    const z = target.current.z + distance.current * Math.cos(azRad) * Math.cos(elRad)

    camera.position.set(x, y, z)
    camera.lookAt(target.current)
  })

  return null
}
