// src/worlds/stray/Header.jsx
import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import Header3D from "../../shared/Header3D"
import { introStrength } from "../../shared/intro"
import { tubeGlow } from "../../shared/flicker"
import { HELL_INTRO, STREET_TUBE } from "./intro"

// Glowing blood-red metal, to be read while the water is still running red.
const HELL = {
  color: "#a51010",
  metalness: 0.8,
  roughness: 0.3,
  emissive: "#2b0000",
}

// What is left once hell fades: a strip light over a wet street. The body is
// dull grey plastic, but it burns, and in this world it is the only thing that
// does — which is why the lettering is legible at all once the lights fail.
const STREETS = {
  // Unlit: the lettering is the light, and must not be lit by anything else.
  // While it was a lit surface, the lamps hung beside it struck a highlight on
  // whichever letters they were nearest and left the rest dim, so the line read
  // as half a sign however the lamps were placed. Unlit, every letter is
  // exactly this colour, scaled by the tube's flicker and nothing else.
  unlit: true,
  color: "#cfe4ff",
}

// The tube strikes as the hell text lets go of the screen.
const STRIKES_AT = HELL_INTRO.holdMs

// Hung at the lettering, which is where the light in this world comes from.
//
// They sat far forward while the letters had a grey body, to keep from picking
// out the ones beside them; with a near-black body there is nothing to pick
// out, so they belong where the sign is. From here the pack is lit by how near
// it is to the sign: a dog under it is lit, one at the edge of the screen is
// nearly out of reach.
const LAMPS = [
  { position: [-13, 2, -17], watts: 850 },
  { position: [13, 2, -17], watts: 850 },
  { position: [0, -3, -17], watts: 480 },
]

export default function Header() {
  const hellOpacity = useRef(1)
  const streetsOpacity = useRef(0)
  const glow = useRef(0)
  const lampRefs = useRef([])
  const startedAt = useRef(null)

  useFrame((state) => {
    const now = state.clock.elapsedTime
    if (startedAt.current === null) startedAt.current = now
    const ms = (now - startedAt.current) * 1000

    const strength = introStrength(ms, HELL_INTRO)
    hellOpacity.current = strength
    streetsOpacity.current = 1 - strength

    glow.current = tubeGlow(ms - STRIKES_AT, STREET_TUBE)
    // The light the lettering throws into the world, so the dogs below it dim
    // and brighten with the tube rather than the two disagreeing. Two lamps,
    // one per line, because a single one at the centre lights the middle of
    // the headline and leaves its ends in the dark.
    for (const lamp of lampRefs.current) {
      if (lamp) lamp.intensity = lamp.userData.watts * glow.current
    }
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
        glowRef={glow}
      />
      {/* Hung with the lettering and throwing its light back into the world.
          Far enough forward of the pack to reach it, and bright enough to
          matter now that nothing else here is lit. */}
      {LAMPS.map((lamp, i) => (
        <pointLight
          key={i}
          ref={(light) => {
            lampRefs.current[i] = light
            if (!light) return
            light.userData.watts = lamp.watts
          }}
          position={lamp.position}
          color="#cfe4ff"
          intensity={0}
          // No cutoff, and a true inverse square: the fall-off itself is the
          // effect, and a cutoff distance would flatten the far half of the
          // pack into a uniform gloom and then clip it.
          distance={0}
          decay={2}
        />
      ))}
    </>
  )
}
