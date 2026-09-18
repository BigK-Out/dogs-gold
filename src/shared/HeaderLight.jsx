import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { pointer } from "./usePointer"

// A lamp carried at the pointer, a little in front of the lettering.
//
// Not emissive: paint on a stone is the same shade from every angle and reads
// as white smear. A light in the scene is caught by each stone's facets at its
// own angle, so one flares while its neighbour stays dark, and the flare moves
// as the stone turns.
export default function HeaderLight({ offset = 3, ...light }) {
  const ref = useRef()
  const { camera, gl } = useThree()

  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const plane = useMemo(() => new THREE.Plane(), [])
  const normal = useMemo(() => new THREE.Vector3(), [])
  const origin = useMemo(() => new THREE.Vector3(), [])
  const spin = useMemo(() => new THREE.Quaternion(), [])
  const hit = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const lamp = ref.current
    const header = lamp?.parent
    if (!header) return

    const rect = gl.domElement.getBoundingClientRect()
    // smooth, not raw: the instrument is drawn at the smoothed position, so the
    // light must sit under the glass rather than run ahead of it.
    ndc.x = ((pointer.smooth.x - rect.left) / rect.width) * 2 - 1
    ndc.y = -((pointer.smooth.y - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(ndc, camera)

    // The lettering's own plane, tilt included.
    header.getWorldPosition(origin)
    normal.set(0, 0, 1).applyQuaternion(header.getWorldQuaternion(spin)).normalize()
    plane.setFromNormalAndCoplanarPoint(normal, origin)
    if (!raycaster.ray.intersectPlane(plane, hit)) return

    header.worldToLocal(hit)
    // Standing off the face, so it lights the stones across their facets
    // instead of burning out the few directly beneath it.
    lamp.position.set(hit.x, hit.y, hit.z + offset)
  })

  return <pointLight ref={ref} {...light} />
}
