import Scene from "./Scene"
import Caption from "./Caption"
import Certificate, { certificateStyle } from "./Certificate"
import loupePng from "./loupe.png"

// Served from /vscodemainrepo/ on Pages, so a root-absolute path would 404 and
// leave an empty gold scene with no obvious error. BASE_URL always ends in "/".
const MODEL_URL = `${import.meta.env.BASE_URL}upgradeddog-v1-transformed.glb`

export default {
  id: "luxury",
  label: "Luxury",
  pageBackground: "#0a0800",
  camera: { fov: 80, near: 0.01, far: 110 },

  Scene,
  Overlay: Caption,
  Card: Certificate,
  cardStyle: certificateStyle,

  modelUrl: MODEL_URL,

  // Measured from the asset's alpha channel and confirmed at the machine.
  // Do not adjust: the glass is not at the image centre, because the handle
  // occupies the lower right.
  instrument: {
    src: loupePng,
    size: 260,
    cx: 0.359,
    cy: 0.342,
    radius: 0.220,
  },

  // Sized against the glass, not against the collision radius. The dog plane
  // spans ~67 world units over the viewport height, so the 57px glass ring is
  // ~4.8 units. Deriving this from COLLISION_RADIUS (0.75) put the hot zone at
  // ~14px and the glass selected nothing.
  selection: { radius: 4.0, releaseMargin: 1.0, dwellMs: 500 },
}
