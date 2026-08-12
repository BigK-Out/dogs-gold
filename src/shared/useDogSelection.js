import { useFrame } from "@react-three/fiber"
import { pointer } from "./usePointer"
import { nextSelection } from "./selection"

// Selection is a nearest-neighbour scan over the physics array that already
// exists — ~50 distance comparisons per frame, negligible beside the existing
// 1225-pair collision loop. No raycaster, no per-dog colliders.
//
// The radii are per-world config rather than constants here. They must be sized
// against how large a dog *looks* through that world's instrument, not against
// COLLISION_RADIUS: in luxury, deriving them from the 0.75 collision radius put
// the hot zone at ~14px, so the glass would sit squarely on a dog and select
// nothing.
export function DogSelector({ physicsRef, selectionRef, count, selection }) {
  useFrame(() => {
    const dogs = physicsRef.current
    // worldSmooth, not world: selection must agree with where the instrument
    // is drawn.
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
      selectRadius: selection.radius,
      releaseMargin: selection.releaseMargin,
      dwellMs: selection.dwellMs,
    })
  }, -0.5) // after PointerProjector (-2) and DogsPhysics (-1), before Dog (0)

  return null
}
