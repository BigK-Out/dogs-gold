// Plain .js, not inside Header3D.jsx, so these non-component exports never
// touch react-refresh's rule — the same reason luxury/captionRef.js exists.
//
// `sans` and `serif` ship with three (60KB and 109KB). `script` is Great Vibes,
// converted from the Google Fonts TTF into three's typeface format and checked
// in at 120KB; its licence sits beside it as great-vibes-OFL.txt. The
// Coca-Cola logotype itself is a trademark, so this is a Spencerian script of
// the same family of shapes rather than that lettering.
import sans from "three/examples/fonts/helvetiker_bold.typeface.json"
import serif from "three/examples/fonts/optimer_bold.typeface.json"
import script from "./fonts/great-vibes.typeface.json"

export const FONTS = { sans, serif, script }
