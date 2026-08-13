import { useEffect, useRef, useState } from "react"
import { pointer } from "./usePointer"
import { instrumentGeometry } from "./Instrument"
import { LOCKED } from "./selection"

const CARD_WIDTH = 250
const GAP = 28

export default function Card({ selectionRef, instrument, Content, style }) {
  const boxRef = useRef()
  // Only the locked index lives in React state — it changes rarely. Position
  // is written straight to the DOM each frame to avoid re-rendering at 60fps.
  const [lockedIndex, setLockedIndex] = useState(null)
  const { radiusPx } = instrumentGeometry(instrument)

  useEffect(() => {
    let id
    const tick = () => {
      const sel = selectionRef.current
      const next = sel.phase === LOCKED ? sel.index : null
      setLockedIndex((prev) => (prev === next ? prev : next))

      if (boxRef.current) {
        // Default to the LEFT of the instrument: the loupe's handle juts out to
        // the lower right, so a right-hand card would sit on top of it. Flip to
        // the right only when there is no room on the left.
        const leftX = pointer.smooth.x - radiusPx - GAP - CARD_WIDTH
        const x = leftX < 16 ? pointer.smooth.x + radiusPx + GAP : leftX
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
  }, [selectionRef, radiusPx])

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
        opacity: lockedIndex === null ? 0 : 1,
        transition: "opacity 250ms ease",
        willChange: "transform, opacity",
        ...style,
      }}
    >
      {lockedIndex !== null && <Content index={lockedIndex} />}
    </div>
  )
}
