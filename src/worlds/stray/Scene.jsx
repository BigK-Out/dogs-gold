// src/worlds/stray/Scene.jsx
import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { PointerProjector } from "../../shared/usePointer"
import { DogsPhysics, createDogs, DEFAULT_PHYSICS } from "../../shared/physics"
import { DogSelector } from "../../shared/useDogSelection"
import Dog from "../../shared/Dog"

const COUNT = 12
const PLANE_Z = -40

function makeStrayMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.08, 0.12, 0.22 + Math.random() * 0.12),
    roughness: 0.95,
    metalness: 0.0,
  })
}

export default function Scene({ selectionRef, config }) {
  const { viewport, camera } = useThree()
  const { width: hw2, height: hh2 } = viewport.getCurrentViewport(camera, [0, 0, PLANE_Z])
  const hw = hw2 / 2
  const hh = hh2 / 2

  const physicsRef = useRef(createDogs({ count: COUNT, hw2, hh2, z: PLANE_Z }))
  const physicsConfig = useMemo(() => ({ ...DEFAULT_PHYSICS }), [])

  return (
    <>
      <color attach="background" args={["#0f1112"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 7, 5]} intensity={0.7} />
      <PointerProjector planeZ={PLANE_Z} />
      <DogsPhysics
        physicsRef={physicsRef}
        count={COUNT}
        hw={hw}
        hh={hh}
        config={physicsConfig}
      />
      <DogSelector
        physicsRef={physicsRef}
        selectionRef={selectionRef}
        count={COUNT}
        selection={config.selection}
      />
      {Array.from({ length: COUNT }, (_, i) => (
        <Dog
          key={i}
          index={i}
          physicsRef={physicsRef}
          selectionRef={selectionRef}
          modelUrl={config.modelUrl}
          makeMaterial={makeStrayMaterial}
          scale={0.065}
          selectedScale={0.11}
          lift={3.0}
          selectedEmissive="#1a1c1e"
        />
      ))}
    </>
  )
}
