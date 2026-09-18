import { useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { PointerProjector } from "../../shared/usePointer"
import { DogsPhysics, createDogs } from "../../shared/physics"
import { DEFAULT_CALM } from "../../shared/repulsion"
import { DogSelector } from "../../shared/useDogSelection"
import Dog from "../../shared/Dog"
import RiverBackground from "../../shared/RiverBackground"
import TextColorSampler from "../../shared/TextColorSampler"
import Header from "./Header"
import { captionRef } from "./captionRef"
import { makeGoldMaterial } from "./material"

const COUNT = 12
const PLANE_Z = -40

// Blue kept near zero to avoid blend artifacts.
const GOLD = {
  stops: [
    [0.04, 0.02, 0.0], // darkest bronze
    [0.18, 0.1, 0.0], // deep amber
    [0.42, 0.28, 0.01], // warm gold
    [0.7, 0.54, 0.03], // bright gold
    [0.85, 0.72, 0.05], // white gold highlight
  ],
  base: [0.01, 0.008, 0.002],
}

export default function Scene({ selectionRef, config }) {
  const { viewport, camera } = useThree()
  const { width: hw2, height: hh2 } = viewport.getCurrentViewport(camera, [0, 0, PLANE_Z])
  const hw = hw2 / 2
  const hh = hh2 / 2

  const physicsRef = useRef(createDogs({ count: COUNT, hw2, hh2, z: PLANE_Z }))

  const physicsConfig = useMemo(
    () => ({
      collisionRadius: 0.75,
      // Keeps dogs off the bottom-right caption.
      barriers: [{ x0: hw * 0.55, y0: -hh, x1: hw, y1: -hh * 0.55 }],
      repulsionRadius: 4.5,
      repulsionGain: 0.06,
      // A slow pointer inside the loupe's glass is inspecting, not shooing, so
      // a dog stays catchable for the whole 500ms dwell instead of being shoved
      // out of the 4.0 selection radius before it can lock. Spread rather than
      // restated: this world tunes the repulsion above, not the damping.
      ...DEFAULT_CALM,
    }),
    [hw, hh],
  )

  return (
    <>
      <color attach="background" args={["#0a0800"]} />
      <ambientLight intensity={0.2} />
      <spotLight position={[10, 10, 10]} intensity={1} />
      <PointerProjector planeZ={PLANE_Z} />
      <RiverBackground palette={GOLD} />
      <Environment preset="sunset" />
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
          makeMaterial={makeGoldMaterial}
          scale={0.117}
          selectedScale={0.216}
          lift={3.5}
        />
      ))}
      <TextColorSampler targetRef={captionRef} light="#ffe000" threshold={0.25} />
    </>
  )
}
