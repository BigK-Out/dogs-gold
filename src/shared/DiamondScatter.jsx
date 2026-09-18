import * as THREE from "three"
import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { pointer } from "./usePointer"

// Real stones sitting on a letter's face, rather than a picture of stones.
//
// A painted pavé cannot hold up here: the face stays flat, the silhouette
// never breaks, and since this camera never moves, its highlights never move
// either. Geometry fixes all three — each stone has its own facets catching the
// environment, and a slow turn makes them flash in and out.
//
// One InstancedMesh carries the lot, so a thousand stones cost one draw call.

// A cut stone: eight-sided, flat table toward the camera, pavilion sunk into
// the letter. Built once, shared by every instance.
const GEM = new THREE.ConeGeometry(1, 1.5, 8)
GEM.rotateX(Math.PI / 2)
GEM.computeVertexNormals()

// Ray casting, counting crossings of the contour to the right of the point.
function inside(points, x, y) {
  let hit = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]
    const b = points[j]
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      hit = !hit
    }
  }
  return hit
}

// Every spot inside the lettering where a stone will fit, on a jittered grid so
// the pavé never shows rows.
function scatter(shapes, spacing, jitter) {
  const spots = []
  for (const shape of shapes) {
    const outline = shape.getPoints(24)
    const holes = shape.holes.map((hole) => hole.getPoints(24))

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const p of outline) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }

    for (let y = minY; y <= maxY; y += spacing) {
      for (let x = minX; x <= maxX; x += spacing) {
        const px = x + (Math.random() - 0.5) * spacing * jitter
        const py = y + (Math.random() - 0.5) * spacing * jitter
        if (!inside(outline, px, py)) continue
        if (holes.some((hole) => inside(hole, px, py))) continue
        spots.push({ x: px, y: py, size: spacing * (0.42 + Math.random() * 0.3) })
      }
    }
  }
  return spots
}

// How the stones answer the pointer. `radius` is in the letters' own units, so
// roughly one capital's height reaches about one unit.
//
// Brightness is not among them: the stones are lit by HeaderLight, a real lamp
// carried at the pointer. Painting them brighter instead gave a white smear,
// because paint looks the same from every angle and a facet does not.
const HOVER = {
  radius: 1.3,
  // Stones near the pointer turn faster, so they throw the lamp off different
  // facets in quick succession — the twinkle, rather than a steady shine.
  spin: 9,
  rise: 0.35,
  fall: 0.08,
}

export default function DiamondScatter({ shapes, z, spacing = 0.055, jitter = 0.7, material }) {
  const meshRef = useRef()
  const { camera, gl } = useThree()
  const spots = useMemo(() => scatter(shapes, spacing, jitter), [shapes, spacing, jitter])

  // Each stone turns at its own pace, on its own axis, from its own starting
  // angle: they must never flash together.
  const spins = useMemo(
    () =>
      spots.map(() => ({
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize(),
        phase: Math.random() * Math.PI * 2,
        rate: 0.12 + Math.random() * 0.5,
      })),
    [spots],
  )

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const quaternion = useMemo(() => new THREE.Quaternion(), [])

  const gemMaterial = useMemo(() => new THREE.MeshPhysicalMaterial(material), [material])
  useEffect(() => () => gemMaterial.dispose(), [gemMaterial])

  // Where the pointer falls on the stones' own plane, and how lit they are.
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const plane = useMemo(() => new THREE.Plane(), [])
  const normal = useMemo(() => new THREE.Vector3(), [])
  const origin = useMemo(() => new THREE.Vector3(), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  // How stirred each stone is right now, eased per stone.
  const lit = useMemo(() => new Float32Array(spots.length), [spots])

  // The pointer, projected onto the tilted plane the stones lie in and read in
  // their own coordinates — the same space the scatter positions are in.
  function pointerOnFace(mesh) {
    const rect = gl.domElement.getBoundingClientRect()
    // smooth, not raw: the instrument is drawn at the smoothed position, so the
    // shine must follow the glass rather than the mouse.
    ndc.x = ((pointer.smooth.x - rect.left) / rect.width) * 2 - 1
    ndc.y = -((pointer.smooth.y - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(ndc, camera)

    mesh.getWorldPosition(origin)
    normal.set(0, 0, 1).applyQuaternion(mesh.getWorldQuaternion(quaternion)).normalize()
    plane.setFromNormalAndCoplanarPoint(normal, origin)

    if (!raycaster.ray.intersectPlane(plane, hit)) return null
    return mesh.worldToLocal(hit)
  }

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true
  }, [spots])

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    const now = state.clock.elapsedTime
    const near = pointerOnFace(mesh)

    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i]
      const spin = spins[i]

      // Nearness to the pointer, 0 outside the reach and 1 right under it,
      // eased so the edge of the effect has no visible rim.
      let target = 0
      if (near) {
        const d = Math.hypot(spot.x - near.x, spot.y - near.y)
        const t = Math.max(0, 1 - d / HOVER.radius)
        target = t * t
      }
      const ease = target > lit[i] ? HOVER.rise : HOVER.fall
      lit[i] += (target - lit[i]) * ease

      // A stirred stone turns faster, sweeping the lamp across its facets.
      const angle = spin.phase + now * spin.rate * (1 + HOVER.spin * lit[i])
      quaternion.setFromAxisAngle(spin.axis, angle)
      dummy.position.set(spot.x, spot.y, z)
      dummy.quaternion.copy(quaternion)
      dummy.scale.setScalar(spot.size)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  if (!spots.length) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[GEM, gemMaterial, spots.length]}
      // The stones are scattered by hand and never move as a group, so there is
      // nothing for three to cull them by.
      frustumCulled={false}
    />
  )
}
