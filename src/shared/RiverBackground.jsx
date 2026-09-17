import * as THREE from "three"
import { useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"

const riverVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const riverFrag = `
uniform float uTime;
uniform vec3 uStops[5];
uniform vec3 uBase;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.0 + vec2(3.1 + float(i) * 0.7, 4.7 - float(i) * 0.5);
    a *= 0.5;
  }
  return v;
}

// Five tones blended in order, darkest to brightest.
vec3 palette(float t) {
  float s = clamp(t, 0.0, 1.0) * 4.0;
  int i = int(s);
  float f = fract(s);

  if (i == 0) return mix(uStops[0], uStops[1], f);
  if (i == 1) return mix(uStops[1], uStops[2], f);
  if (i == 2) return mix(uStops[2], uStops[3], f);
  return mix(uStops[3], uStops[4], f);
}

void main() {
  float t = uTime * 0.02;
  vec2 uv = vUv;

  // Domain warp pass 1
  vec2 q = vec2(
    fbm(uv * 2.0 + vec2(0.0, 0.0) + t),
    fbm(uv * 2.0 + vec2(5.2, 1.3) + t)
  );

  // Domain warp pass 2
  vec2 r = vec2(
    fbm(uv * 2.0 + 4.0 * q + vec2(1.7, 9.2) + 0.4 * t),
    fbm(uv * 2.0 + 4.0 * q + vec2(8.3, 2.8) + 0.4 * t)
  );

  // River mask
  float rivers = sin(r.x * 28.0 + t * 0.4) * 0.5 + 0.5;
  rivers = smoothstep(0.49, 0.51, rivers);

  // Layered tone: coarse variation between rivers + fine variation within
  float coarse = sin(r.x * 5.0 + r.y * 3.0 + t * 0.2) * 0.5 + 0.5;
  float fine   = sin(r.x * 22.0 + r.y * 18.0 + t * 0.5) * 0.5 + 0.5;
  float shimmer = sin(r.x * 60.0 - r.y * 40.0 + t * 1.2) * 0.5 + 0.5;

  // Blend layers: coarse sets the general tone, fine adds sub-bands, shimmer adds highlights
  float f = coarse * 0.5 + fine * 0.3 + shimmer * 0.2;
  vec3 col = palette(f);

  // Dark ground between rivers
  col = mix(uBase, col, rivers);

  gl_FragColor = vec4(col, 1.0);
}
`

// The luxury gold-river shader, with its colours lifted into a per-world
// palette: `stops` is five [r, g, b] tones from darkest to brightest, `base` the
// ground between the rivers.
//
// Components are raw floats written straight to gl_FragColor, not hex. A
// ShaderMaterial does no colour-space conversion, while THREE.Color converts
// sRGB hex to linear, so hex here would silently shift every tone.
//
// Define the palette at module scope: the material is rebuilt whenever its
// identity changes.
export default function RiverBackground({ palette }) {
  const { viewport } = useThree()
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: riverVert,
        fragmentShader: riverFrag,
        uniforms: {
          uTime: { value: 0 },
          uStops: { value: palette.stops.map((c) => new THREE.Vector3(...c)) },
          uBase: { value: new THREE.Vector3(...palette.base) },
        },
        depthWrite: false,
      }),
    [palette],
  )

  // Passed as a prop rather than declared as JSX, so r3f never disposes it.
  // Every world mounts this now, so a switch would otherwise abandon one.
  useEffect(() => () => mat.dispose(), [mat])

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh renderOrder={-1} material={mat}>
      <planeGeometry args={[viewport.width * 4, viewport.height * 4]} />
    </mesh>
  )
}
