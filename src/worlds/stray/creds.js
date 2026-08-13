// src/worlds/stray/creds.js
// Placeholder content. Spec 3 designs what this world actually says.

const CONDITIONS = ["Underweight", "Injured paw", "Untreated", "Malnourished"]

export function credsFor(index) {
  const i = Math.abs(Math.trunc(index))
  return {
    tag: `#${String(200 + i * 7).slice(-3)}`,
    age: `est. ${1 + ((i * 3) % 9)} yrs`,
    condition: CONDITIONS[(i * 5) % CONDITIONS.length],
    days: `${1 + ((i * 11) % 60)} days`,
  }
}
