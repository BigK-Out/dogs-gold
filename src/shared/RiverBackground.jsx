import * as THREE from "three"
import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { introStrength } from "./intro"

// How much faster than normal the rivers churn at full intro strength.
const INTRO_CHURN = 8
// How far the pattern runs downward per second at full strength, in UV units.
const INTRO_DRIP = 0.035

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
// The intro: 0 is the world's own look, 1 is fully the intro palette, bled
// rivers, heartbeat and all. Every intro term is multiplied by it.
uniform float uIntro;
uniform vec3 uIntroStops[5];
uniform vec3 uIntroBase;
uniform float uClock;
uniform float uDrip;
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

// Five tones blended in order, darkest to brightest. Each stop is the world's
// own, pulled toward the intro's.
vec3 palette(float t) {
  vec3 c0 = mix(uStops[0], uIntroStops[0], uIntro);
  vec3 c1 = mix(uStops[1], uIntroStops[1], uIntro);
  vec3 c2 = mix(uStops[2], uIntroStops[2], uIntro);
  vec3 c3 = mix(uStops[3], uIntroStops[3], uIntro);
  vec3 c4 = mix(uStops[4], uIntroStops[4], uIntro);

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
  // Runs the whole pattern downward while the intro holds, like blood running
  // down a wall. uDrip only accumulates, so it stops rather than snapping back.
  uv.y += uDrip;

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
  // The bleed: the intro softens the river edges wide, so colour seeps out of
  // each river into the dark ground instead of stopping at a hard line.
  float edge = 0.01 + 0.3 * uIntro;
  rivers = smoothstep(0.5 - edge, 0.5 + edge, rivers);

  // Layered tone: coarse variation between rivers + fine variation within
  float coarse = sin(r.x * 5.0 + r.y * 3.0 + t * 0.2) * 0.5 + 0.5;
  float fine   = sin(r.x * 22.0 + r.y * 18.0 + t * 0.5) * 0.5 + 0.5;
  float shimmer = sin(r.x * 60.0 - r.y * 40.0 + t * 1.2) * 0.5 + 0.5;

  // Blend layers: coarse sets the general tone, fine adds sub-bands, shimmer adds highlights
  float f = coarse * 0.5 + fine * 0.3 + shimmer * 0.2;
  vec3 col = palette(f);

  // Dark ground between rivers
  col = mix(mix(uBase, uIntroBase, uIntro), col, rivers);

  // A heartbeat throb: a sharp double pulse about once a second.
  float beat = pow(0.5 + 0.5 * sin(uClock * 6.2832), 12.0)
             + 0.6 * pow(0.5 + 0.5 * sin(uClock * 6.2832 - 1.1), 12.0);
  col *= 1.0 + 0.5 * uIntro * beat;

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
// `intro` is optional: `{ palette, holdMs, fadeMs }`. On mount the background
// shows the intro palette — bled, churning, dripping and throbbing — for
// `holdMs`, then eases into the world's own look over `fadeMs`. Mount is the
// moment of arrival: the world subtree is keyed, so it mounts on every switch
// to it, and only once its assets have loaded, as the curtain starts to lift.
//
// Define the palette and intro at module scope: the material is rebuilt
// whenever either identity changes.
export default function RiverBackground({ palette, intro }) {
  const { viewport } = useThree()
  const mat = useMemo(() => {
    const vecs = (stops) => stops.map((c) => new THREE.Vector3(...c))
    const introPalette = intro ? intro.palette : palette
    return new THREE.ShaderMaterial({
      vertexShader: riverVert,
      fragmentShader: riverFrag,
      uniforms: {
        uTime: { value: 0 },
        uStops: { value: vecs(palette.stops) },
        uBase: { value: new THREE.Vector3(...palette.base) },
        uIntro: { value: intro ? 1 : 0 },
        uIntroStops: { value: vecs(introPalette.stops) },
        uIntroBase: { value: new THREE.Vector3(...introPalette.base) },
        uClock: { value: 0 },
        uDrip: { value: 0 },
      },
      depthWrite: false,
    })
  }, [palette, intro])

  // Passed as a prop rather than declared as JSX, so r3f never disposes it.
  // Every world mounts this now, so a switch would otherwise abandon one.
  useEffect(() => () => mat.dispose(), [mat])

  const startedAt = useRef(null)
  // Extra flow time the intro adds on top of the clock. Added rather than
  // replacing the clock, so a world without an intro animates exactly as before.
  const churn = useRef(0)

  useFrame((state, delta) => {
    const u = mat.uniforms
    const now = state.clock.elapsedTime
    // A long frame (a backgrounded tab) must not lurch the pattern.
    const dt = Math.min(delta, 0.1)

    let strength = 0
    if (intro) {
      if (startedAt.current === null) startedAt.current = now
      strength = introStrength((now - startedAt.current) * 1000, intro)
    }

    churn.current += dt * INTRO_CHURN * strength
    u.uTime.value = now + churn.current
    u.uIntro.value = strength
    u.uClock.value = now
    u.uDrip.value += dt * INTRO_DRIP * strength
  })

  return (
    <mesh renderOrder={-1} material={mat}>
      <planeGeometry args={[viewport.width * 4, viewport.height * 4]} />
    </mesh>
  )
}
