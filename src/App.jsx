import * as THREE from "three";
import { Suspense, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import {
  EffectComposer,
  DepthOfField,
  wrapEffect,
} from "@react-three/postprocessing";
import { Effect } from "postprocessing";
import brush from "./burash01.png";
import { pointer, startPointerTracking, PointerProjector } from "./hooks/usePointer";
import Loupe from "./loupe/Loupe";

// --- Warp post-processing effect ---

const warpFrag = `
uniform sampler2D uDisplacement;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 displacement = texture2D(uDisplacement, uv);
    float magnitude = displacement.r;
    float theta = magnitude * 2.0 * 3.14159265;
    vec2 dir = vec2(sin(theta), cos(theta));
    vec2 warpedUv = uv + dir * magnitude * 0.035;
    outputColor = texture2D(inputBuffer, warpedUv);
}
`;

class WarpEffectImpl extends Effect {
  constructor() {
    super("WarpEffect", warpFrag, {
      uniforms: new Map([["uDisplacement", new THREE.Uniform(null)]]),
    });
  }
}

const WarpEffect = wrapEffect(WarpEffectImpl);

// --- Brush stroke renderer (inside R3F canvas) ---

function RippleScene({ displacementRef }) {
  const { gl, size } = useThree();
  const brushScene = useMemo(() => new THREE.Scene(), []);
  const meshesRef = useRef([]);
  const prevMouseRef = useRef(new THREE.Vector2(0, 0));
  const currentWaveRef = useRef(0);
  const MAX = 50;

  const camera = useMemo(() => {
    const h = size.height;
    const a = size.width / size.height;
    const cam = new THREE.OrthographicCamera(
      (h * a) / -2,
      (h * a) / 2,
      h / 2,
      h / -2,
      1,
      1000,
    );
    cam.position.set(0, 0, 2);
    return cam;
  }, []);

  const rt = useMemo(
    () =>
      new THREE.WebGLRenderTarget(size.width, size.height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }),
    [],
  );

  useEffect(() => {
    const h = size.height;
    const a = size.width / size.height;
    camera.left = (h * a) / -2;
    camera.right = (h * a) / 2;
    camera.top = h / 2;
    camera.bottom = h / -2;
    camera.updateProjectionMatrix();
    rt.setSize(size.width, size.height);
  }, [size]);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(brush, (tex) => {
      const geo = new THREE.PlaneGeometry(140, 140);
      for (let i = 0; i < MAX; i++) {
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        mesh.rotation.z = Math.random() * Math.PI * 2;
        brushScene.add(mesh);
        meshesRef.current.push(mesh);
      }
    });

    return () => {
      rt.dispose();
    };
  }, []);

  useFrame(() => {
    // Raw, not smoothed: the brush trail was event-driven and instantaneous
    // before this refactor, and the lerped value would make it lag and keep
    // spawning strokes after the pointer stops.
    const mouse = {
      x: pointer.screen.x - size.width / 2,
      y: size.height / 2 - pointer.screen.y,
    };
    const prev = prevMouseRef.current;

    if (Math.abs(mouse.x - prev.x) > 4 || Math.abs(mouse.y - prev.y) > 4) {
      const mesh = meshesRef.current[currentWaveRef.current];
      if (mesh) {
        mesh.visible = true;
        mesh.position.x = mouse.x;
        mesh.position.y = mouse.y;
        mesh.rotation.z = Math.random() * Math.PI * 2;
        mesh.scale.x = mesh.scale.y = 1;
        mesh.material.opacity = 1;
        currentWaveRef.current = (currentWaveRef.current + 1) % MAX;
      }
      prev.x = mouse.x;
      prev.y = mouse.y;
    }

    meshesRef.current.forEach((mesh) => {
      if (mesh.visible) {
        mesh.rotation.z += 0.02;
        mesh.material.opacity *= 0.9;
        mesh.scale.x = 0.982 * mesh.scale.x + 0.08;
        mesh.scale.y = mesh.scale.x;
        if (mesh.material.opacity < 0.02) mesh.visible = false;
      }
    });

    gl.setRenderTarget(rt);
    gl.clear();
    gl.render(brushScene, camera);
    gl.setRenderTarget(null);

    displacementRef.current = rt.texture;
  });

  return null;
}

// --- Warp pass (reads displacement ref, updates uniform) ---

function WarpPass({ displacementRef }) {
  const effectRef = useRef();

  useFrame(() => {
    if (effectRef.current && displacementRef.current) {
      effectRef.current.uniforms.get("uDisplacement").value =
        displacementRef.current;
    }
  });

  return (
    <EffectComposer>
      <DepthOfField
        target={[0, 0, 40]}
        focalLength={0.5}
        bokehScale={8}
        height={700}
      />
      <WarpEffect ref={effectRef} />
    </EffectComposer>
  );
}

// --- Diamond background ---

const riverVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

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
`;

function DiamondBackground() {
  const { viewport } = useThree();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: riverVert,
        fragmentShader: riverFrag,
        uniforms: { uTime: { value: 0 } },
        depthWrite: false,
      }),
    [],
  );

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh renderOrder={-1} material={mat}>
      <planeGeometry args={[viewport.width * 4, viewport.height * 4]} />
    </mesh>
  );
}

// --- Physics manager ---

const COLLISION_RADIUS = 0.75;

function DogsPhysics({ physicsRef, count, hw, hh }) {
  useFrame(() => {
    const dogs = physicsRef.current;
    if (!dogs.length) return;

    // Move + wall bounce
    for (let i = 0; i < count; i++) {
      const d = dogs[i];
      d.x += d.vx;
      d.y += d.vy;
      if (d.x > hw) {
        d.x = hw;
        d.vx *= -1;
        d.flash = 0.6;
      }
      if (d.x < -hw) {
        d.x = -hw;
        d.vx *= -1;
        d.flash = 0.6;
      }
      if (d.y > hh) {
        d.y = hh;
        d.vy *= -1;
        d.flash = 0.6;
      }
      if (d.y < -hh) {
        d.y = -hh;
        d.vy *= -1;
        d.flash = 0.6;
      }

      // Text barrier — bottom-right box, dogs bounce off edges
      const bx0 = hw * 0.55
      const by1 = -hh * 0.55
      const bx1 = hw
      const by0 = -hh
      const r = COLLISION_RADIUS
      if (d.x + r > bx0 && d.x - r < bx1 && d.y + r > by0 && d.y - r < by1) {
        // Find smallest penetration axis to resolve
        const penLeft = (d.x + r) - bx0
        const penBottom = (d.y + r) - by0
        const penRight = bx1 - (d.x - r)
        const penTop = by1 - (d.y - r)
        const minPen = Math.min(penLeft, penBottom, penRight, penTop)
        if (minPen === penLeft) {
          d.x = bx0 - r
          if (d.vx > 0) d.vx *= -1
        } else if (minPen === penTop) {
          d.y = by1 + r
          if (d.vy < 0) d.vy *= -1
        } else if (minPen === penRight) {
          d.x = bx1 + r
          if (d.vx < 0) d.vx *= -1
        } else {
          d.y = by0 - r
          if (d.vy > 0) d.vy *= -1
        }
        d.flash = 0.6
      }

      // Mouse repulsion — force scales with mouse speed
      const mw = pointer.world
      const ms = pointer.speed
      if (mw) {
        const mdx = d.x - mw.x
        const mdy = d.y - mw.y
        const md2 = mdx * mdx + mdy * mdy
        const radius = 4.5
        if (md2 < radius * radius && md2 > 0.001) {
          const md = Math.sqrt(md2)
          const falloff = 1 - md / radius
          const awayX = mdx / md
          const awayY = mdy / md
          // Impact scales with mouse speed — dead zone for slow movement
          const effectiveSpeed = Math.max(ms - 0.15, 0)
          const impact = Math.min(effectiveSpeed * 0.06, 0.05) * falloff
          d.vx += awayX * impact
          d.vy += awayY * impact
          // Steer only above threshold
          const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy)
          const steer = 0.03 * falloff * Math.min(effectiveSpeed, 1)
          d.vx = d.vx * (1 - steer) + awayX * speed * steer
          d.vy = d.vy * (1 - steer) + awayY * speed * steer
          // Spin boost on impact
          const spinBoost = impact * 1.5
          d.spinRate = Math.min((d.spinRate || 0) + spinBoost, 0.04)
        }
      }

      // Decelerate back to base speed
      const spd = Math.sqrt(d.vx * d.vx + d.vy * d.vy)
      const baseSpeed = d.baseSpeed || 0.008
      if (spd > baseSpeed) {
        const drag = 0.995
        d.vx *= drag
        d.vy *= drag
      }

      // Spin: use spinRate if boosted, decay back to base
      const baseSpin = 0.0008
      const spin = d.spinRate || baseSpin
      d.rX += spin * 0.2
      d.rY += spin
      d.rZ += spin * 0.2
      if (spin > baseSpin) d.spinRate *= 0.97

      d.flash = (d.flash || 0) * 0.85;
    }

    // Collision detection
    const minDist = COLLISION_RADIUS * 2;
    const minDist2 = minDist * minDist;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = dogs[i],
          b = dogs[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 > minDist2 || dist2 === 0) continue;
        const dist = Math.sqrt(dist2);
        const nx = dx / dist,
          ny = dy / dist;
        const dvx = a.vx - b.vx,
          dvy = a.vy - b.vy;
        const dot = dvx * nx + dvy * ny;
        if (dot <= 0) continue;
        a.vx -= dot * nx;
        a.vy -= dot * ny;
        b.vx += dot * nx;
        b.vy += dot * ny;
        const overlap = (minDist - dist) / 2;
        a.x -= overlap * nx;
        a.y -= overlap * ny;
        b.x += overlap * nx;
        b.y += overlap * ny;
        a.flash = 1.0;
        b.flash = 1.0;
      }
    }
  }, -1);

  return null;
}

// --- Dog component ---

function Dog({ index, physicsRef }) {
  const ref = useRef();
  const { nodes, materials } = useGLTF("/upgradeddog-v1-transformed.glb");

  const material = useMemo(() => {
    const mat = materials.skin.clone();
    mat.color.setHSL(
      0.11 + Math.random() * 0.06,
      0.7 + Math.random() * 0.3,
      0.35 + Math.random() * 0.35,
    );
    return mat;
  }, []);

  useFrame(() => {
    const d = physicsRef.current[index];
    if (!d || !ref.current) return;
    ref.current.position.set(d.x, d.y, d.z);
    ref.current.rotation.set(d.rX, d.rY, d.rZ);
  }, 0);

  return (
    <mesh
      ref={ref}
      geometry={nodes.dogmodel.geometry}
      material={material}
      scale={0.065}
    />
  );
}

// --- Text color sampler ---

function TextColorSampler({ textRef }) {
  const { gl } = useThree()
  const lastRun = useRef(0)
  const px = useRef(new Uint8Array(4))

  useFrame(() => {
    if (!textRef.current) return
    // Each readPixels below forces a CPU/GPU sync. At ~6Hz the caption's
    // existing 0.5s colour transition hides the reduced rate entirely.
    const now = performance.now()
    if (now - lastRun.current < 160) return
    lastRun.current = now

    const rect = textRef.current.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const ctx = gl.getContext()
    const h = gl.domElement.height

    // Sample a grid of 5 points across the text area
    const points = [
      [rect.left + rect.width * 0.5, rect.top + rect.height * 0.5],
      [rect.left + rect.width * 0.2, rect.top + rect.height * 0.3],
      [rect.left + rect.width * 0.8, rect.top + rect.height * 0.3],
      [rect.left + rect.width * 0.2, rect.top + rect.height * 0.7],
      [rect.left + rect.width * 0.8, rect.top + rect.height * 0.7],
    ]

    let totalLum = 0
    const buf = px.current
    for (const [x, y] of points) {
      ctx.readPixels(Math.round(x * dpr), Math.round(h - y * dpr), 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, buf)
      totalLum += (buf[0] * 0.299 + buf[1] * 0.587 + buf[2] * 0.114) / 255
    }

    const lum = totalLum / points.length
    textRef.current.style.color = lum > 0.25 ? "#000000" : "#ffe000"
  })

  return null
}

// --- Scene ---

function Scene({ count = 50, textRef }) {
  const displacementRef = useRef(null);
  const { viewport, camera, gl } = useThree();
  const { width: hw2, height: hh2 } = viewport.getCurrentViewport(
    camera,
    [0, 0, -40],
  );
  const hw = hw2 / 2,
    hh = hh2 / 2;

  const physicsRef = useRef(
    Array.from({ length: count }, () => {
      const speed = 0.005 + Math.random() * 0.008;
      const angle = Math.random() * Math.PI * 2;
      return {
        x: (Math.random() - 0.5) * hw2 * 0.9,
        y: (Math.random() - 0.5) * hh2 * 0.9,
        z: -40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseSpeed: speed,
        rX: Math.random() * Math.PI,
        rY: Math.random() * Math.PI,
        rZ: Math.random() * Math.PI,
      };
    }),
  );

  return (
    <>
      <color attach="background" args={["#0a0800"]} />
      <ambientLight intensity={0.2} />
      <spotLight position={[10, 10, 10]} intensity={1} />
      <Suspense fallback={null}>
        <PointerProjector planeZ={-40} />
        <DiamondBackground />
        <Environment preset="sunset" />
        <DogsPhysics physicsRef={physicsRef} count={count} hw={hw} hh={hh} />
        {Array.from({ length: count }, (_, i) => (
          <Dog key={i} index={i} physicsRef={physicsRef} />
        ))}
        <RippleScene displacementRef={displacementRef} />
        <WarpPass displacementRef={displacementRef} />
        <TextColorSampler textRef={textRef} />
      </Suspense>
    </>
  );
}

// --- App ---

export default function App() {
  startPointerTracking();
  const textRef = useRef()

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0a0800",
        cursor: "none",
      }}
    >
      <Loupe />
      <Canvas
        gl={{ alpha: false, preserveDrawingBuffer: true }}
        camera={{ near: 0.01, far: 110, fov: 80 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene textRef={textRef} />
      </Canvas>
      <div
        ref={textRef}
        style={{
          position: "absolute",
          bottom: "2rem",
          right: "2.5rem",
          color: "#ffe000",
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: "0.78rem",
          fontWeight: "400",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          transition: "color 0.5s ease",
          pointerEvents: "none",
          userSelect: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: "1.8",
        }}
      >
        <span>made with</span>
        <span>gold, puppies</span>
        <span>and luxury</span>
      </div>
    </div>
  );
}
