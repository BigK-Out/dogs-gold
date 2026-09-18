// src/worlds/middle/Scene.jsx
import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { PointerProjector } from "../../shared/usePointer"
import { DogsPhysics, createDogs, DEFAULT_PHYSICS } from "../../shared/physics"
import { DogSelector } from "../../shared/useDogSelection"
import Dog from "../../shared/Dog"
import RiverBackground from "../../shared/RiverBackground"
import { headerBarrier } from "../../shared/headerLayout"
import TextColorSampler from "../../shared/TextColorSampler"
import { captionRef } from "./captionRef"
import Header from "./Header"
import { CAPTION_LIGHT } from "./Caption"

const COUNT = 20
const PLANE_Z = -40

// This model is authored ~110x smaller than the luxury one: 0.065 / 0.11 there
// is 7.4 / 12.5 here at the same on-screen size, and these are 1.68x that.
const SCALE = 12.43
const SELECTED_SCALE = 21
// Half the model's longest axis, in its own units, read from the GLB bounds.
// Times SCALE it gives a collision circle a spinning dog's body never leaves,
// so dogs bump instead of clipping through each other — and it follows SCALE
// when the dogs are resized.
const MODEL_HALF_LENGTH = 0.535

// Cold slate silver — a step down from gold.
const PALETTE = {
  stops: [
    [0.015, 0.018, 0.02],
    [0.05, 0.058, 0.065],
    [0.12, 0.135, 0.15],
    [0.22, 0.24, 0.26],
    [0.3, 0.32, 0.34],
  ],
  base: [0.006, 0.007, 0.008],
}

// Polished silver. A fully metallic surface shows almost nothing but its
// reflections, so this depends on the <Environment> below — without it the dogs
// render near black.
function makeSilverMaterial() {
  return new THREE.MeshStandardMaterial({
    // A faint cool tint, varied a little per dog, like luxury's gold hues.
    color: new THREE.Color().setHSL(0.58, 0.06, 0.72 + Math.random() * 0.14),
    roughness: 0.18 + Math.random() * 0.1,
    metalness: 1.0,
  })
}

export default function Scene({ selectionRef, config }) {
  const { viewport, camera } = useThree()
  const { width: hw2, height: hh2 } = viewport.getCurrentViewport(camera, [0, 0, PLANE_Z])
  const hw = hw2 / 2
  const hh = hh2 / 2

  const physicsRef = useRef(createDogs({ count: COUNT, hw2, hh2, z: PLANE_Z }))
  const physicsConfig = useMemo(
    () => ({
      ...DEFAULT_PHYSICS,
      collisionRadius: SCALE * MODEL_HALF_LENGTH,
      // Keeps dogs off the bottom-right caption — the same box as luxury's.
      barriers: [
        { x0: hw * 0.55, y0: -hh, x1: hw, y1: -hh * 0.55 },
        // Keeps dogs from drifting behind the header.
        headerBarrier(PLANE_Z),
      ],
    }),
    [hw, hh],
  )

  return (
    <>
      <color attach="background" args={["#2b2722"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 6]} intensity={1.1} />
      <PointerProjector planeZ={PLANE_Z} />
      <RiverBackground palette={PALETTE} />
      {/* "city" rather than luxury's "sunset": neutral-cool light keeps the
          silver from reading as warm. */}
      <Environment preset="city" />
      <Header />
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
          makeMaterial={makeSilverMaterial}
          nodeName="model_1"
          scale={SCALE}
          selectedScale={SELECTED_SCALE}
          lift={3.0}
          selectedEmissive="#262a30"
        />
      ))}
      {/* 0.4 is where black and the silver give equal contrast against the
          background, so the flip always lands on the more legible colour. */}
      <TextColorSampler targetRef={captionRef} light={CAPTION_LIGHT} threshold={0.4} />
    </>
  )
}
