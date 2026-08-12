import { useEffect, useRef, useState } from "react"
import { pointer } from "../hooks/usePointer"
import { credsFor } from "./creds"
import { GLASS_RADIUS_PX } from "./Loupe"
import { LOCKED } from "./selection"

const CARD_WIDTH = 250
const GAP = 28

export default function CredsCard({ selectionRef }) {
  const boxRef = useRef()
  // Only the locked index lives in React state — it changes rarely. Position
  // is written straight to the DOM each frame to avoid re-rendering at 60fps.
  const [lockedIndex, setLockedIndex] = useState(null)

  useEffect(() => {
    let id
    const tick = () => {
      const sel = selectionRef.current
      const next = sel.phase === LOCKED ? sel.index : null
      setLockedIndex((prev) => (prev === next ? prev : next))

      if (boxRef.current) {
        // Default to the LEFT of the glass: the loupe's handle juts out to the
        // lower right, so a right-hand card would sit on top of it. Flip to
        // the right only when there is no room on the left.
        const leftX = pointer.smooth.x - GLASS_RADIUS_PX - GAP - CARD_WIDTH
        const x = leftX < 16
          ? pointer.smooth.x + GLASS_RADIUS_PX + GAP
          : leftX
        const y = Math.min(
          Math.max(pointer.smooth.y - 60, 16),
          window.innerHeight - 220,
        )
        boxRef.current.style.transform = `translate(${x}px, ${y}px)`
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [selectionRef])

  const creds = lockedIndex === null ? null : credsFor(lockedIndex)

  return (
    <div
      ref={boxRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: CARD_WIDTH,
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 9998,
        opacity: creds ? 1 : 0,
        transition: "opacity 250ms ease",
        willChange: "transform, opacity",
        background: "rgba(10, 8, 0, 0.82)",
        border: "1px solid rgba(255, 224, 0, 0.35)",
        padding: "1rem 1.15rem",
        fontFamily: "'Josefin Sans', sans-serif",
        color: "#ffe000",
        fontSize: "0.68rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        lineHeight: 2,
      }}
    >
      {creds && (
        <>
          <div style={{ fontSize: "0.95rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
            {creds.name}
          </div>
          <Row label="Age" value={`${creds.age} yrs`} />
          <Row label="Origin" value={creds.location} />
          <Row label="Pedigree" value={creds.pedigree} />
          <Row label="Grade" value={creds.grade} />
          <Row label="Cert" value={creds.certificate} />
          <Row label="Value" value={creds.price} />
        </>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span style={{ opacity: 0.55 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
