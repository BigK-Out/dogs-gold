// src/worlds/middle/creds.js
//
// What this world knows about a dog is what ends up on the fridge door: a
// name, a feeding time, when the vet is due. Luxury issues a certificate of
// value and stray a pound tag; the middle of the descent keeps a note.
//
// Derived purely from the dog's index, so the same dog always shows the same
// note — across re-selections and across page reloads.

const NAMES = ["Max", "Bella", "Charlie", "Luna", "Cooper", "Daisy", "Rocky", "Sadie"]
const BREEDS = ["Beagle mix", "Labrador cross", "Terrier mix", "Collie cross"]
const FEEDS = ["7am & 6pm", "8am & 7pm", "7.30am & 6.30pm", "morning & night"]
const CHORES = [
  "walk before school",
  "no table scraps!!",
  "pills in the cheese",
  "back garden only",
  "Katie's turn to walk",
  "vet says: less kibble",
]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function credsFor(index) {
  const i = Math.abs(Math.trunc(index))
  return {
    name: NAMES[i % NAMES.length],
    age: 1 + ((i * 5) % 12),
    breed: BREEDS[(i * 3) % BREEDS.length],
    home: `Family of ${2 + (i % 4)}`,
    feeds: FEEDS[(i * 7) % FEEDS.length],
    vet: `${1 + ((i * 13) % 28)} ${MONTHS[(i * 5) % MONTHS.length]}`,
    chore: CHORES[(i * 11) % CHORES.length],
  }
}
