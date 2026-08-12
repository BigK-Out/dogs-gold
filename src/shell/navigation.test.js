import test from "node:test"
import assert from "node:assert/strict"
import { nextNavigation, INITIAL, IDLE, COVERING, REVEALING } from "./navigation.js"

const COUNT = 3
const go = (delta) => ({ type: "go", delta })

test("starts idle on the first world", () => {
  assert.equal(INITIAL.index, 0)
  assert.equal(INITIAL.phase, IDLE)
  assert.equal(INITIAL.pending, null)
})

test("going forward starts covering without moving yet", () => {
  const s = nextNavigation(INITIAL, go(1), COUNT)
  assert.equal(s.phase, COVERING)
  assert.equal(s.pending, 1)
  assert.equal(s.index, 0, "index must not move until the curtain is opaque")
})

test("ignores going back from the first world", () => {
  const s = nextNavigation(INITIAL, go(-1), COUNT)
  assert.deepEqual(s, INITIAL)
})

test("ignores going forward from the last world", () => {
  const last = { index: COUNT - 1, pending: null, phase: IDLE }
  const s = nextNavigation(last, go(1), COUNT)
  assert.deepEqual(s, last)
})

test("ignores input while covering", () => {
  // pending is 2 but delta +1 would target 1 — so an unguarded reducer would
  // visibly overwrite pending, and this test would catch it.
  const covering = { index: 0, pending: 2, phase: COVERING }
  const s = nextNavigation(covering, go(1), COUNT)
  assert.deepEqual(s, covering, "queued swaps would land on the wrong world")
})

test("ignores input while revealing", () => {
  const revealing = { index: 1, pending: null, phase: REVEALING }
  const s = nextNavigation(revealing, go(1), COUNT)
  assert.deepEqual(s, revealing)
})

test("covered commits the pending index", () => {
  const covering = { index: 0, pending: 2, phase: COVERING }
  const s = nextNavigation(covering, { type: "covered" }, COUNT)
  assert.equal(s.index, 2)
  assert.equal(s.pending, null)
  assert.equal(s.phase, REVEALING)
})

test("covered is ignored outside covering", () => {
  const s = nextNavigation(INITIAL, { type: "covered" }, COUNT)
  assert.deepEqual(s, INITIAL)
})

test("revealed returns to idle", () => {
  const revealing = { index: 2, pending: null, phase: REVEALING }
  const s = nextNavigation(revealing, { type: "revealed" }, COUNT)
  assert.equal(s.phase, IDLE)
  assert.equal(s.index, 2)
})

test("revealed is ignored outside revealing", () => {
  const covering = { index: 0, pending: 1, phase: COVERING }
  const s = nextNavigation(covering, { type: "revealed" }, COUNT)
  assert.deepEqual(s, covering)
})

test("a full round trip returns to the first world", () => {
  let s = INITIAL
  for (const delta of [1, 1, -1, -1]) {
    s = nextNavigation(s, go(delta), COUNT)
    s = nextNavigation(s, { type: "covered" }, COUNT)
    s = nextNavigation(s, { type: "revealed" }, COUNT)
  }
  assert.equal(s.index, 0)
  assert.equal(s.phase, IDLE)
})

test("an unknown action changes nothing", () => {
  const s = nextNavigation(INITIAL, { type: "wat" }, COUNT)
  assert.deepEqual(s, INITIAL)
})
