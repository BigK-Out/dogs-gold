import * as THREE from "three"
import { useEffect, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Center, Resize, Text3D } from "@react-three/drei"
import { FONTS } from "./headerFonts"
import {
  HEADER_Z,
  HEADLINE_Y,
  HEADLINE_WIDTH,
  SUBLINE_Y,
  SUBLINE_WIDTH,
} from "./headerLayout"

const TILT = -0.12

// Letters are squeezed horizontally into tower proportions: narrow, tall and
// deep. The extrusion is nearly as deep as the letters are tall, so the block
// reads as a skyline rather than as lettering with a thin edge.
const CONDENSE = 0.7

// One bevel segment is a hard chamfer, not a rounded edge, and few curve
// segments leave the round letters visibly faceted. Both keep the text rigid.
const EDGES = {
  bevelEnabled: true,
  bevelSegments: 1,
  curveSegments: 4,
  bevelOffset: 0,
}

function Line({ text, y, width, font, material, depth, letterSpacing, bevel, condense }) {
  return (
    <Center position={[0, y, 0]}>
      <group scale={width}>
        {/* Resize normalises the line to one unit wide, so the scale above is
            the line's width in world units regardless of how much it says. */}
        <Resize width>
          <group scale={[condense, 1, 1]}>
            <Text3D
              font={font}
              size={1}
              height={depth}
              material={material}
              letterSpacing={letterSpacing}
              bevelThickness={bevel}
              bevelSize={bevel * 0.75}
              {...EDGES}
            >
              {text}
            </Text3D>
          </group>
        </Resize>
      </group>
    </Center>
  )
}

// A world's message as extruded metal towers, standing in front of its dogs.
//
// `material` is the look — `{ color, metalness, roughness, emissive }` for one
// metal throughout, or `{ face, edge }` for two: extruded text carries its flat
// faces and its bevelled sides in separate material slots, so a dark face with
// a bright bevel reads as inlaid metal.
//
// `font` picks a typeface from FONTS, `condense` squeezes the letters
// horizontally, and `opacityRef` is optional — a ref holding 0..1, read every
// frame, for a world that cross-fades one header into another.
export default function Header3D({
  headline,
  subline,
  material: look,
  font = FONTS.sans,
  condense = CONDENSE,
  bevel = 0.035,
  // Script faces join letter to letter, so they want no tracking at all.
  letterSpacing = 0.08,
  // Extrusion, as a fraction of the letters' height. Deep enough to read as
  // towers for a grotesque; a script's thin strokes need far less.
  depth = 0.85,
  headlineWidth = HEADLINE_WIDTH,
  z = HEADER_Z,
  opacityRef,
}) {
  const material = useMemo(() => {
    // Slot 0 is the front and back faces, slot 1 the bevel and the sides.
    const looks = look.face || look.edge ? [look.face, look.edge] : [look]
    const built = looks.map(
      (one) =>
        new THREE.MeshStandardMaterial({
          ...one,
          // Transparency costs a sort and is only needed while cross-fading.
          transparent: Boolean(opacityRef),
          opacity: opacityRef ? opacityRef.current : 1,
        }),
    )
    return built.length === 1 ? built[0] : built
  }, [look, opacityRef])

  useEffect(() => {
    const built = Array.isArray(material) ? material : [material]
    return () => built.forEach((one) => one.dispose())
  }, [material])

  useFrame(() => {
    if (!opacityRef) return
    const built = Array.isArray(material) ? material : [material]
    for (const one of built) one.opacity = opacityRef.current
  })

  return (
    // Tilted so the tops lean away and the camera, at the centre of the
    // screen, looks up at the undersides of the letters.
    <group position={[0, 0, z]} rotation={[TILT, 0, 0]}>
      <Line
        text={headline}
        y={HEADLINE_Y}
        width={headlineWidth}
        font={font}
        condense={condense}
        material={material}
        depth={depth}
        letterSpacing={letterSpacing}
        bevel={bevel}
      />
      {subline && (
        <Line
          text={subline}
          y={SUBLINE_Y}
          width={SUBLINE_WIDTH}
          font={font}
          condense={condense}
          material={material}
          depth={depth * 0.7}
          letterSpacing={letterSpacing * 1.5}
          bevel={bevel * 1.1}
        />
      )}
    </group>
  )
}
