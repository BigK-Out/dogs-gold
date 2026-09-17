// src/worlds/middle/Caption.jsx
import SharedCaption from "../../shared/Caption"
import { captionRef } from "./captionRef"

const LINES = ["made with", "love, pups", "and kibble"]

// The starting colour. TextColorSampler in the Scene flips it to black over
// the pale rivers and back.
export const CAPTION_LIGHT = "#c9d0d6"

export default function Caption() {
  return <SharedCaption lines={LINES} color={CAPTION_LIGHT} elRef={captionRef} />
}
