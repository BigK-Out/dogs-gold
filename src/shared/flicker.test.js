import test from "node:test"
import assert from "node:assert/strict"
import { blackoutAt, tubeGlow } from "./flicker.js"

const PATTERN = { pulses: [0, 1000, 2000], duration: 600, softenFrom: 1800, endsAt: 2600 }
const HARD = { pulses: [0], duration: 600 }

test("a cut is fully black through the middle of its pulse", () => {
  assert.equal(blackoutAt(300, HARD), 1)
})

test("a cut eases in and out rather than snapping", () => {
  const rising = blackoutAt(60, HARD)
  const falling = blackoutAt(540, HARD)
  assert.ok(rising > 0 && rising < 1, `expected a partial rise, got ${rising}`)
  assert.ok(falling > 0 && falling < 1, `expected a partial fall, got ${falling}`)
  assert.ok(blackoutAt(120, HARD) > rising, "the fall must deepen as it goes")
})

test("is clear at both ends of a pulse", () => {
  assert.equal(blackoutAt(0, HARD), 0)
  assert.equal(blackoutAt(600, HARD), 0)
})

test("is clear between cuts", () => {
  assert.equal(blackoutAt(800, PATTERN), 0)
})

test("later cuts land lighter once the softening begins", () => {
  const late = blackoutAt(2300, PATTERN)
  assert.ok(late > 0 && late < 1, `expected a partial cut, got ${late}`)
})

test("is clear once every cut has passed", () => {
  assert.equal(blackoutAt(2600, PATTERN), 0)
  assert.equal(blackoutAt(60000, PATTERN), 0)
})

const TUBE = {
  stutters: [
    [500, 80, 0.2],
    [2000, 60, 0.5],
  ],
  period: 4000,
  strike: 2,
  settle: 400,
}

test("a tube strikes brighter than it burns", () => {
  assert.ok(tubeGlow(0, TUBE) > 2, "the strike must overshoot")
  assert.equal(tubeGlow(1000, TUBE), 1)
})

test("a tube dips through a stutter and recovers", () => {
  assert.equal(tubeGlow(520, TUBE), 0.2)
  assert.equal(tubeGlow(600, TUBE), 1)
  assert.equal(tubeGlow(2030, TUBE), 0.5)
})

test("a tube repeats its stutters every period", () => {
  assert.equal(tubeGlow(4520, TUBE), 0.2)
  assert.equal(tubeGlow(8520, TUBE), 0.2)
})

test("a tube is dark before it is switched on", () => {
  assert.equal(tubeGlow(-10, TUBE), 0)
})

test("never leaves the range between clear and black", () => {
  for (let ms = 0; ms <= 3000; ms += 10) {
    const value = blackoutAt(ms, PATTERN)
    assert.ok(value >= 0 && value <= 1, `out of range: ${value} at ${ms}ms`)
  }
})
