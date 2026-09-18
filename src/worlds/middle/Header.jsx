import Header3D from "../../shared/Header3D"

// Brushed silver rather than luxury's mirror gold: a step down the descent,
// lit by this world's neutral city environment.
const SILVER = { color: "#c2c8cd", metalness: 1, roughness: 0.32 }

export default function Header() {
  return (
    <Header3D
      headline="WELCOME TO A FAMILY OF FOUR"
      subline="we offer kibble and steak (if you are lucky)"
      material={SILVER}
    />
  )
}
