import test from "node:test"
import assert from "node:assert/strict"
import { calmDamping, DEFAULT_CALM } from "./repulsion.js"

const CFG = { calmRadius: 3.0, calmSpeed: 1.0, calmFloor: 0.1 }

// The floor is reached by `1 - (1 - floor)`, which lands a float epsilon below
// it. That is a rounding artifact, not a leak past the floor.
const EPS = 1e-9
const close = (actual, expected, msg) =>
  assert.ok(Math.abs(actual - expected) < EPS, msg ?? `${actual} != ${expected}`)

test("a fast pointer is undamped even at point-blank range", () => {
  assert.equal(calmDamping(0, CFG.calmSpeed, CFG), 1)
  assert.equal(calmDamping(0, 5, CFG), 1)
})

test("a slow pointer is undamped once it is outside the calm radius", () => {
  assert.equal(calmDamping(CFG.calmRadius, 0, CFG), 1)
  assert.equal(calmDamping(10, 0, CFG), 1)
})

test("a stationary pointer at zero distance damps to the floor", () => {
  close(calmDamping(0, 0, CFG), CFG.calmFloor)
})

test("damping strengthens as the pointer closes in at a fixed slow speed", () => {
  const far = calmDamping(2.5, 0.2, CFG)
  const mid = calmDamping(1.5, 0.2, CFG)
  const near = calmDamping(0.5, 0.2, CFG)
  assert.ok(near < mid && mid < far, `expected ${near} < ${mid} < ${far}`)
})

test("damping weakens as the pointer speeds up at a fixed close distance", () => {
  const crawl = calmDamping(0.5, 0.1, CFG)
  const amble = calmDamping(0.5, 0.5, CFG)
  const flick = calmDamping(0.5, 0.9, CFG)
  assert.ok(crawl < amble && amble < flick, `expected ${crawl} < ${amble} < ${flick}`)
})

test("never leaves the range between the floor and full strength", () => {
  for (let d = 0; d <= 6; d += 0.25) {
    for (let s = 0; s <= 2; s += 0.1) {
      const c = calmDamping(d, s, CFG)
      assert.ok(
        c >= CFG.calmFloor - EPS && c <= 1,
        `out of range: ${c} at d=${d} s=${s}`,
      )
    }
  }
})

test("a config without calm keys is unaffected", () => {
  assert.equal(calmDamping(0, 0, { repulsionRadius: 4.5 }), 1)
})

test("the shared defaults enable damping", () => {
  assert.ok(calmDamping(0, 0, DEFAULT_CALM) < 1)
  assert.equal(calmDamping(0, DEFAULT_CALM.calmSpeed, DEFAULT_CALM), 1)
})
