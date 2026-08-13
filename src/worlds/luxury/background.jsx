import * as THREE from "three"
import { useMemo } from "react"
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

vec3 goldPalette(float t) {
  // 5 gold tones that blend smoothly — blue kept near zero to avoid blend artifacts
  vec3 c0 = vec3(0.04, 0.02, 0.00); // darkest bronze
  vec3 c1 = vec3(0.18, 0.10, 0.00); // deep amber
  vec3 c2 = vec3(0.42, 0.28, 0.01); // warm gold
  vec3 c3 = vec3(0.70, 0.54, 0.03); // bright gold
  vec3 c4 = vec3(0.85, 0.72, 0.05); // white gold highlight

  float s = clamp(t, 0.0, 1.0) * 4.0;
  int i = int(s);
  float f = fract(s);

  if (i == 0) return mix(c0, c1, f);
  if (i == 1) return mix(c1, c2, f);
  if (i == 2) return mix(c2, c3, f);
  return mix(c3, c4, f);
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

  // Layered gold: coarse variation between rivers + fine variation within
  float coarse = sin(r.x * 5.0 + r.y * 3.0 + t * 0.2) * 0.5 + 0.5;
  float fine   = sin(r.x * 22.0 + r.y * 18.0 + t * 0.5) * 0.5 + 0.5;
  float shimmer = sin(r.x * 60.0 - r.y * 40.0 + t * 1.2) * 0.5 + 0.5;

  // Blend layers: coarse sets the general tone, fine adds sub-bands, shimmer adds highlights
  float f = coarse * 0.5 + fine * 0.3 + shimmer * 0.2;
  vec3 col = goldPalette(f);

  // Very dark background between rivers
  vec3 bg = vec3(0.01, 0.008, 0.002);
  col = mix(bg, col, rivers);

  gl_FragColor = vec4(col, 1.0);
}
`

export default function DiamondBackground() {
  const { viewport } = useThree()
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: riverVert,
        fragmentShader: riverFrag,
        uniforms: { uTime: { value: 0 } },
        depthWrite: false,
      }),
    [],
  )

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh renderOrder={-1} material={mat}>
      <planeGeometry args={[viewport.width * 4, viewport.height * 4]} />
    </mesh>
  )
}
