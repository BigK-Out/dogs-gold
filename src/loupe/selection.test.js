import test from "node:test"
import assert from "node:assert/strict"
import { nextSelection, INITIAL, IDLE, PENDING, LOCKED } from "./selection.js"

const OPTS = { selectRadius: 1.2, releaseMargin: 0.3, dwellMs: 500 }
const input = (over) => ({ nearestIndex: null, nearestDistance: Infinity, activeDistance: null, now: 0, ...OPTS, ...over })

test("stays idle when nothing is near", () => {
  const s = nextSelection(INITIAL, input({ now: 100 }))
  assert.equal(s.phase, IDLE)
})

test("enters pending when a dog comes within radius", () => {
  const s = nextSelection(INITIAL, input({ nearestIndex: 3, nearestDistance: 0.9, now: 100 }))
  assert.equal(s.phase, PENDING)
  assert.equal(s.index, 3)
  assert.equal(s.since, 100)
})

test("ignores a dog outside the radius", () => {
  const s = nextSelection(INITIAL, input({ nearestIndex: 3, nearestDistance: 5, now: 100 }))
  assert.equal(s.phase, IDLE)
})

test("holds pending until the dwell elapses", () => {
  const pending = { phase: PENDING, index: 3, since: 100 }
  const s = nextSelection(pending, input({ nearestIndex: 3, nearestDistance: 0.9, activeDistance: 0.9, now: 400 }))
  assert.equal(s.phase, PENDING)
})

test("locks once the dwell elapses", () => {
  const pending = { phase: PENDING, index: 3, since: 100 }
  const s = nextSelection(pending, input({ nearestIndex: 3, nearestDistance: 0.9, activeDistance: 0.9, now: 600 }))
  assert.equal(s.phase, LOCKED)
  assert.equal(s.index, 3)
})

test("restarts the dwell when a different dog becomes nearest", () => {
  const pending = { phase: PENDING, index: 3, since: 100 }
  const s = nextSelection(pending, input({ nearestIndex: 8, nearestDistance: 0.5, now: 300 }))
  assert.equal(s.phase, PENDING)
  assert.equal(s.index, 8)
  assert.equal(s.since, 300)
})

test("drops to idle if the dog is lost before locking", () => {
  const pending = { phase: PENDING, index: 3, since: 100 }
  const s = nextSelection(pending, input({ now: 300 }))
  assert.equal(s.phase, IDLE)
})

test("keeps the lock inside the release margin", () => {
  const locked = { phase: LOCKED, index: 3, since: 100 }
  const s = nextSelection(locked, input({ nearestIndex: 3, nearestDistance: 1.4, activeDistance: 1.4, now: 900 }))
  assert.equal(s.phase, LOCKED)
  assert.equal(s.index, 3)
})

test("keeps the lock even when another dog is nearer", () => {
  const locked = { phase: LOCKED, index: 3, since: 100 }
  const s = nextSelection(locked, input({ nearestIndex: 8, nearestDistance: 0.2, activeDistance: 1.0, now: 900 }))
  assert.equal(s.phase, LOCKED)
  assert.equal(s.index, 3)
})

test("releases the lock beyond the margin", () => {
  const locked = { phase: LOCKED, index: 3, since: 100 }
  const s = nextSelection(locked, input({ nearestIndex: 3, nearestDistance: 2.0, activeDistance: 2.0, now: 900 }))
  assert.equal(s.phase, IDLE)
  assert.equal(s.index, null)
})
