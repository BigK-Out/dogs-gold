// src/worlds/stray/Flashlight.jsx
import { useEffect, useRef } from "react"
import { pointer } from "../../shared/usePointer"
import { instrumentGeometry } from "../../shared/Instrument"

// The flashlight, and the cone it throws.
//
// A world may replace the shared instrument entirely, which is what this is
// for: the art alone is a picture of a flashlight, and a flashlight that is not
// lit is just a stick. The cone is DOM, drawn over the canvas and blended so it
// adds light rather than covering what is behind it — the beam's glare. What it
// falls on is lit by Beam, the spotlight inside the scene.

// The beam, as fractions of the art's width: how far it reaches and how wide it
// has spread by the time it gets there.
const REACH = 3.4
const SPREAD = 2.6

// The wedge as a conic gradient from the lens, opening upward: its half-angle
// is where the box's top corners sit, so the edges fall exactly on the corners.
const HALF = (Math.atan(SPREAD / 2 / REACH) * 180) / Math.PI
const EDGE = 9
const LIGHT = "rgb(212, 230, 255)"
const WEDGE = `conic-gradient(from ${-HALF}deg at 50% 100%, transparent 0deg, ${LIGHT} ${EDGE}deg, ${LIGHT} ${
  2 * HALF - EDGE
}deg, transparent ${2 * HALF}deg, transparent 360deg)`
// Brightest at the lens, gone by the far end.
const FALLOFF =
  "linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.22) 45%, rgba(0, 0, 0, 0) 100%)"

export default function Flashlight({ instrument }) {
  const bodyRef = useRef()
  const coneRef = useRef()
  const { cxPx, cyPx, heightPx } = instrumentGeometry(instrument)

  useEffect(() => {
    let id
    const tick = () => {
      const x = pointer.smooth.x - cxPx
      const y = pointer.smooth.y - cyPx
      if (bodyRef.current) {
        bodyRef.current.style.transform = `translate(${x}px, ${y}px)`
      }
      if (coneRef.current) {
        // Apex at the lens, which is where the pointer is.
        const width = instrument.size * SPREAD
        const height = instrument.size * REACH
        coneRef.current.style.transform = `translate(${pointer.smooth.x - width / 2}px, ${
          pointer.smooth.y - height
        }px)`
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [cxPx, cyPx, instrument.size])

  return (
    <>
      <div
        ref={coneRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: instrument.size * SPREAD,
          height: instrument.size * REACH,
          // A wedge: a point at the lens, its full width at the far end, with
          // the soft edges in the gradient itself. It was a clip-path over a
          // blur under a blend mode, and that stack drew the element's whole
          // box around the wedge whenever it moved.
          background: WEDGE,
          WebkitMaskImage: FALLOFF,
          maskImage: FALLOFF,
          pointerEvents: "none",
          // Under the flashlight itself at 9999, so the body covers the apex.
          zIndex: 9998,
          willChange: "transform",
        }}
      />
      <img
        ref={bodyRef}
        src={instrument.src}
        alt=""
        draggable={false}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: instrument.size,
          height: heightPx,
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform",
          display: "block",
        }}
      />
    </>
  )
}
