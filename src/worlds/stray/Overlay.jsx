// src/worlds/stray/Overlay.jsx
import Blackout from "../../shared/Blackout"
import Caption from "./Caption"
import { HELL_FLICKER } from "./intro"

// Everything this world puts on the page rather than in the scene: its
// signature, and the lights failing as it arrives.
export default function Overlay() {
  return (
    <>
      <Caption />
      <Blackout pattern={HELL_FLICKER} />
    </>
  )
}
