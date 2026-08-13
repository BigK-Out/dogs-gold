import { useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { startPointerTracking } from "./shared/usePointer";
import { INITIAL } from "./shared/selection";
import Instrument from "./shared/Instrument";
import Card from "./shared/Card";
import { WORLDS } from "./worlds/registry";

export default function App() {
  startPointerTracking();
  const selectionRef = useRef(INITIAL);
  const world = WORLDS[0];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: world.pageBackground,
        cursor: "none",
      }}
    >
      <Instrument instrument={world.instrument} />
      <Canvas
        gl={{ alpha: false, preserveDrawingBuffer: true }}
        camera={world.camera}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <world.Scene selectionRef={selectionRef} config={world} />
        </Suspense>
      </Canvas>
      <Card
        selectionRef={selectionRef}
        instrument={world.instrument}
        Content={world.Card}
        style={world.cardStyle}
      />
      <world.Overlay />
    </div>
  );
}
