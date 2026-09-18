import * as THREE from "three"
import { useEffect, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Center, Resize, Text3D } from "@react-three/drei"
// Ships with three, so no asset to serve and no BASE_URL to get wrong. The
// bundled JSON is ~60KB.
import font from "three/examples/fonts/helvetiker_bold.typeface.json"
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

function Line({ text, y, width, material, depth, letterSpacing, bevel }) {
  return (
    <Center position={[0, y, 0]}>
      <group scale={width}>
        {/* Resize normalises the line to one unit wide, so the scale above is
            the line's width in world units regardless of how much it says. */}
        <Resize width>
          <group scale={[CONDENSE, 1, 1]}>
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
// `material` is the look: `{ color, metalness, roughness, emissive }`.
// `opacityRef` is optional — a ref holding 0..1, read every frame, for a world
// that cross-fades one header into another.
export default function Header3D({
  headline,
  subline,
  material: look,
  headlineWidth = HEADLINE_WIDTH,
  z = HEADER_Z,
  opacityRef,
}) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        ...look,
        // Transparency costs a sort and is only needed while cross-fading.
        transparent: Boolean(opacityRef),
        opacity: opacityRef ? opacityRef.current : 1,
      }),
    [look, opacityRef],
  )

  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    if (opacityRef) material.opacity = opacityRef.current
  })

  return (
    // Tilted so the tops lean away and the camera, at the centre of the
    // screen, looks up at the undersides of the letters.
    <group position={[0, 0, z]} rotation={[TILT, 0, 0]}>
      <Line
        text={headline}
        y={HEADLINE_Y}
        width={headlineWidth}
        material={material}
        depth={0.85}
        letterSpacing={0.08}
        bevel={0.035}
      />
      {subline && (
        <Line
          text={subline}
          y={SUBLINE_Y}
          width={SUBLINE_WIDTH}
          material={material}
          depth={0.6}
          letterSpacing={0.12}
          bevel={0.04}
        />
      )}
    </group>
  )
}
