import { useFrame } from "@react-three/fiber"
import { pointer } from "../hooks/usePointer"
import { nextSelection } from "./selection"

export const SELECT_RADIUS = 1.2
export const RELEASE_MARGIN = 0.3
export const DWELL_MS = 500

// Selection is a nearest-neighbour scan over the physics array that already
// exists — ~50 distance comparisons per frame, negligible beside the existing
// 1225-pair collision loop. No raycaster, no per-dog colliders.
export function DogSelector({ physicsRef, selectionRef, count }) {
  useFrame(() => {
    const dogs = physicsRef.current
    // worldSmooth, not world: selection must agree with where the lens is drawn.
    const mw = pointer.worldSmooth
    if (!dogs || !dogs.length || !mw) return

    let nearestIndex = null
    let nearestDistance = Infinity
    let activeDistance = null
    const active = selectionRef.current.index

    for (let i = 0; i < count; i++) {
      const d = dogs[i]
      const dx = d.x - mw.x
      const dy = d.y - mw.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearestDistance) {
        nearestDistance = dist
        nearestIndex = i
      }
      if (i === active) activeDistance = dist
    }

    selectionRef.current = nextSelection(selectionRef.current, {
      nearestIndex,
      nearestDistance,
      activeDistance,
      now: performance.now(),
      selectRadius: SELECT_RADIUS,
      releaseMargin: RELEASE_MARGIN,
      dwellMs: DWELL_MS,
    })
  }, -0.5) // after PointerProjector (-2) and DogsPhysics (-1), before Dog (0)

  return null
}
