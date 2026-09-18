// Where a world's 3D header sits, and the hole it needs kept clear behind it.
// Plain .js, imported by both Header3D.jsx and the worlds' physics config —
// see luxury/captionRef.js for why non-component exports live outside .jsx.

// The dogs live at z = -40; the header sits well in front of them. At this
// distance the camera's 80° field of view spans ~30 world units vertically.
export const HEADER_Z = -18

// Centred on screen: the headline sits just above the eye line, the sub-line
// just below it, so the pair straddles the middle of the viewport.
export const HEADLINE_Y = 1.1
export const SUBLINE_Y = -2.6

// Each line is scaled to these widths whatever it says, so a long headline and
// a short one are equally wide and two headlines can cross-fade in place.
export const HEADLINE_WIDTH = 42
export const SUBLINE_WIDTH = 17

// The block the lettering occupies at HEADER_Z, with a little margin. The
// vertical extents are measured from the rendered lines rather than derived:
// the letter heights depend on how much each headline says, since every line is
// scaled to a fixed width.
const BLOCK = { halfWidth: HEADLINE_WIDTH / 2 + 1, top: 2.9, bottom: -3.5 }

// The same block as seen from the camera, on the dog plane: a dog anywhere in
// this box would pass behind the lettering. Worlds feed it to the physics loop
// as a barrier, which keeps a dog's whole body out, not just its centre.
//
// Both z values are negative and measured from the camera, so the ratio is the
// factor by which the header's footprint grows over that extra distance.
export function headerBarrier(planeZ) {
  const spread = planeZ / HEADER_Z
  return {
    x0: -BLOCK.halfWidth * spread,
    x1: BLOCK.halfWidth * spread,
    y0: BLOCK.bottom * spread,
    y1: BLOCK.top * spread,
  }
}
