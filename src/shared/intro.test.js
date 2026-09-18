import test from "node:test"
import assert from "node:assert/strict"
import { introStrength } from "./intro.js"

const INTRO = { holdMs: 2500, fadeMs: 1600 }

test("is full strength from the start through the hold", () => {
  assert.equal(introStrength(0, INTRO), 1)
  assert.equal(introStrength(INTRO.holdMs, INTRO), 1)
})

test("is gone once the fade completes, and stays gone", () => {
  assert.equal(introStrength(INTRO.holdMs + INTRO.fadeMs, INTRO), 0)
  assert.equal(introStrength(60000, INTRO), 0)
})

test("is halfway at the middle of the fade", () => {
  assert.equal(introStrength(INTRO.holdMs + INTRO.fadeMs / 2, INTRO), 0.5)
})

test("only ever falls during the fade", () => {
  let prev = 1
  for (let ms = INTRO.holdMs; ms <= INTRO.holdMs + INTRO.fadeMs; ms += 50) {
    const s = introStrength(ms, INTRO)
    assert.ok(s <= prev && s >= 0, `rose or left range at ${ms}ms: ${s}`)
    prev = s
  }
})
