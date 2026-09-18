// src/worlds/stray/Scene.jsx
import * as THREE from "three"
import { useCallback, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { PointerProjector } from "../../shared/usePointer"
import { DogsPhysics, createDogs, DEFAULT_PHYSICS } from "../../shared/physics"
import { DogSelector } from "../../shared/useDogSelection"
import Dog from "../../shared/Dog"
import RiverBackground from "../../shared/RiverBackground"
import { introStrength } from "../../shared/intro"
import TextColorSampler from "../../shared/TextColorSampler"
import { captionRef } from "./captionRef"
import { CAPTION_LIGHT } from "./Caption"
import Header from "./Header"
import { HELL_INTRO, HELL_DOG } from "./intro"

const COUNT = 28
const PLANE_Z = -40

// This model is authored ~110x smaller than the luxury one, so these are that
// model's 0.065 / 0.11 scaled to the same on-screen size, then 1.2x.
const SCALE = 8.64
const SELECTED_SCALE = 14.64
// Half the model's longest axis, in its own units, read from the GLB bounds.
// Times SCALE it gives a collision circle a spinning dog's body never leaves,
// so dogs bump instead of clipping through each other — and it follows SCALE
// when the dogs are resized.
const MODEL_HALF_LENGTH = 0.552

// Murky dirt-water brown: low saturation with a faint olive cast, and a dull
// top stop so the shimmer never reads as a highlight.
const PALETTE = {
  stops: [
    [0.02, 0.017, 0.01],
    [0.07, 0.058, 0.035],
    [0.15, 0.125, 0.075],
    [0.25, 0.21, 0.13],
    [0.33, 0.28, 0.18],
  ],
  base: [0.008, 0.007, 0.004],
}

// Dark brown with a subtle sheen: part metal, fairly rough, so it catches a soft
// glint rather than luxury's gold or middle class's mirror silver. The metal
// half reflects the dimmed <Environment> below.
function makeBrownMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(
      0.06 + Math.random() * 0.02,
      0.35 + Math.random() * 0.15,
      0.12 + Math.random() * 0.06,
    ),
    roughness: 0.45 + Math.random() * 0.1,
    metalness: 0.6,
  })
  // The dog's own look, kept so the intro can blend back to it exactly.
  material.userData.settledLook = {
    color: material.color.clone(),
    metalness: material.metalness,
    roughness: material.roughness,
  }
  return material
}

// Blends a dog from its own look toward HELL_DOG by the intro's strength.
function tintForIntro(material, strength) {
  // Once settled there is nothing left to blend; skip the writes.
  if (strength === 0 && material.userData.settled) return
  const own = material.userData.settledLook
  material.color.lerpColors(own.color, HELL_DOG.color, strength)
  material.metalness = own.metalness + (HELL_DOG.metalness - own.metalness) * strength
  material.roughness = own.roughness + (HELL_DOG.roughness - own.roughness) * strength
  material.userData.settled = strength === 0
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
      barriers: [{ x0: hw * 0.55, y0: -hh, x1: hw, y1: -hh * 0.55 }],
    }),
    [hw, hh],
  )

  // The intro's strength this frame, for the dogs. Measured from this Scene's
  // first frame, the same frame RiverBackground starts its own clock on, so the
  // dogs and the water turn red and settle together.
  const introRef = useRef(1)
  const introStartedAt = useRef(null)
  useFrame((state) => {
    const now = state.clock.elapsedTime
    if (introStartedAt.current === null) introStartedAt.current = now
    introRef.current = introStrength((now - introStartedAt.current) * 1000, HELL_INTRO)
  }, -0.25) // after selection (-0.5), before Dog (0)
  const animateMaterial = useCallback(
    (material) => tintForIntro(material, introRef.current),
    [],
  )

  return (
    <>
      <color attach="background" args={["#0f1112"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 7, 5]} intensity={0.7} />
      <PointerProjector planeZ={PLANE_Z} />
      <RiverBackground palette={PALETTE} intro={HELL_INTRO} />
      {/* Dim, grimy light, turned down further so the brown only glints. */}
      <Environment preset="warehouse" environmentIntensity={0.6} />
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
          makeMaterial={makeBrownMaterial}
          animateMaterial={animateMaterial}
          nodeName="model_0"
          scale={SCALE}
          selectedScale={SELECTED_SCALE}
          lift={3.0}
          selectedEmissive="#2a1c10"
        />
      ))}
      {/* 0.33 is where black and the beige give equal contrast against the
          background, so the flip always lands on the more legible colour. */}
      <TextColorSampler targetRef={captionRef} light={CAPTION_LIGHT} threshold={0.33} />
    </>
  )
}
