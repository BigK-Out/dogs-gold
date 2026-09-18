// src/worlds/middle/index.js
import Scene from "./Scene"
import Caption from "./Caption"
import Record, { recordStyle } from "./Record"
import pencilPng from "./pencil.png"

const MODEL_URL = `${import.meta.env.BASE_URL}middleclass1dog.glb`

export default {
  id: "middle",
  label: "Middle Class",
  pageBackground: "#2b2722",
  camera: { fov: 80, near: 0.01, far: 110 },

  Scene,
  Overlay: Caption,
  Card: Record,
  cardStyle: recordStyle,

  modelUrl: MODEL_URL,

  // A pencil, held by its point: the pointer is where it would touch the page,
  // and the body runs away up and to the right. Measured from the art, which is
  // cropped to the drawn pixels and 400x733: the tip is the lowest opaque
  // point, 10px in from the left. Every ratio is against the width, so cy is
  // well over 1 on art this tall. The radius is the tip's own, which is all the
  // card is kept clear of.
  instrument: {
    src: pencilPng,
    size: 100,
    aspect: 733 / 400,
    cx: 0.024,
    cy: 1.822,
    radius: 0.1,
  },
  selection: { radius: 4.0, releaseMargin: 1.0, dwellMs: 450 },
}
