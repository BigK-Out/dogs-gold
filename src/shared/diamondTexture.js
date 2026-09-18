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

// Each stone's crown: high at the table, falling away to the girdle. Drawn
// where the stone is stamped rather than derived from the photograph, because a
// bright facet in the photograph is not necessarily a raised one — which is why
// reading height from brightness alone left the pavé looking flat.
function stampCrown(ctx, x, y, size) {
  const half = size / 2
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const px = x + dx * SIZE
      const py = y + dy * SIZE
      if (px + half < 0 || px - half > SIZE || py + half < 0 || py - half > SIZE) continue
      const crown = ctx.createRadialGradient(px, py, 0, px, py, half)
      crown.addColorStop(0, "#ffffff")
      crown.addColorStop(0.45, "#c8c8c8")
      crown.addColorStop(0.9, "#3c3c3c")
      crown.addColorStop(1, "#000000")
      ctx.fillStyle = crown
      ctx.beginPath()
      ctx.arc(px, py, half, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function paint(image, color, rough, height) {
  color.fillStyle = SETTING
  color.fillRect(0, 0, SIZE, SIZE)
  height.fillStyle = "#000000"
  height.fillRect(0, 0, SIZE, SIZE)

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
      stampCrown(height, x, y, size)
    }
  }

  const pixels = color.getImageData(0, 0, SIZE, SIZE).data
  const crowns = height.getImageData(0, 0, SIZE, SIZE).data
  const shine = rough.createImageData(SIZE, SIZE)
  const surface = new Float32Array(SIZE * SIZE)

  for (let p = 0; p < SIZE * SIZE; p++) {
    const i = p * 4
    const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
    // Bright facet: polished. Dark seam: matte.
    const smooth = Math.max(0, 255 - lum * 1.25)
    shine.data[i] = shine.data[i + 1] = shine.data[i + 2] = smooth
    shine.data[i + 3] = 255
    // The crown carries the shape; the photograph's own facets ripple across
    // it, so each stone has cut faces rather than being a smooth dome.
    surface[p] = (crowns[i] * 0.78 + lum * 0.22) / 255
  }
  rough.putImageData(shine, 0, 0)

  // A normal map from that surface, rather than handing three a bump map: a
  // real normal tilts the light across each stone's slopes, which is what makes
  // a facet catch and lose the environment as the scene moves.
  const at = (x, y) => surface[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]
  const normals = height.createImageData(SIZE, SIZE)
  const STEEPNESS = 6
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * STEEPNESS
      const dy = (at(x, y + 1) - at(x, y - 1)) * STEEPNESS
      const len = Math.hypot(-dx, -dy, 1)
      const i = (y * SIZE + x) * 4
      normals.data[i] = ((-dx / len) * 0.5 + 0.5) * 255
      normals.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      normals.data[i + 2] = (1 / len) * 0.5 * 255 + 127.5
      normals.data[i + 3] = 255
    }
  }
  height.putImageData(normals, 0, 0)
}

// One set for the whole app: they never change, and the worlds that use them
// mount and unmount repeatedly. The canvases are returned at once and filled in
// when the stone arrives, so nothing waits on the image.
export function diamondTexture() {
  if (maps) return maps

  const [colorEl, color] = canvas()
  const [roughEl, rough] = canvas()
  const [normalEl, normal] = canvas()
  color.fillStyle = SETTING
  color.fillRect(0, 0, SIZE, SIZE)
  // Flat until the stone arrives: straight up in normal-map encoding.
  normal.fillStyle = "#8080ff"
  normal.fillRect(0, 0, SIZE, SIZE)

  maps = {
    color: texture(colorEl, true),
    roughness: texture(roughEl, false),
    normal: texture(normalEl, false),
  }

  const image = new Image()
  image.onload = () => {
    paint(image, color, rough, normal)
    maps.color.needsUpdate = true
    maps.roughness.needsUpdate = true
    maps.normal.needsUpdate = true
  }
  image.src = stoneUrl

  return maps
}
