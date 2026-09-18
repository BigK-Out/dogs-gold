// src/worlds/middle/Header.jsx
import { Center, Resize } from "@react-three/drei"
import MagnetText from "../../shared/MagnetText"
import { FONTS } from "../../shared/headerFonts"
import {
  HEADER_Z,
  HEADLINE_Y,
  HEADLINE_WIDTH,
  SUBLINE_Y,
  SUBLINE_WIDTH,
} from "../../shared/headerLayout"

// The middle of the descent has no shine at all. Luxury is diamonds and gold,
// stray is rust and blood; this is moulded plastic on a fridge door, set out by
// hand and never quite straight. The flatness is the point.
const MAGNET_COLORS = [
  "#d8453b", // postbox red
  "#2f6fb8", // primary blue
  "#f0c53a", // school-bus yellow
  "#4a9a52", // grass green
  "#e2803a", // orange
  "#f2efe6", // off-white
]

const TILT = -0.12

export default function Header() {
  return (
    // Tilted like the other worlds', so the camera looks up at the letters.
    <group position={[0, 0, HEADER_Z]} rotation={[TILT, 0, 0]}>
      <Center position={[0, HEADLINE_Y, 0]}>
        <group scale={HEADLINE_WIDTH}>
          <Resize width>
            <MagnetText
              text="WELCOME TO A FAMILY OF FOUR"
              font={FONTS.sans}
              colors={MAGNET_COLORS}
            />
          </Resize>
        </group>
      </Center>

      <Center position={[0, SUBLINE_Y, 0]}>
        <group scale={SUBLINE_WIDTH}>
          <Resize width>
            <MagnetText
              text="we offer kibble and steak (if you are lucky)"
              font={FONTS.sans}
              colors={MAGNET_COLORS}
              // Thinner, like the small letters in the same set.
              depth={0.2}
            />
          </Resize>
        </group>
      </Center>
    </group>
  )
}
