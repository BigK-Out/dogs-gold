// Dogs drift continuously, so a bare hover test flickers. This pure reducer
// debounces it: a dog must be held for the dwell before it locks, and a locked
// dog keeps its lock through a wider release radius.

export const IDLE = "idle"
export const PENDING = "pending"
export const LOCKED = "locked"

export const INITIAL = { phase: IDLE, index: null, since: 0 }

export function nextSelection(state, input) {
  const {
    nearestIndex, nearestDistance, activeDistance, now,
    selectRadius, releaseMargin, dwellMs,
  } = input

  // A locked dog keeps its lock until the pointer leaves its wider release
  // radius, even if another dog drifts closer. Without this the card would
  // swap targets whenever dogs cross paths.
  if (state.phase === LOCKED) {
    const held = activeDistance !== null && activeDistance <= selectRadius + releaseMargin
    return held ? state : INITIAL
  }

  if (nearestIndex === null || nearestDistance > selectRadius) {
    return state.phase === IDLE ? state : INITIAL
  }

  if (state.phase === PENDING && state.index === nearestIndex) {
    if (now - state.since >= dwellMs) {
      return { phase: LOCKED, index: nearestIndex, since: state.since }
    }
    return state
  }

  return { phase: PENDING, index: nearestIndex, since: now }
}
