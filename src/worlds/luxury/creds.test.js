import test from "node:test"
import assert from "node:assert/strict"
import { credsFor } from "./creds.js"

test("is deterministic for the same index", () => {
  assert.deepEqual(credsFor(7), credsFor(7))
})

test("returns every field populated", () => {
  const c = credsFor(0)
  for (const key of ["name", "age", "location", "pedigree", "grade", "certificate", "price"]) {
    assert.ok(c[key] !== undefined && c[key] !== "", `missing ${key}`)
  }
})

test("age is a plausible dog age", () => {
  for (let i = 0; i < 50; i++) {
    const { age } = credsFor(i)
    assert.ok(Number.isInteger(age) && age >= 1 && age <= 12, `bad age ${age} at ${i}`)
  }
})

test("certificate is always four digits", () => {
  for (let i = 0; i < 50; i++) {
    assert.match(credsFor(i).certificate, /^No\. \d{4}$/)
  }
})

test("price is formatted with a thousands separator", () => {
  for (let i = 0; i < 50; i++) {
    assert.match(credsFor(i).price, /^\d{1,3},\d{3}$/)
  }
})

test("names vary across the pack", () => {
  const names = new Set(Array.from({ length: 50 }, (_, i) => credsFor(i).name))
  assert.ok(names.size >= 20, `only ${names.size} distinct names`)
})
