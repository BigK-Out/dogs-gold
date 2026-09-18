// A pavé of crushed gems, drawn once into a canvas and read as roughness and
// relief: thousands of small facets, each a different smoothness, so the
// environment glints off some and not others as the pointer and the scene move.
//
// Procedural rather than an image: nothing to serve, no BASE_URL to get wrong,
// and the facet size is a number rather than a re-export.
import * as THREE from "three"

const SIZE = 512
// Few and large. Extruded text lays its face UVs out in the letters' own units,
// so one tile covers roughly one letter height: at 6000 tiny facets each stone
// landed on a fraction of a pixel and the whole face averaged to flat white.
const FACETS = 420
const FACET_MIN = 12
const FACET_SPREAD = 26

let texture = null

function draw() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext("2d")

  // Mid grey is the surround between stones — a little rougher than the facets
  // themselves, so the stones read as set into metal.
  ctx.fillStyle = "#8a8a8a"
  ctx.fillRect(0, 0, SIZE, SIZE)

  for (let i = 0; i < FACETS; i++) {
    const x = Math.random() * SIZE
    const y = Math.random() * SIZE
    const r = FACET_MIN + Math.random() * FACET_SPREAD
    const sides = 3 + Math.floor(Math.random() * 3)
    const spin = Math.random() * Math.PI * 2
    // Mostly dark (smooth, mirror-like) with a scatter of bright, dull chips.
    const tone = Math.random() < 0.8 ? Math.random() * 70 : 150 + Math.random() * 105
    ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`

    ctx.beginPath()
    for (let s = 0; s < sides; s++) {
      const a = spin + (s / sides) * Math.PI * 2
      const reach = r * (0.6 + Math.random() * 0.4)
      const px = x + Math.cos(a) * reach
      const py = y + Math.sin(a) * reach
      if (s === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  }

  const map = new THREE.CanvasTexture(canvas)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  // One tile per letter height: the UVs already run in the letters' own units.
  map.repeat.set(1, 1)
  return map
}

// One texture for the whole app: it never changes, and the worlds that use it
// mount and unmount repeatedly.
export function diamondTexture() {
  if (!texture) texture = draw()
  return texture
}
