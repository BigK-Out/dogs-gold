// src/worlds/stray/creds.js
//
// The bottom of the descent keeps a form. Luxury issues a certificate of value
// and the middle class a note on the fridge; here a dog is a number, a
// condition and a date it stops being the pound's problem.
//
// Derived purely from the dog's index, so the same dog always shows the same
// slip — across re-selections and across page reloads.

const CONDITIONS = ["Underweight", "Injured paw", "Untreated", "Malnourished", "Mange", "Old wound"]
const FOUND = [
  "Behind the depot",
  "Ring road, junction 4",
  "Market bins",
  "Under the flyover",
  "Canal path",
  "Retail park",
]
const TEMPERS = ["Fearful", "Bites", "Withdrawn", "Friendly", "Unassessed"]

// A dog is held seven days before the pound may do as it likes with it.
const HOLD_DAYS = 7

export function credsFor(index) {
  const i = Math.abs(Math.trunc(index))
  const held = 1 + ((i * 11) % 60)
  return {
    tag: `#${String(200 + i * 7).slice(-3)}`,
    age: `est. ${1 + ((i * 3) % 9)} yrs`,
    condition: CONDITIONS[(i * 5) % CONDITIONS.length],
    days: `${held} days`,
    found: FOUND[(i * 7) % FOUND.length],
    temper: TEMPERS[(i * 13) % TEMPERS.length],
    // Past the hold, nobody is coming. The slip says so in days.
    remaining: Math.max(HOLD_DAYS - held, 0),
  }
}
