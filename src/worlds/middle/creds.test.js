import test from "node:test"
import assert from "node:assert/strict"
import { credsFor } from "./creds.js"

test("is deterministic for the same index", () => {
  assert.deepEqual(credsFor(7), credsFor(7))
})

test("returns every field populated", () => {
  const c = credsFor(0)
  for (const key of ["name", "age", "breed", "home"]) {
    assert.ok(c[key] !== undefined && c[key] !== "", `missing ${key}`)
  }
})

test("age is a plausible dog age", () => {
  for (let i = 0; i < 50; i++) {
    const { age } = credsFor(i)
    assert.ok(Number.isInteger(age) && age >= 1 && age <= 12, `bad age ${age} at ${i}`)
  }
})
