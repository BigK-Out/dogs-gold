import * as THREE from "three"
import Header3D from "../../shared/Header3D"
import { FONTS } from "../../shared/headerFonts"
import { diamondTexture } from "../../shared/diamondTexture"

// Pavé diamonds set in gold: the faces are white metal broken into facets of
// differing smoothness, so they catch the sunset environment as scattered
// glints, while the chamfer and sides stay unbroken polished gold.
//
// The face is white and fully metallic — a diamond reads as its reflections,
// not as a colour — and the facet map drives both its roughness and its relief.
const pave = diamondTexture()

const DIAMOND_AND_GOLD = {
  face: {
    map: pave.color,
    // Part metal only: the photograph already carries its own highlights, and
    // a fully metallic face would drown them in reflections of the scene.
    metalness: 0.35,
    // Left at 1 so the map alone decides which facets are polished.
    roughness: 1,
    roughnessMap: pave.roughness,
    // Each stone's crown, as real surface tilt: light rakes across the slopes
    // and every stone catches the environment at its own angle.
    normalMap: pave.normal,
    normalScale: new THREE.Vector2(1.6, 1.6),
    envMapIntensity: 1.4,
    // A little light of its own, so the stones stay bright against the gold
    // rivers behind them rather than going grey in the scene's shadows.
    emissiveMap: pave.color,
    emissive: "#ffffff",
    emissiveIntensity: 0.18,
  },
  edge: { color: "#f6c65a", metalness: 1, roughness: 0.12, envMapIntensity: 1.4 },
}

// The stones themselves: cut geometry set across the headline's face, each one
// turning slowly. A dielectric rather than a metal — a diamond is glass with a
// very high index, so it reflects hard at grazing angles and lets light through
// head-on — with iridescence for the fire a real stone throws.
const GEMS = {
  // A fraction of a letter's height: about twenty stones up a capital.
  spacing: 0.05,
  material: {
    color: "#ffffff",
    metalness: 0,
    roughness: 0.02,
    ior: 2.42,
    reflectivity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0,
    iridescence: 1,
    iridescenceIOR: 1.8,
    envMapIntensity: 2.6,
  },
  // The glare thrown back down the lens where the loupe passes: a blown-out
  // core, spikes and a halo, in the warm white of this world's light.
  flare: { color: "#fff6e2", size: 5.2 },
}

// The lamp the loupe carries over the lettering. Warm white, because the glass
// and its setting are gold, and it falls off quickly so the flash stays a pool
// under the glass rather than lighting the whole headline.
const LOUPE_LIGHT = {
  color: "#fff4d6",
  intensity: 260,
  distance: 26,
  decay: 2,
  // How far it stands off the face. Too close and it burns out the few stones
  // directly beneath it instead of raking across their facets.
  offset: 3.5,
}

export default function Header() {
  return (
    <Header3D
      headline="Welcome to your new life"
      subline="we offer the best only for the best"
      material={DIAMOND_AND_GOLD}
      gems={GEMS}
      light={LOUPE_LIGHT}
      // A Spencerian script, unsqueezed and untracked: its letters are drawn to
      // join, and mixed case rather than caps for the same reason.
      font={FONTS.script}
      condense={1}
      letterSpacing={0}
      // The gold rim around each stone-set face: narrow, so it reads as a
      // setting holding the stones rather than as a gold letter.
      bevel={0.03}
    />
  )
}
