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
    bumpMap: pave.bump,
    bumpScale: 0.12,
    envMapIntensity: 1.4,
    // A little light of its own, so the stones stay bright against the gold
    // rivers behind them rather than going grey in the scene's shadows.
    emissiveMap: pave.color,
    emissive: "#ffffff",
    emissiveIntensity: 0.18,
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
      depth={0.12}
      // The gold rim around each stone-set face: narrow, so it reads as a
      // setting holding the stones rather than as a gold letter.
      bevel={0.03}
    />
  )
}
