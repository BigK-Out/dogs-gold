// src/shell/WorldReady.jsx
import { useEffect } from "react"

// Rendered as the last child inside the world's <Suspense>. Mounting at all
// proves the boundary resolved; the rAF gives the first draw a frame before we
// uncover. A timed reveal would uncover an empty scene whenever a model loads
// slowly — the same silent failure as a 404'd asset.
export default function WorldReady({ onReady }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => onReady())
    return () => cancelAnimationFrame(id)
  }, [onReady])

  return null
}
