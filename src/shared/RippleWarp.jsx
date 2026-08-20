import * as THREE from "three"
import { useMemo, useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { EffectComposer, DepthOfField, wrapEffect } from "@react-three/postprocessing"
import { Effect } from "postprocessing"
import { pointer } from "./usePointer"
import brush from "./burash01.png"

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
`

class WarpEffectImpl extends Effect {
  constructor() {
    super("WarpEffect", warpFrag, {
      uniforms: new Map([["uDisplacement", new THREE.Uniform(null)]]),
    });
  }
}

const WarpEffect = wrapEffect(WarpEffectImpl)

function RippleScene({ displacementRef }) {
  const { gl, size } = useThree();
  const brushScene = useMemo(() => new THREE.Scene(), []);
  const meshesRef = useRef([]);
  const prevMouseRef = useRef(new THREE.Vector2(0, 0));
  const currentWaveRef = useRef(0);
  const MAX = 50;

  // Deliberately created once. A resize must mutate these in place — see the
  // effect below — not build a new camera and render target every time.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deliberately created once. A resize must mutate these in place — see the
  // effect below — not build a new camera and render target every time.
  const rt = useMemo(
    () =>
      new THREE.WebGLRenderTarget(size.width, size.height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  useEffect(() => {
    // Every world mounts this now, so the subtree is built and torn down on
    // each switch. Nothing here is reclaimed automatically: r3f disposes what
    // it renders as JSX, and these fifty meshes are added to a plain
    // THREE.Scene by hand.
    let cancelled = false;
    let texture = null;
    const geometry = new THREE.PlaneGeometry(140, 140);
    const loader = new THREE.TextureLoader();

    loader.load(brush, (tex) => {
      // Switching worlds before the PNG arrives would otherwise build fifty
      // materials into a scene whose cleanup has already run.
      if (cancelled) {
        tex.dispose();
        return;
      }
      texture = tex;
      for (let i = 0; i < MAX; i++) {
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.visible = false;
        mesh.rotation.z = Math.random() * Math.PI * 2;
        brushScene.add(mesh);
        meshesRef.current.push(mesh);
      }
    });

    return () => {
      cancelled = true;
      for (const mesh of meshesRef.current) {
        brushScene.remove(mesh);
        mesh.material.dispose();
      }
      meshesRef.current = [];
      // One geometry shared by all fifty meshes, so disposed once.
      geometry.dispose();
      texture?.dispose();
      rt.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

function WarpPass({ displacementRef, depthOfField }) {
  const effectRef = useRef();

  useFrame(() => {
    if (effectRef.current && displacementRef.current) {
      effectRef.current.uniforms.get("uDisplacement").value =
        displacementRef.current;
    }
  });

  // Built as an array rather than with a conditional child: EffectComposer
  // walks its children to assemble the pass chain, and a `false` or `null`
  // among them is not a pass. Memoised so the chain is only rebuilt when a
  // world actually changes the blur — `children` is a dependency of the effect
  // that assembles the passes, and each rebuild abandons an EffectPass.
  const passes = useMemo(() => {
    const list = [];
    if (depthOfField) list.push(<DepthOfField key="dof" {...depthOfField} />);
    list.push(<WarpEffect key="warp" ref={effectRef} />);
    return list;
  }, [depthOfField]);

  return <EffectComposer>{passes}</EffectComposer>;
}

// Mounted once by the shell, outside the keyed world subtree, and never
// unmounted. This is not a stylistic choice: @react-three/postprocessing builds
// its EffectComposer in a useMemo and never calls composer.dispose(), so every
// unmount abandons the composer's render targets. Mounting one per world leaked
// framebuffers, renderbuffers and textures on every switch.
//
// The trail itself is world-independent — it reads only the pointer and the
// canvas size — so keeping it up costs nothing and saves rebuilding fifty
// meshes and a render target per switch.
//
// `depthOfField` is optional per world: the blur is a luxury look rather than
// part of the ripple. It is safe to vary because the DepthOfField wrapper does
// dispose its effect, both on unmount and on a prop change.
export default function RippleWarp({ depthOfField }) {
  const displacementRef = useRef(null)
  return (
    <>
      <RippleScene displacementRef={displacementRef} />
      <WarpPass displacementRef={displacementRef} depthOfField={depthOfField} />
    </>
  )
}
