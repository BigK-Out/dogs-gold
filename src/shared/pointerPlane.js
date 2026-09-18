// Where the pointer falls on an object's own plane, in that object's own
// coordinates. The header is tilted and scaled, so screen coordinates have to
// be carried all the way in before anything can ask "which stone is under the
// glass".
import * as THREE from "three"
import { useCallback, useMemo } from "react"
import { useThree } from "@react-three/fiber"
import { pointer } from "./usePointer"

export function usePointerOnPlane() {
  const { camera, gl } = useThree()

  const scratch = useMemo(
    () => ({
      raycaster: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      plane: new THREE.Plane(),
      normal: new THREE.Vector3(),
      origin: new THREE.Vector3(),
      spin: new THREE.Quaternion(),
      hit: new THREE.Vector3(),
    }),
    [],
  )

  // Returns the object's local point under the pointer, or null when the
  // pointer misses the plane entirely. The vector is reused, so read it before
  // calling again.
  return useCallback(
    (object) => {
      if (!object) return null
      const { raycaster, ndc, plane, normal, origin, spin, hit } = scratch
      const rect = gl.domElement.getBoundingClientRect()

      // smooth, not raw: the instrument is drawn at the smoothed position, so
      // anything that answers the pointer must sit under the glass rather than
      // run ahead of it.
      ndc.x = ((pointer.smooth.x - rect.left) / rect.width) * 2 - 1
      ndc.y = -((pointer.smooth.y - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)

      object.getWorldPosition(origin)
      normal.set(0, 0, 1).applyQuaternion(object.getWorldQuaternion(spin)).normalize()
      plane.setFromNormalAndCoplanarPoint(normal, origin)

      if (!raycaster.ray.intersectPlane(plane, hit)) return null
      return object.worldToLocal(hit)
    },
    [camera, gl, scratch],
  )
}
