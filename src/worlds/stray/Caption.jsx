// src/worlds/stray/Caption.jsx
import SharedCaption from "../../shared/Caption"
import { captionRef } from "./captionRef"

const LINES = ["made with", "abuse, curs", "and bins"]

// The starting colour. TextColorSampler in the Scene flips it to black over
// the pale rivers and back.
export const CAPTION_LIGHT = "#a89a7c"

export default function Caption() {
  return <SharedCaption lines={LINES} color={CAPTION_LIGHT} elRef={captionRef} />
}
