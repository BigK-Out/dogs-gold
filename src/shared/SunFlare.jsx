import * as THREE from "three"
import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { usePointerOnPlane } from "./pointerPlane"

// The glare itself: a blown-out core, a spray of rays and a soft halo, facing
// the camera, riding the pointer across the lettering.
//
// A light in the scene makes facets flash; it cannot make the sunburst you see
// when a stone throws light straight down the lens. That is glare, and it is
// drawn rather than lit — which is why this is a sprite and not a lamp.

const SIZE = 512
const MID = SIZE / 2
const RAYS = 56
const SPIKES = 4

function flareTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext("2d")

  // Black is nothing once the sprite blends additively, so the whole sheet
  // starts dark and only the glare is painted.
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.translate(MID, MID)

  const ray = (angle, length, width, alpha) => {
    ctx.save()
    ctx.rotate(angle)
    const fade = ctx.createLinearGradient(0, 0, length, 0)
    fade.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
    fade.addColorStop(0.25, `rgba(255, 250, 235, ${alpha * 0.35})`)
    fade.addColorStop(1, "rgba(255, 255, 255, 0)")
    ctx.fillStyle = fade
    // A needle: wide at the core, tapering to nothing.
    ctx.beginPath()
    ctx.moveTo(0, -width)
    ctx.lineTo(length, 0)
    ctx.lineTo(0, width)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // The spray: many fine rays at random angles and lengths.
  for (let i = 0; i < RAYS; i++) {
    ray(Math.random() * Math.PI * 2, MID * (0.35 + Math.random() * 0.6), 1 + Math.random() * 3, 0.5)
  }
  // Four long spikes, the ones the eye reads as "sun".
  for (let i = 0; i < SPIKES; i++) {
    ray((i / SPIKES) * Math.PI * 2 + Math.PI / 4, MID * 0.96, 5, 0.85)
  }

  // The halo: a wide, faint bloom around the core.
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, MID * 0.75)
  halo.addColorStop(0, "rgba(255, 255, 255, 0.55)")
  halo.addColorStop(0.35, "rgba(255, 244, 220, 0.12)")
  halo.addColorStop(1, "rgba(255, 255, 255, 0)")
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, 0, MID * 0.75, 0, Math.PI * 2)
  ctx.fill()

  // The core: small, and blown out to white.
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, MID * 0.14)
  core.addColorStop(0, "rgba(255, 255, 255, 1)")
  core.addColorStop(0.5, "rgba(255, 252, 242, 0.85)")
  core.addColorStop(1, "rgba(255, 255, 255, 0)")
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(0, 0, MID * 0.14, 0, Math.PI * 2)
  ctx.fill()

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  return map
}

// Ray casting against a contour, the same test the stones are scattered by.
function inside(points, x, y) {
  let hit = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]
    const b = points[j]
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      hit = !hit
    }
  }
  return hit
}

export default function SunFlare({ shapes, z, color = "#ffffff", size = 3.2, rise = 0.22, fall = 0.07 }) {
  const spriteRef = useRef()
  const pointerOnPlane = usePointerOnPlane()
  const strength = useRef(0)

  const map = useMemo(() => flareTexture(), [])
  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map,
        color,
        transparent: true,
        opacity: 0,
        // Additive, so the glare adds light to whatever is behind it instead of
        // covering it — which is how glare behaves.
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [map, color],
  )
  useEffect(() => {
    return () => {
      material.dispose()
      map.dispose()
    }
  }, [material, map])

  // The outlines, so the flare only lights where there are actually stones —
  // not in the gaps between letters.
  const outlines = useMemo(
    () => shapes.map((shape) => ({ outline: shape.getPoints(24), holes: shape.holes.map((h) => h.getPoints(24)) })),
    [shapes],
  )

  useFrame((state, delta) => {
    const sprite = spriteRef.current
    if (!sprite) return
    const near = pointerOnPlane(sprite.parent)

    let over = false
    if (near) {
      over = outlines.some(
        ({ outline, holes }) =>
          inside(outline, near.x, near.y) && !holes.some((h) => inside(h, near.x, near.y)),
      )
      sprite.position.set(near.x, near.y, z)
    }

    // Flares up fast, dies away slowly.
    const target = over ? 1 : 0
    strength.current += (target - strength.current) * (over ? rise : fall)

    material.opacity = strength.current
    // Slightly larger as it brightens, so it blooms rather than fades in.
    sprite.scale.setScalar(size * (0.55 + 0.45 * strength.current))
    // A slow turn, so the rays shimmer rather than sitting still.
    material.rotation += delta * 0.25
  })

  return <sprite ref={spriteRef} material={material} />
}
