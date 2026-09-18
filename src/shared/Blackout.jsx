import { useEffect, useRef } from "react"
import { blackoutAt } from "./flicker"

// Cuts the whole page to black and back as a world arrives — the lights
// failing, rather than a transition.
//
// DOM rather than in-scene: the caption, the arrows and the instrument have to
// go dark too, and only an overlay above them can do that. It sits below the
// shell's curtain, which owns the fade between worlds.
//
// Timed from mount, which is the moment the world arrives, and written straight
// to the element each frame rather than through React state.
export default function Blackout({ pattern }) {
  const ref = useRef()

  useEffect(() => {
    const startedAt = performance.now()
    let id
    const tick = () => {
      if (ref.current) {
        ref.current.style.opacity = blackoutAt(performance.now() - startedAt, pattern)
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [pattern])

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        opacity: 1,
        pointerEvents: "none",
        // Above the instrument at 9999 — the flashlight goes out with
        // everything else — and below the shell's curtain at 10000.
        zIndex: 9999,
      }}
    />
  )
}
