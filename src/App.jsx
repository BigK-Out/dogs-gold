import { Suspense, useRef, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { startPointerTracking, PointerProjector } from "./shared/usePointer";
import Instrument from "./shared/Instrument";
import Card from "./shared/Card";
import { DogSelector } from "./shared/useDogSelection";
import { INITIAL } from "./shared/selection";
import Certificate, { certificateStyle } from "./worlds/luxury/Certificate";
import { DogsPhysics, createDogs } from "./shared/physics";
import Dog from "./shared/Dog";
import { makeGoldMaterial } from "./worlds/luxury/material";
import loupePng from "./worlds/luxury/loupe.png";
import DiamondBackground from "./worlds/luxury/background";
import RippleWarp from "./worlds/luxury/RippleWarp";
import TextColorSampler from "./worlds/luxury/TextColorSampler";
import Caption from "./worlds/luxury/Caption";

// Moves into world config in Task 8.
const LUXURY_INSTRUMENT = {
  src: loupePng,
  size: 260,
  cx: 0.359,
  cy: 0.342,
  radius: 0.220,
};

// --- Dog component ---

// Served from /vscodemainrepo/ on Pages, so a root-absolute path would 404 and
// leave an empty gold scene with no obvious error. BASE_URL always ends in "/".
const MODEL_URL = `${import.meta.env.BASE_URL}upgradeddog-v1-transformed.glb`;

// --- Scene ---

function Scene({ count = 50, selectionRef }) {
  const { viewport, camera } = useThree();
  const { width: hw2, height: hh2 } = viewport.getCurrentViewport(
    camera,
    [0, 0, -40],
  );
  const hw = hw2 / 2,
    hh = hh2 / 2;

  const physicsRef = useRef(
    createDogs({ count, hw2, hh2, z: -40 }),
  );

  const physicsConfig = useMemo(
    () => ({
      collisionRadius: 0.75,
      // Keeps dogs off the bottom-right caption.
      barriers: [{ x0: hw * 0.55, y0: -hh, x1: hw, y1: -hh * 0.55 }],
      repulsionRadius: 4.5,
      repulsionGain: 0.06,
    }),
    [hw, hh],
  );

  return (
    <>
      <color attach="background" args={["#0a0800"]} />
      <ambientLight intensity={0.2} />
      <spotLight position={[10, 10, 10]} intensity={1} />
      <Suspense fallback={null}>
        <PointerProjector planeZ={-40} />
        <DiamondBackground />
        <Environment preset="sunset" />
        <DogsPhysics
          physicsRef={physicsRef}
          count={count}
          hw={hw}
          hh={hh}
          config={physicsConfig}
        />
        <DogSelector
          physicsRef={physicsRef}
          selectionRef={selectionRef}
          count={count}
          selection={{ radius: 4.0, releaseMargin: 1.0, dwellMs: 500 }}
        />
        {Array.from({ length: count }, (_, i) => (
          <Dog
            key={i}
            index={i}
            physicsRef={physicsRef}
            selectionRef={selectionRef}
            modelUrl={MODEL_URL}
            makeMaterial={makeGoldMaterial}
            scale={0.065}
            selectedScale={0.12}
            lift={3.5}
          />
        ))}
        <RippleWarp />
        <TextColorSampler />
      </Suspense>
    </>
  );
}

// --- App ---

export default function App() {
  startPointerTracking();
  // Owned by App, not Scene: the credentials card lives outside the <Canvas>
  // and must read the same object the in-canvas selector writes.
  const selectionRef = useRef(INITIAL)

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0a0800",
        cursor: "none",
      }}
    >
      <Instrument instrument={LUXURY_INSTRUMENT} />
      <Canvas
        gl={{ alpha: false, preserveDrawingBuffer: true }}
        camera={{ near: 0.01, far: 110, fov: 80 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene selectionRef={selectionRef} />
      </Canvas>
      <Card
        selectionRef={selectionRef}
        instrument={LUXURY_INSTRUMENT}
        Content={Certificate}
        style={certificateStyle}
      />
      <Caption />
    </div>
  );
}
