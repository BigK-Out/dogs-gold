import { useFrame } from "@react-three/fiber"
import { pointer } from "../hooks/usePointer"
import { nextSelection } from "./selection"

// Sized against the glass, not against COLLISION_RADIUS. The dog plane sits
// 40 units from the camera at fov 80, so it spans ~67 world units over the
// viewport height — roughly 12px per unit at 800px tall. The glass ring is
// 57px, i.e. ~4.8 units. COLLISION_RADIUS (0.75) is far smaller than a dog
// actually looks, so deriving the select radius from it put the hot zone at
// ~14px: the glass would sit squarely on a dog and select nothing.
export const SELECT_RADIUS = 4.0
export const RELEASE_MARGIN = 1.0
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
