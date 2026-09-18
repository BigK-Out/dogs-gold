// src/worlds/stray/Beam.jsx
import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { pointer } from "../../shared/usePointer"

// What the flashlight actually lights.
//
// The cone the user sees is DOM, drawn over the canvas; it cannot light a dog,
// because nothing in the scene knows it is there. This is the other half: a
// spotlight standing between the camera and the pack, aimed wherever the lens
// is pointing, so a dog brightens as the beam crosses it.
export default function Beam({ planeZ, color = "#dbeaff", intensity = 2600 }) {
  const lightRef = useRef()
  // The light aims at this rather than at a position, which is how three
  // points a spotlight.
  const target = useMemo(() => new THREE.Object3D(), [])

  useFrame(() => {
    const aim = pointer.worldSmooth
    const light = lightRef.current
    if (!aim || !light) return

    target.position.set(aim.x, aim.y, planeZ)
    target.updateMatrixWorld()

    // Held out in front of the pack and a little short of the pointer, so the
    // beam strikes at an angle and its pool has an edge. Directly overhead
    // would light a disc with no shape to it.
    light.position.set(aim.x * 0.72, aim.y * 0.72 + 2, planeZ + 26)
  })

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={lightRef}
        target={target}
        color={color}
        intensity={intensity}
        // Tight, with a soft edge: a flashlight, not a floodlight.
        angle={0.32}
        penumbra={0.65}
        distance={90}
        decay={1.7}
      />
    </>
  )
}
