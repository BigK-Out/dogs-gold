// src/worlds/stray/index.js
import Scene from "./Scene"
import Flashlight from "./Flashlight"
import Overlay from "./Overlay"
import Record, { recordStyle } from "./Record"
import flashlightPng from "./flashlight.png"

const MODEL_URL = `${import.meta.env.BASE_URL}lowerclassdog.glb`

export default {
  id: "stray",
  label: "Stray",
  pageBackground: "#0f1112",
  camera: { fov: 80, near: 0.01, far: 110 },

  Scene,
  // Replaces the shared positioner: this one carries a beam as well as art.
  Instrument: Flashlight,
  Overlay,
  Card: Record,
  cardStyle: recordStyle,

  modelUrl: MODEL_URL,

  // The shell's ripple pass reads this. Only the dark world blooms: the strip
  // light over the headline is the one thing here bright enough to bleed, and
  // the threshold is set above everything else so nothing else does. Defined
  // out here rather than inline in the JSX so its identity is stable across
  // renders — the pass chain is rebuilt whenever it changes.
  bloom: {
    intensity: 1.15,
    luminanceThreshold: 0.86,
    luminanceSmoothing: 0.22,
    mipmapBlur: true,
    radius: 0.82,
  },

  // A flashlight standing on end, held so its lens sits under the pointer.
  // Measured from the art, which is 1500x2500: the lens is centred across the
  // width and its middle sits 362px down, so cy is 362/1500. Every ratio is
  // against the width, which is why cy is well under 1 on art this tall.
  instrument: {
    src: flashlightPng,
    size: 120,
    aspect: 2500 / 1500,
    cx: 0.5,
    cy: 0.241,
    // The lens itself, which is what the card is kept clear of.
    radius: 0.17,
  },
  selection: { radius: 4.0, releaseMargin: 1.0, dwellMs: 400 },
}
