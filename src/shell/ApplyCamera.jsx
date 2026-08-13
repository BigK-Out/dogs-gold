// src/shell/ApplyCamera.jsx
import { useEffect } from "react"
import { useThree } from "@react-three/fiber"

export default function ApplyCamera({ camera: config }) {
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    camera.fov = config.fov
    camera.near = config.near
    camera.far = config.far
    camera.updateProjectionMatrix()
  }, [camera, config.fov, config.near, config.far])

  return null
}
