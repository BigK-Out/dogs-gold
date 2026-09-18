import Header3D from "../../shared/Header3D"

// Polished gold, lit by the world's sunset environment — the same material
// idea as the dogs, at architectural scale.
const GOLD = { color: "#e3bb4d", metalness: 1, roughness: 0.22 }

export default function Header() {
  return (
    <Header3D
      headline="WELCOME TO YOUR NEW LIFE"
      subline="we offer the best only for the best"
      material={GOLD}
    />
  )
}
