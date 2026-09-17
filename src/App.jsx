import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { startPointerTracking } from "./shared/usePointer";
import { INITIAL as SELECTION_INITIAL } from "./shared/selection";
import Instrument from "./shared/Instrument";
import Card from "./shared/Card";
import RippleWarp from "./shared/RippleWarp";
import TextColorSampler from "./shared/TextColorSampler";
import { WORLDS } from "./worlds/registry";
import {
  nextNavigation,
  INITIAL as NAV_INITIAL,
  IDLE,
  COVERING,
  REVEALING,
} from "./shell/navigation";
import Curtain from "./shell/Curtain";
import Arrows from "./shell/Arrows";
import WorldReady from "./shell/WorldReady";
import ApplyCamera from "./shell/ApplyCamera";

const FADE_MS = 600;
// If a world never signals readiness, uncover anyway. A broken world must show
// itself as broken rather than trap the user behind an opaque curtain with the
// arrows unreachable.
const READY_CEILING_MS = 4000;

export default function App() {
  startPointerTracking();

  const [nav, setNav] = useState(NAV_INITIAL);
  const [ready, setReady] = useState(false);
  const selectionRef = useRef(SELECTION_INITIAL);
  const arrowsRef = useRef(null);

  const world = WORLDS[nav.index];
  const dispatch = useCallback(
    (action) => setNav((s) => nextNavigation(s, action, WORLDS.length)),
    [],
  );
  const go = useCallback((delta) => dispatch({ type: "go", delta }), [dispatch]);

  // A new world starts unready and inherits no selection from the last one.
  useEffect(() => {
    setReady(false);
    selectionRef.current = SELECTION_INITIAL;
  }, [nav.index]);

  // Covering: let the fade play out, then commit the swap behind it.
  useEffect(() => {
    if (nav.phase !== COVERING) return;
    const id = setTimeout(() => dispatch({ type: "covered" }), FADE_MS);
    return () => clearTimeout(id);
  }, [nav.phase, nav.pending, dispatch]);

  // Revealing: the ceiling that backs up the readiness signal.
  useEffect(() => {
    if (nav.phase !== REVEALING || ready) return;
    const id = setTimeout(() => setReady(true), READY_CEILING_MS);
    return () => clearTimeout(id);
  }, [nav.phase, ready]);

  // Revealing and ready: let the fade play out, then return to idle.
  useEffect(() => {
    if (nav.phase !== REVEALING || !ready) return;
    const id = setTimeout(() => dispatch({ type: "revealed" }), FADE_MS);
    return () => clearTimeout(id);
  }, [nav.phase, ready, dispatch]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onReady = useCallback(() => setReady(true), []);
  const covered = nav.phase === COVERING || (nav.phase === REVEALING && !ready);
  const Overlay = world.Overlay;
  // Optional world override: a world can supply its own Instrument to replace
  // the shared positioner entirely. The shared positioner is the default, not
  // a constraint.
  const InstrumentView = world.Instrument || Instrument;

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
      <InstrumentView instrument={world.instrument} />

      <Canvas
        gl={{ alpha: false, preserveDrawingBuffer: true }}
        camera={WORLDS[0].camera}
        style={{ width: "100%", height: "100%" }}
      >
        <ApplyCamera camera={world.camera} />
        {/* Keyed so switching worlds remounts the subtree rather than trying
            to reconcile two unrelated scenes. */}
        <Suspense key={world.id} fallback={null}>
          <world.Scene selectionRef={selectionRef} config={world} />
          <WorldReady onReady={onReady} />
        </Suspense>
        {/* Deliberately outside the keyed subtree, so it survives every world
            switch. The effect composer it owns cannot be unmounted without
            leaking its render targets — see shared/RippleWarp.jsx. */}
        <RippleWarp depthOfField={world.depthOfField} />
        {/* Every world needs it, so it lives with the shell. 0.46 is where
            white and black give equal contrast, so the label always takes the
            more legible of the two. */}
        <TextColorSampler targetRef={arrowsRef} light="#ffffff" threshold={0.46} />
      </Canvas>

      {world.Card && (
        <Card
          key={`card-${world.id}`}
          selectionRef={selectionRef}
          instrument={world.instrument}
          Content={world.Card}
          style={world.cardStyle}
        />
      )}

      {Overlay && <Overlay key={`overlay-${world.id}`} />}

      <Arrows
        index={nav.index}
        count={WORLDS.length}
        label={world.label}
        onGo={go}
        disabled={nav.phase !== IDLE}
        elRef={arrowsRef}
      />

      <Curtain opaque={covered} fadeMs={FADE_MS} />
    </div>
  );
}
