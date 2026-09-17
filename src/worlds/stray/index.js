// src/worlds/stray/index.js
import Scene from "./Scene"
import Caption from "./Caption"
import Record, { recordStyle } from "./Record"
// Placeholder art — replaced when the real instrument PNG is supplied. Its
// ratios are the loupe's, and must be re-measured for the real asset.
import instrumentPng from "../luxury/loupe.png"

const MODEL_URL = `${import.meta.env.BASE_URL}lowerclassdog.glb`

export default {
  id: "stray",
  label: "Stray",
  pageBackground: "#0f1112",
  camera: { fov: 80, near: 0.01, far: 110 },

  Scene,
  Overlay: Caption,
  Card: Record,
  cardStyle: recordStyle,

  modelUrl: MODEL_URL,

  instrument: { src: instrumentPng, size: 220, cx: 0.359, cy: 0.342, radius: 0.220 },
  selection: { radius: 4.0, releaseMargin: 1.0, dwellMs: 400 },
}
