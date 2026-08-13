import { useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { captionRef } from "./captionRef"

export default function TextColorSampler() {
  const { gl } = useThree()
  const lastRun = useRef(0)
  const px = useRef(new Uint8Array(4))

  useFrame(() => {
    if (!captionRef.current) return
    // Each readPixels below forces a CPU/GPU sync. At ~6Hz the caption's
    // existing 0.5s colour transition hides the reduced rate entirely.
    const now = performance.now()
    if (now - lastRun.current < 160) return
    lastRun.current = now

    const rect = captionRef.current.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const ctx = gl.getContext()
    const h = gl.domElement.height

    // Sample a grid of 5 points across the text area
    const points = [
      [rect.left + rect.width * 0.5, rect.top + rect.height * 0.5],
      [rect.left + rect.width * 0.2, rect.top + rect.height * 0.3],
      [rect.left + rect.width * 0.8, rect.top + rect.height * 0.3],
      [rect.left + rect.width * 0.2, rect.top + rect.height * 0.7],
      [rect.left + rect.width * 0.8, rect.top + rect.height * 0.7],
    ]

    let totalLum = 0
    const buf = px.current
    for (const [x, y] of points) {
      ctx.readPixels(Math.round(x * dpr), Math.round(h - y * dpr), 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, buf)
      totalLum += (buf[0] * 0.299 + buf[1] * 0.587 + buf[2] * 0.114) / 255
    }

    const lum = totalLum / points.length
    captionRef.current.style.color = lum > 0.25 ? "#000000" : "#ffe000"
  })

  return null
}
