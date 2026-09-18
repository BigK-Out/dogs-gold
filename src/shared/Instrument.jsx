import { useEffect, useRef } from "react"
import { pointer } from "./usePointer"

// The ratios are measured properties of each world's art: where the active
// point sits within the image, as a fraction of its width. The luxury loupe's
// handle occupies the lower right, so centring the PNG on the pointer would put
// the handle under the cursor instead of the glass.
//
// `size` is the art's width on screen; `aspect` is its height over its width,
// 1 for the square loupe and 1.67 for the flashlight standing on end. Every
// ratio stays measured against the width, so `cy` may exceed 1 on tall art.
export function instrumentGeometry({ size, cx, cy, radius, aspect = 1 }) {
  return {
    cxPx: size * cx,
    cyPx: size * cy,
    radiusPx: size * radius,
    heightPx: size * aspect,
  }
}

export default function Instrument({ instrument }) {
  const ref = useRef()
  const { cxPx, cyPx, heightPx } = instrumentGeometry(instrument)

  useEffect(() => {
    let id
    const tick = () => {
      if (ref.current) {
        const x = pointer.smooth.x - cxPx
        const y = pointer.smooth.y - cyPx
        ref.current.style.transform = `translate(${x}px, ${y}px)`
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [cxPx, cyPx])

  return (
    <img
      ref={ref}
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
  )
}
