import { useMemo, useRef } from "react"
import * as THREE from "three"
import { useThree, useFrame } from "@react-three/fiber"

const SMOOTHING = 0.08

export const pointer = {
  screen: { x: 0, y: 0 },
  smooth: { x: 0, y: 0 },
  world: null,
  speed: 0,
}

let started = false

export function startPointerTracking() {
  if (started || typeof window === "undefined") return
  started = true

  pointer.screen.x = pointer.smooth.x = window.innerWidth / 2
  pointer.screen.y = pointer.smooth.y = window.innerHeight / 2

  window.addEventListener("pointermove", (e) => {
    pointer.screen.x = e.clientX
    pointer.screen.y = e.clientY
  })

  const tick = () => {
    pointer.smooth.x += (pointer.screen.x - pointer.smooth.x) * SMOOTHING
    pointer.smooth.y += (pointer.screen.y - pointer.smooth.y) * SMOOTHING
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// Projects the *smoothed* pointer onto the dog plane. Uses `smooth` so the
// selection lands exactly where the drawn lens appears.
export function PointerProjector({ planeZ = -40 }) {
  const { camera, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ),
    [planeZ],
  )
  const hit = useMemo(() => new THREE.Vector3(), [])
  const prev = useRef(null)

  useFrame(() => {
    const rect = gl.domElement.getBoundingClientRect()
    ndc.x = ((pointer.smooth.x - rect.left) / rect.width) * 2 - 1
    ndc.y = -((pointer.smooth.y - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(ndc, camera)
    if (!raycaster.ray.intersectPlane(plane, hit)) return

    if (prev.current) {
      const dx = hit.x - prev.current.x
      const dy = hit.y - prev.current.y
      pointer.speed = Math.sqrt(dx * dx + dy * dy)
    }
    prev.current = { x: hit.x, y: hit.y }
    pointer.world = { x: hit.x, y: hit.y }
  }, -2) // before DogsPhysics at -1

  return null
}
