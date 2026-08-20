// src/worlds/middle/Scene.jsx
import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { PointerProjector } from "../../shared/usePointer"
import { DogsPhysics, createDogs, DEFAULT_PHYSICS } from "../../shared/physics"
import { DogSelector } from "../../shared/useDogSelection"
import Dog from "../../shared/Dog"
import RippleWarp from "../../shared/RippleWarp"

const COUNT = 24
const PLANE_Z = -40

function makeMatteMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.09, 0.35, 0.3 + Math.random() * 0.2),
    roughness: 0.85,
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
      <color attach="background" args={["#2b2722"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 6]} intensity={1.1} />
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
          makeMaterial={makeMatteMaterial}
          scale={0.065}
          selectedScale={0.11}
          lift={3.0}
          selectedEmissive="#2a2620"
        />
      ))}
      <RippleWarp />
    </>
  )
}
