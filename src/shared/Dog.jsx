import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"

export default function Dog({
  index,
  physicsRef,
  selectionRef,
  modelUrl,
  nodeName = "dogmodel",
  makeMaterial,
  scale,
  selectedScale,
  lift,
  selectedEmissive = "#3a2a00",
  // Optional `(material, index) => void`, run every frame before the selection
  // glow — for a world that animates its dogs' look over time.
  animateMaterial,
}) {
  const ref = useRef()
  const { nodes, materials } = useGLTF(modelUrl)

  const node = nodes[nodeName]
  if (!node) {
    // Without this the mesh renders nothing and the world looks empty with no
    // error at all — the same silent failure mode as a 404'd model.
    throw new Error(
      `Dog: node "${nodeName}" not found in ${modelUrl}. ` +
        `Available nodes: ${Object.keys(nodes).join(", ")}`,
    )
  }

  // Each dog picks its material once, at mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => makeMaterial(index, materials), [])

  const emissiveTarget = useMemo(
    () => new THREE.Color(selectedEmissive),
    [selectedEmissive],
  )
  const emissiveOff = useMemo(() => new THREE.Color("#000000"), [])

  useFrame(() => {
    const d = physicsRef.current[index]
    if (!d || !ref.current) return

    const sel = selectionRef.current
    const isSelected = sel.index === index && sel.phase !== "idle"

    // One code path for select and release: everything follows the scale lerp,
    // so deselection is the same animation run backwards.
    const targetScale = isSelected ? selectedScale : scale
    const s = ref.current.scale.x + (targetScale - ref.current.scale.x) * 0.12
    ref.current.scale.setScalar(s)

    const grown = (s - scale) / (selectedScale - scale)
    ref.current.position.set(d.x, d.y, d.z + lift * grown)
    ref.current.rotation.set(d.rX, d.rY, d.rZ)

    if (animateMaterial) animateMaterial(material, index)

    if (material.emissive) {
      material.emissive.lerp(isSelected ? emissiveTarget : emissiveOff, 0.12)
    }
  }, 0)

  return (
    <mesh ref={ref} geometry={node.geometry} material={material} scale={scale} />
  )
}
