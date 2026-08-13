// src/worlds/middle/creds.js
// Placeholder content. Spec 2 designs what this world actually says.

const NAMES = ["Max", "Bella", "Charlie", "Luna", "Cooper", "Daisy", "Rocky", "Sadie"]
const BREEDS = ["Beagle mix", "Labrador cross", "Terrier mix", "Collie cross"]

export function credsFor(index) {
  const i = Math.abs(Math.trunc(index))
  return {
    name: NAMES[i % NAMES.length],
    age: 1 + ((i * 5) % 12),
    breed: BREEDS[(i * 3) % BREEDS.length],
    home: `Family of ${2 + (i % 4)}`,
  }
}
