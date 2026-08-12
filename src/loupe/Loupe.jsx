import { useEffect, useRef } from "react"
import { pointer } from "../shared/usePointer"
import lensUrl from "./loupe.png"

export const LOUPE_SIZE_PX = 260

// Measured from the asset's alpha channel (see Task 1). The source image is
// square, so every fraction is of LOUPE_SIZE_PX.
const GLASS_CX_RATIO = 0.359
const GLASS_CY_RATIO = 0.342
const GLASS_RADIUS_RATIO = 0.220

export const GLASS_CX_PX = LOUPE_SIZE_PX * GLASS_CX_RATIO
export const GLASS_CY_PX = LOUPE_SIZE_PX * GLASS_CY_RATIO
export const GLASS_RADIUS_PX = LOUPE_SIZE_PX * GLASS_RADIUS_RATIO

export default function Loupe() {
  const ref = useRef()

  useEffect(() => {
    let id
    const tick = () => {
      if (ref.current) {
        // Offset by the glass centre, not the image centre — the handle
        // occupies the lower right, so centring the PNG would put the handle
        // under the cursor.
        const x = pointer.smooth.x - GLASS_CX_PX
        const y = pointer.smooth.y - GLASS_CY_PX
        ref.current.style.transform = `translate(${x}px, ${y}px)`
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <img
      ref={ref}
      src={lensUrl}
      alt=""
      draggable={false}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: LOUPE_SIZE_PX,
        height: LOUPE_SIZE_PX,
        pointerEvents: "none",
        zIndex: 9999,
        willChange: "transform",
        display: "block",
      }}
    />
  )
}
