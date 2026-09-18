import Header3D from "../../shared/Header3D"
import { FONTS } from "../../shared/headerFonts"
import { diamondTexture } from "../../shared/diamondTexture"

// Pavé diamonds set in gold: the faces are white metal broken into facets of
// differing smoothness, so they catch the sunset environment as scattered
// glints, while the chamfer and sides stay unbroken polished gold.
//
// The face is white and fully metallic — a diamond reads as its reflections,
// not as a colour — and the facet map drives both its roughness and its relief.
const sparkle = diamondTexture()

const DIAMOND_AND_GOLD = {
  face: {
    color: "#ffffff",
    metalness: 1,
    // The map scales this down per facet, so the stones run from mirror to
    // this. Wide spread is what separates stones from a uniformly shiny face.
    roughness: 0.55,
    roughnessMap: sparkle,
    bumpMap: sparkle,
    // Deep enough that each facet catches the light at its own angle.
    bumpScale: 0.25,
    // Above 1 the stones outshine the flat gold around them, which is what
    // makes them read as stones rather than as a rough metal.
    envMapIntensity: 2.2,
  },
  edge: { color: "#f6c65a", metalness: 1, roughness: 0.12, envMapIntensity: 1.4 },
}

export default function Header() {
  return (
    <Header3D
      headline="Welcome to your new life"
      subline="we offer the best only for the best"
      material={DIAMOND_AND_GOLD}
      // A Spencerian script, unsqueezed and untracked: its letters are drawn to
      // join, and mixed case rather than caps for the same reason.
      font={FONTS.script}
      condense={1}
      letterSpacing={0}
      // Shallow: a script's strokes are thin, and a deep extrusion turns them
      // into tubes seen end-on.
      depth={0.4}
      // A wide chamfer: the gold rim around each stone-set face is the whole
      // effect, so it needs room.
      bevel={0.05}
    />
  )
}
