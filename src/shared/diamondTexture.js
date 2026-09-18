// A pavé built from one photographed stone, stamped many times: real facets,
// real glints, real colour fringes, which is what drawing polygons by hand
// could not give. The stone is a cut-out on transparency, so each stamp lands
// on the dark metal it is set into.
//
// Three maps come out of the one drawing. Colour carries the stones and the
// setting between them. Roughness and relief are read back from the stones'
// own brightness: a bright facet is polished and stands proud, the gaps are
// matte and sunken. They agree with the photograph because they come from it.
import * as THREE from "three"
import stoneUrl from "./textures/diamond.png"

const SIZE = 1024
// Stones per tile edge. One tile covers roughly one letter height, so this is
// how many stones run up a letter.
const GRID = 6
const CELL = SIZE / GRID
// The metal the stones are set into: dark, so every stone is outlined.
const SETTING = "#15171b"

let maps = null

function canvas() {
  const el = document.createElement("canvas")
  el.width = el.height = SIZE
  return [el, el.getContext("2d")]
}

function texture(el, srgb) {
  const map = new THREE.CanvasTexture(el)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  // One tile per letter height: extruded text lays its face UVs out in the
  // letters' own units.
  map.repeat.set(1, 1)
  map.anisotropy = 8
  if (srgb) map.colorSpace = THREE.SRGBColorSpace
  return map
}

// Stamps one stone, and again across whichever edges it overhangs, so the tile
// repeats without a seam.
function stamp(ctx, image, x, y, size, spin) {
  const half = size / 2
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const px = x + dx * SIZE
      const py = y + dy * SIZE
      if (px + half < 0 || px - half > SIZE || py + half < 0 || py - half > SIZE) continue
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(spin)
      ctx.drawImage(image, -half, -half, size, size)
      ctx.restore()
    }
  }
}

function paint(image, color, rough, bump) {
  color.fillStyle = SETTING
  color.fillRect(0, 0, SIZE, SIZE)

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      // Jittered grid: packed like a real pavé, but never in visible rows. Odd
      // rows are offset, the way stones are actually set.
      const stagger = gy % 2 === 0 ? 0 : CELL * 0.5
      const x = (gx + 0.5) * CELL + stagger + (Math.random() - 0.5) * CELL * 0.3
      const y = (gy + 0.5) * CELL + (Math.random() - 0.5) * CELL * 0.3
      // Overlapping slightly, so the setting shows as seams rather than gaps.
      const size = CELL * (1.05 + Math.random() * 0.35)
      stamp(color, image, x, y, size, Math.random() * Math.PI * 2)
    }
  }

  // Read the stones' brightness back out as the other two maps.
  const pixels = color.getImageData(0, 0, SIZE, SIZE)
  const shine = rough.createImageData(SIZE, SIZE)
  const height = bump.createImageData(SIZE, SIZE)
  for (let i = 0; i < pixels.data.length; i += 4) {
    const lum =
      pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114
    // Bright facet: polished, and standing proud. Dark gap: matte, and sunken.
    const smooth = Math.max(0, 255 - lum * 1.25)
    shine.data[i] = shine.data[i + 1] = shine.data[i + 2] = smooth
    height.data[i] = height.data[i + 1] = height.data[i + 2] = lum
    shine.data[i + 3] = height.data[i + 3] = 255
  }
  rough.putImageData(shine, 0, 0)
  bump.putImageData(height, 0, 0)
}

// One set for the whole app: they never change, and the worlds that use them
// mount and unmount repeatedly. The canvases are returned at once and filled in
// when the stone arrives, so nothing waits on the image.
export function diamondTexture() {
  if (maps) return maps

  const [colorEl, color] = canvas()
  const [roughEl, rough] = canvas()
  const [bumpEl, bump] = canvas()
  color.fillStyle = SETTING
  color.fillRect(0, 0, SIZE, SIZE)

  maps = {
    color: texture(colorEl, true),
    roughness: texture(roughEl, false),
    bump: texture(bumpEl, false),
  }

  const image = new Image()
  image.onload = () => {
    paint(image, color, rough, bump)
    maps.color.needsUpdate = true
    maps.roughness.needsUpdate = true
    maps.bump.needsUpdate = true
  }
  image.src = stoneUrl

  return maps
}
