// src/worlds/stray/Header.jsx
import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import Header3D from "../../shared/Header3D"
import { introStrength } from "../../shared/intro"
import { HELL_INTRO } from "./intro"

// Glowing blood-red metal, to be read while the water is still running red.
const HELL = {
  color: "#a51010",
  metalness: 0.8,
  roughness: 0.3,
  emissive: "#2b0000",
}

// What is left once hell fades: dull, corroded, barely worth stealing.
const STREETS = { color: "#8a7f6d", metalness: 0.55, roughness: 0.62 }

// Two headers in the same place, cross-faded by the intro: "WELCOME TO HELL"
// while the arrival burns, then the world's real greeting. The hell line is
// narrower so its fifteen letters do not tower over the other worlds' headlines.
export default function Header() {
  const hellOpacity = useRef(1)
  const streetsOpacity = useRef(0)
  const startedAt = useRef(null)

  useFrame((state) => {
    const now = state.clock.elapsedTime
    if (startedAt.current === null) startedAt.current = now
    const strength = introStrength((now - startedAt.current) * 1000, HELL_INTRO)
    hellOpacity.current = strength
    streetsOpacity.current = 1 - strength
  }, -0.25) // with the Scene's own intro clock, before anything draws

  return (
    <>
      <Header3D
        headline="WELCOME TO HELL"
        material={HELL}
        headlineWidth={30}
        opacityRef={hellOpacity}
      />
      {/* A little further back, so two transparent headers never fight over
          the same depth while both are partly visible. */}
      <Header3D
        headline="WELCOME TO THE STREETS"
        subline="starve to death or kill to survive"
        material={STREETS}
        z={-18.5}
        opacityRef={streetsOpacity}
      />
    </>
  )
}
