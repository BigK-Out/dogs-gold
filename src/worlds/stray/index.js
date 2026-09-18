// src/worlds/stray/index.js
import Scene from "./Scene"
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
  Overlay,
  Card: Record,
  cardStyle: recordStyle,

  modelUrl: MODEL_URL,

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
