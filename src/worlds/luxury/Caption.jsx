import SharedCaption from "../../shared/Caption"
import { captionRef } from "./captionRef"

const LINES = ["made with", "gold, puppies", "and luxury"]

export default function Caption() {
  return <SharedCaption lines={LINES} color="#ffe000" elRef={captionRef} />
}
