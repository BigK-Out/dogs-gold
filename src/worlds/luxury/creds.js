// Credentials are derived purely from a dog's index, so the same dog always
// shows the same card — across re-selections and across page reloads.

const NAMES = [
  "Bijou", "Comtesse", "Aurelio", "Perle", "Sable", "Vermeil",
  "Osiris", "Colette", "Vestige", "Lumen", "Cassis", "Doré",
  "Marceau", "Ondine", "Brioche", "Solange", "Tourmaline", "Amboise",
  "Vesper", "Halcyon", "Cygne", "Amaretto", "Fontaine", "Noor",
]

const LOCATIONS = [
  "Geneva", "Monaco", "Kyoto", "Antwerp", "Milano", "Gstaad",
  "Jaipur", "Vienna", "Bruges", "Zurich", "Lucerne", "Biarritz",
]

const PEDIGREES = [
  "Standard Poodle", "Continental Clip", "Royal Miniature",
  "Toy Sovereign", "Caniche Noble", "Grand Barbet",
  "Alpine Standard", "Court Miniature",
]

const GRADES = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2"]

export function credsFor(index) {
  const i = Math.abs(Math.trunc(index))
  const priceThousands = 12 + ((i * 17) % 88)
  return {
    name: NAMES[i % NAMES.length],
    age: 1 + ((i * 7) % 12),
    location: LOCATIONS[(i * 5) % LOCATIONS.length],
    pedigree: PEDIGREES[(i * 3) % PEDIGREES.length],
    grade: GRADES[(i * 11) % GRADES.length],
    certificate: `No. ${String(1000 + i * 137).slice(-4)}`,
    price: `${priceThousands},000`,
  }
}
