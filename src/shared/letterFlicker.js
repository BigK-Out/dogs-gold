// Lets a line of extruded text burn each letter at its own brightness.
//
// Text3D builds a line as one mesh, so a material cannot tell one letter from
// the next — only where on the line a fragment is. That is enough: the cell each
// character occupies is known from the font, so the shader finds the cell a
// fragment falls in and scales by that letter's level. The levels are a plain
// array the world rewrites every frame.
//
// Plain .js so the non-component exports stay out of react-refresh's rule, the
// same reason headerFonts.js is.

// Cells and levels are fixed-size uniform arrays, so a line can be at most this
// long. The longest line in any world is 34 characters.
export const MAX_LETTERS = 48

export function letterLevels() {
  return new Float32Array(MAX_LETTERS).fill(1)
}

// Where each character's cell begins, in the line's own units (letters one unit
// tall). Cells are per character, spaces included, so a letter's cell is its
// index in the string. Three advances by the glyph's width plus the tracking,
// which is all this repeats — see FontLoader.generateShapes.
//
// The first cell reaches to -infinity, and the cells beyond the text start at
// +infinity, so nothing falls between them.
export function letterStarts(fontData, text, letterSpacing) {
  const { glyphs, resolution } = fontData
  const starts = new Float32Array(MAX_LETTERS).fill(1e9)
  let x = 0
  for (let i = 0; i < Math.min(text.length, MAX_LETTERS); i++) {
    starts[i] = i === 0 ? -1e9 : x
    const glyph = glyphs[text[i]] ?? glyphs["?"]
    x += (glyph?.ha ?? resolution * 0.5) / resolution + letterSpacing
  }
  return starts
}

// Scales the material's colour by the level of the letter each fragment is in.
// Applied to the diffuse colour, so it is meant for an unlit material, where
// that is the whole of what is drawn.
export function burnPerLetter(material, starts, levels) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uStart = { value: starts }
    shader.uniforms.uLevel = { value: levels }

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vLineX;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLineX = position.x;")

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vLineX;
uniform float uStart[${MAX_LETTERS}];
uniform float uLevel[${MAX_LETTERS}];
float letterLevel(float x) {
  int at = 0;
  for (int i = 1; i < ${MAX_LETTERS}; i++) {
    if (x >= uStart[i]) at = i;
  }
  return uLevel[at];
}`,
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb *= letterLevel(vLineX);",
      )
  }
  // Every material carrying this patch compiles the same program; only the
  // uniforms differ, and those are set per material above.
  material.customProgramCacheKey = () => "burnPerLetter"
}
