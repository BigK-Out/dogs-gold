import test from "node:test"
import assert from "node:assert/strict"
import { credsFor } from "./creds.js"

test("is deterministic for the same index", () => {
  assert.deepEqual(credsFor(7), credsFor(7))
})

test("returns every field populated", () => {
  const c = credsFor(0)
  for (const key of ["tag", "age", "condition", "days"]) {
    assert.ok(c[key] !== undefined && c[key] !== "", `missing ${key}`)
  }
})

test("tag is always three digits", () => {
  for (let i = 0; i < 50; i++) {
    assert.match(credsFor(i).tag, /^#\d{3}$/)
  }
})
