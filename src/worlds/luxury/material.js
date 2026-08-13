export function makeGoldMaterial(index, materials) {
  const mat = materials.skin.clone()
  mat.color.setHSL(
    0.11 + Math.random() * 0.06,
    0.7 + Math.random() * 0.3,
    0.35 + Math.random() * 0.35,
  )
  return mat
}
