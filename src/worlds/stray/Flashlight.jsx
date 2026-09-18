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
          // A wedge: a point at the lens, its full width at the far end.
          clipPath: "polygon(50% 100%, 100% 0%, 0% 0%)",
          background:
            "linear-gradient(to top, rgba(219, 234, 255, 0.5) 0%, rgba(206, 226, 255, 0.22) 45%, rgba(200, 222, 255, 0) 100%)",
          // Adds to what is behind it, the way light does.
          mixBlendMode: "screen",
          filter: "blur(10px)",
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
