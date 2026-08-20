import { useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { PointerProjector } from "../../shared/usePointer"
import { DogsPhysics, createDogs } from "../../shared/physics"
import { DEFAULT_CALM } from "../../shared/repulsion"
import { DogSelector } from "../../shared/useDogSelection"
import Dog from "../../shared/Dog"
import DiamondBackground from "./background"
import RippleWarp from "./RippleWarp"
import TextColorSampler from "./TextColorSampler"
import { makeGoldMaterial } from "./material"

const COUNT = 50
const PLANE_Z = -40

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
      <DiamondBackground />
      <Environment preset="sunset" />
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
          scale={0.065}
          selectedScale={0.12}
          lift={3.5}
        />
      ))}
      <RippleWarp />
      <TextColorSampler />
    </>
  )
}
