import test from "node:test"
import assert from "node:assert/strict"
import { blackoutAt } from "./flicker.js"

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

test("never leaves the range between clear and black", () => {
  for (let ms = 0; ms <= 3000; ms += 10) {
    const value = blackoutAt(ms, PATTERN)
    assert.ok(value >= 0 && value <= 1, `out of range: ${value} at ${ms}ms`)
  }
})
