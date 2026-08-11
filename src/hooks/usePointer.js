import { useMemo, useRef } from "react"
import * as THREE from "three"
import { useThree, useFrame } from "@react-three/fiber"

const SMOOTHING = 0.08

export const pointer = {
  screen: { x: 0, y: 0 },   // raw, instantaneous
  smooth: { x: 0, y: 0 },   // lerped, for anything drawn on screen
  world: null,              // from `screen` — physics repulsion
  worldSmooth: null,        // from `smooth` — loupe selection
  speed: 0,                 // from `world` deltas
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

// Projects the pointer onto the dog plane twice, because the two consumers
// genuinely want different things:
//
//   world       ← raw screen. Physics repulsion was event-driven and
//                 instantaneous before this refactor; feeding it the lerped
//                 value would add lag, keep nudging dogs after the pointer
//                 stops, and understate peak speed so fast flicks push less.
//   worldSmooth ← smoothed screen. Selection must agree with where the lens
//                 is *drawn*, or the glass highlights one dog while the card
//                 describes another.
//
// A second raycast per frame against one plane is negligible.
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

    const project = (sx, sy) => {
      ndc.x = ((sx - rect.left) / rect.width) * 2 - 1
      ndc.y = -((sy - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      return raycaster.ray.intersectPlane(plane, hit)
        ? { x: hit.x, y: hit.y }
        : null
    }

    const raw = project(pointer.screen.x, pointer.screen.y)
    if (raw) {
      if (prev.current) {
        const dx = raw.x - prev.current.x
        const dy = raw.y - prev.current.y
        pointer.speed = Math.sqrt(dx * dx + dy * dy)
      }
      prev.current = raw
      pointer.world = raw
    }

    const sm = project(pointer.smooth.x, pointer.smooth.y)
    if (sm) pointer.worldSmooth = sm
  }, -2) // before DogsPhysics at -1

  return null
}
