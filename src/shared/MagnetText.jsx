import * as THREE from "three"
import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Text3D, useFont } from "@react-three/drei"
import { pointer } from "./usePointer"

// A line spelled out in fridge magnets: one letter per mesh, each its own
// colour, each set down a little crooked by whoever put it there.
//
// The other headers are a single mesh, which is why they cannot do this — a
// mesh has one transform and one material slot per surface, and these letters
// disagree about both.

// Set down by hand, so nothing lines up: how far a letter may lean, ride up or
// down, and how much air may be left beside it, as fractions of letter height.
const TILT = 0.09
const RIDE = 0.05
const GAP = 0.06

// Each letter is held to its own spot by a spring, and shoved away from the
// pointer as it passes. The spring is what brings it back to exactly where it
// was, overshooting once or twice on the way — a magnet knocked and rocking
// flat again, rather than an animation played and rewound.
const SHOVE = 34 // how hard the pointer pushes
const TWIST = 30 // and how hard it spins the letter as it goes
const SPRING = 70 // how strongly the spot pulls the letter home
const DAMPING = 3.2 // how quickly the rocking dies out — well under the 16.7 that
                      // would stop it dead, so a knocked letter swings past
                      // its spot several times before settling

// A stable shuffle: the same line always comes out arranged the same way, so
// the letters do not rearrange themselves on every re-render.
function seeded(text) {
  let seed = 1
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export default function MagnetText({
  text,
  font,
  colors,
  material: look,
  depth = 0.25,
  bevel = 0.015,
  // How near the pointer a letter must be before it is shoved, in screen
  // pixels — about twice the loupe's glass.
  reach = 130,
}) {
  const parsed = useFont(font)
  const groupRef = useRef()
  const letterRefs = useRef([])
  const { camera, gl } = useThree()
  const screen = useMemo(() => new THREE.Vector3(), [])

  const letters = useMemo(() => {
    const random = seeded(text)
    const { glyphs, resolution } = parsed.data
    const out = []
    let x = 0

    for (const char of text) {
      const glyph = glyphs[char] ?? glyphs["?"]
      const advance = (glyph?.ha ?? resolution * 0.5) / resolution
      if (char !== " ") {
        out.push({
          char,
          x,
          width: advance,
          tilt: (random() - 0.5) * 2 * TILT,
          lift: (random() - 0.5) * 2 * RIDE,
          color: colors[Math.floor(random() * colors.length)],
          // Which way it happens to turn when shoved, so a row knocked from one
          // side does not pivot as one.
          spinSense: random() < 0.5 ? -1 : 1,
        })
      }
      x += advance + GAP * random()
    }
    return out
  }, [text, parsed, colors])

  // One material per colour, not per letter: a dozen letters may share a red.
  const materials = useMemo(() => {
    const byColor = new Map()
    for (const color of colors) {
      byColor.set(
        color,
        new THREE.MeshPhysicalMaterial({
          color,
          metalness: 0,
          // Moulded plastic: soft sheen, no reflection to speak of.
          roughness: 0.55,
          clearcoat: 0.35,
          clearcoatRoughness: 0.4,
          ...look,
        }),
      )
    }
    return byColor
  }, [colors, look])

  useEffect(() => {
    return () => materials.forEach((material) => material.dispose())
  }, [materials])

  // How far each letter is currently knocked from its own spot, and how fast it
  // is travelling back. Rest is always zero, so a letter can only ever return
  // to where it was set down.
  const knocked = useRef([])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return
    // A long frame — a backgrounded tab — must not fling the letters away.
    const dt = Math.min(delta, 0.05)
    const rect = gl.domElement.getBoundingClientRect()

    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i]
      const mesh = letterRefs.current[i]
      if (!mesh) continue

      const off = (knocked.current[i] ??= { x: 0, y: 0, spin: 0, vx: 0, vy: 0, vspin: 0 })

      // Measured on screen rather than on the lettering's own plane: the
      // header is tilted, normalised to a width and scaled again, so working
      // in its local space made the reach impossible to reason about. A
      // distance in pixels is the same number the pointer is given in.
      //
      // Taken from where the letter belongs, not where it currently is, so a
      // letter being pushed cannot chase itself.
      screen.set(letter.x + letter.width / 2, 0.35, 0)
      screen.applyMatrix4(group.matrixWorld).project(camera)
      const sx = ((screen.x + 1) / 2) * rect.width
      const sy = ((1 - screen.y) / 2) * rect.height

      let shoveX = 0
      let shoveY = 0
      let twist = 0
      const dx = sx - (pointer.smooth.x - rect.left)
      const dy = sy - (pointer.smooth.y - rect.top)
      const distance = Math.hypot(dx, dy)
      const reachIn = Math.max(0, 1 - distance / reach)
      if (reachIn > 0 && distance > 1e-4) {
        // Pushed directly away from the pointer, hardest at its centre. Screen
        // y runs down and the scene's runs up, hence the flip.
        const force = reachIn * reachIn * SHOVE
        shoveX = (dx / distance) * force
        shoveY = (-dy / distance) * force
        // Caught off centre, so it turns as it goes.
        twist = (dx / distance) * reachIn * reachIn * TWIST * letter.spinSense
      }

      off.vx += (shoveX - SPRING * off.x - DAMPING * off.vx) * dt
      off.vy += (shoveY - SPRING * off.y - DAMPING * off.vy) * dt
      off.vspin += (twist - SPRING * off.spin - DAMPING * off.vspin) * dt
      off.x += off.vx * dt
      off.y += off.vy * dt
      off.spin += off.vspin * dt

      mesh.position.set(letter.x + off.x, letter.lift + off.y, off.y * 0.15)
      mesh.rotation.z = letter.tilt + off.spin
    }
  })

  return (
    <group ref={groupRef}>
      {letters.map((letter, i) => (
        <Text3D
          key={`${letter.char}-${i}`}
          ref={(mesh) => (letterRefs.current[i] = mesh)}
          font={font}
          size={1}
          height={depth}
          material={materials.get(letter.color)}
          bevelEnabled
          bevelSegments={2}
          curveSegments={6}
          bevelOffset={0}
          bevelThickness={bevel}
          bevelSize={bevel}
          position={[letter.x, letter.lift, 0]}
          rotation={[0, 0, letter.tilt]}
        >
          {letter.char}
        </Text3D>
      ))}
    </group>
  )
}
