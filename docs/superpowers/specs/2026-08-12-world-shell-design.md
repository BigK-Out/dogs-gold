# World shell — design

**Date:** 2026-08-12
**Project:** `projects/dogs-gold`
**Status:** approved, ready for planning

## Summary

Turn the single luxury scene into the first of three worlds, reachable by arrows
at the bottom of the screen. This spec builds the shell that hosts a world,
decomposes the existing luxury scene to fit it, and ships two working stubs so
the switching is real from day one.

The three worlds are a descent: **luxury** (built), **middle class**, **stray**.
Each is a genuinely different scene with its own background, palette, props,
instrument, and revealed document. This spec designs none of their content —
that is spec 2 and spec 3.

## Goals

- Arrows move between three worlds with no visible loading seam.
- A world is a config object. The shell knows nothing about any world's contents.
- Adding a world means adding a directory and a registry entry, touching no
  shell code.
- The luxury world looks and behaves exactly as it does today afterwards.
- Everything the three worlds share exists in exactly one place.

## Non-goals

Each is separate, later work.

- **The content of the middle-class and stray worlds.** Their scenes, palettes,
  instruments, and documents are spec 2 and spec 3, brainstormed once their
  assets exist. This spec ships them as deliberately plain stubs.
- Deep-linking or routing. There are no URLs per world.
- Touch support. The piece stays pointer-driven and desktop-only.
- Any change to the other five projects in the repository.

## Decisions taken

Recorded so they are not relitigated during implementation.

| Question | Decision |
| --- | --- |
| Morph one scene, or swap scenes? | **Swap.** Worlds are genuinely different; morphing constrains them to a shared shape. |
| How different are the worlds? | **Genuinely different scenes** — own props, own effects, own dog counts. |
| Does the loupe carry across? | **No.** Each world has its own instrument and its own revealed document. |
| Transition? | **Fade through black**, ~600ms each way. One world alive at a time. |
| One Canvas or one per world? | **One Canvas in the shell.** Only the React subtree swaps. |
| Dog models? | **User-supplied per world.** Stubs use the existing GLB until they land. |
| How much luxury refactor? | **Full decomposition** into `shared/` and `worlds/luxury/`. |

## Architecture

### The world contract

A world is a plain object in an ordered registry. Nothing in the shell branches
on a world's identity.

```js
// worlds/registry.js
import luxury from "./luxury"
import middle from "./middle"
import stray  from "./stray"

export const WORLDS = [luxury, middle, stray]   // array order is arrow order
```

```js
// worlds/luxury/index.js
export default {
  id: "luxury",
  label: "Luxury",

  // Painted behind the canvas and under the curtain. Read during the
  // transition, while no world is mounted, so it must live in config
  // rather than inside the scene.
  pageBackground: "#0a0800",

  camera: { fov: 80, near: 0.01, far: 110 },

  Scene: LuxuryScene,        // in-canvas subtree
  Card: Certificate,         // DOM content inside the shared card container

  // Art plus its three measured ratios. See "Instruments" below.
  instrument: {
    src: loupePng,
    size: 260,
    cx: 0.359,
    cy: 0.342,
    radius: 0.220,
  },

  selection: { radius: 4.0, releaseMargin: 1.0, dwellMs: 500 },
}
```

Optional keys, absent in luxury:

- `Instrument` — a component overriding the shared positioner, for an
  instrument whose behaviour is more than "follow the pointer with an offset".
- `Card: null` — a world with no reveal panel.

### Shell composition

```jsx
<div style={{ background: world.pageBackground, cursor: "none" }}>
  <Instrument world={world} />
  <Canvas gl={{ alpha: false, preserveDrawingBuffer: true }}>
    <WorldMount world={world} selectionRef={selectionRef} onReady={…} />
  </Canvas>
  <Card world={world} selectionRef={selectionRef} />
  <Arrows index={…} count={WORLDS.length} onGo={…} />
  <Curtain phase={…} onCovered={…} onRevealed={…} />
</div>
```

`selectionRef` is owned by the shell, passed to both the in-canvas scene and the
out-of-canvas card, and reset to `INITIAL` on every world change. A world that
does not use selection simply ignores it.

### One Canvas

The WebGL context is created once and never torn down; only the subtree inside
it swaps. This is what makes switching cheap, and it avoids the browser's limit
on live contexts.

The cost is that `gl` flags are fixed at context creation. `preserveDrawingBuffer: true`
and `alpha: false` therefore apply to all three worlds permanently — the first
because the luxury caption sampler reads pixels back, the second because every
world paints its own opaque background. **Do not make `gl` flags per-world
config; they cannot take effect.**

Camera settings *are* mutable, so `camera` lives in world config and is applied
imperatively when a world mounts.

### Instruments

Each world has its own instrument art and its own revealed document. The
*positioning* logic, however, is identical for any instrument: a `requestAnimationFrame`
loop translating an image to `pointer.smooth`, offset so the instrument's active
point — not the image centre — lands on the pointer.

`shared/Instrument.jsx` owns that loop. A world supplies a PNG and four numbers.
This is why `instrument` is config rather than a component: three near-identical
rAF loops would be three places to fix the same bug.

The escape hatch stays open. A world needing genuinely different behaviour — a
cone of light, a sweep, a lag — sets `Instrument` in its config and the shell
renders that instead. The shared positioner is the default, not a constraint.

`shared/Card.jsx` follows the same split: it owns the container, the edge-flip,
the fade, and the per-frame positioning against `instrument.radius`. Each world
supplies only the content that goes inside it.

### Shared spine

One copy each, parameterized by world config.

| Module | Parameterized by |
| --- | --- |
| `shared/physics.js` | count, bounds, collision radius, speed range, barrier boxes, repulsion strength |
| `shared/Dog.jsx` | model URL, node name, material factory, scale, selected scale, lift |
| `shared/usePointer.js` | nothing — module singleton, survives world switches unchanged |
| `shared/selection.js` | nothing — already pure, already tested |
| `shared/useDogSelection.js` | the world's `selection` block |
| `shared/Instrument.jsx` | the world's `instrument` block |
| `shared/Card.jsx` | the world's `instrument.radius` |

Two details worth stating, because both are currently hardcoded:

- The **text-barrier box** in today's physics loop exists only to keep dogs off
  the luxury caption. It becomes a `barriers: [{x0,y0,x1,y1}]` config array, empty
  by default.
- `SELECT_RADIUS` and friends are currently module constants in
  `useDogSelection.js`. They move into per-world config, because dog scale and
  count differ per world and the radius is derived from how big a dog *looks*.

### Navigation

A pure reducer, matching the pattern `selection.js` already establishes.

```js
// shell/navigation.js
export const IDLE = "idle", COVERING = "covering", REVEALING = "revealing"
export const INITIAL = { index: 0, pending: null, phase: IDLE }

nextNavigation(state, action)
```

| Action | Effect |
| --- | --- |
| `{ type: "go", delta: -1 \| +1 }` | Ignored unless `phase === IDLE`. Clamped to the registry bounds. Sets `pending` and `phase = COVERING`. |
| `{ type: "covered" }` | Commits `index = pending`, `phase = REVEALING`. |
| `{ type: "revealed" }` | `phase = IDLE`, `pending = null`. |

Rejecting input while a transition runs is load-bearing. Without it, holding an
arrow key queues swaps and lands the user on an unintended world behind a
half-faded curtain.

No wrap-around. Luxury to stray is a descent; looping stray back to luxury
would flatten it. Arrows disable at each end.

### Transition

```
click / arrow key ──> COVERING     curtain opacity 0 → 1 over 600ms
                  ──> "covered"    index = pending; selectionRef = INITIAL
                                   old subtree unmounts, new one mounts
                  ──> new world suspends while its model loads
                                   (curtain still fully opaque)
                  ──> WorldReady   Suspense resolved and one frame drawn
                  ──> REVEALING    curtain opacity 1 → 0 over 600ms
                  ──> "revealed"   IDLE
```

**The reveal is event-driven, not timed.** A fixed delay would uncover an empty
scene whenever a model loads slowly — precisely the failure the previous spec
warned about, where a missing asset yields a plausible-looking empty scene with
no visible error.

```jsx
// shell/WorldReady.jsx — rendered as the last child inside the world's <Suspense>
// Mounting at all proves Suspense resolved; the rAF gives the first draw a frame.
useEffect(() => {
  const id = requestAnimationFrame(() => onReady())
  return () => cancelAnimationFrame(id)
}, [])
```

A **4-second ceiling** backs it up: if `WorldReady` never fires, reveal anyway. A
broken world must show itself as broken, not trap the user behind an opaque
curtain with the arrows unreachable.

### Arrows

DOM, bottom centre, above the canvas and below the instrument in `z` order.
`pointerEvents: auto` — they are the only clickable elements on a `cursor: none`
page, and the instrument stays `pointerEvents: none` so it never intercepts the
click. Left and Right arrow keys are bound to the same action. The current
world's `label` sits between the two arrows.

### State does not persist

Returning to a world re-randomises its dog positions and clears any selection.
Dogs are randomly placed at init, so there is nothing recognisable to preserve,
and hoisting fifty dogs' physics state out of three unmounting subtrees would add
real complexity to protect something invisible.

## File structure

```
src/
  App.jsx                    shell: canvas, curtain, arrows, world mount   ~120 lines
  shell/
    navigation.js            pure reducer: index + transition phase
    navigation.test.js
    Arrows.jsx
    Curtain.jsx
    WorldReady.jsx
  shared/
    usePointer.js            moved from hooks/, unchanged
    selection.js             moved from loupe/, unchanged
    selection.test.js        moved from loupe/, unchanged
    useDogSelection.js       radii now from world config
    physics.js               parameterized loop, extracted from DogsPhysics
    Dog.jsx                  parameterized mesh
    Instrument.jsx           pointer-following positioner
    Card.jsx                 positioned, fading container
  worlds/
    registry.js
    luxury/
      index.js               the config object
      Scene.jsx              lights, background, dogs, effects, composition
      background.js          gold-river fragment shader, moved verbatim
      material.js            gold dog material factory
      creds.js               certificate document
      creds.test.js          moved from loupe/, unchanged
      Card.jsx               certificate layout
      RippleWarp.jsx         brush trail + warp pass — luxury only
      TextColorSampler.jsx   caption colour sampler — luxury only
      Caption.jsx            the "made with / gold, puppies / and luxury" text
      loupe.png
    middle/                  stub
    stray/                   stub
```

`src/hooks/` and `src/loupe/` dissolve into `shared/` and `worlds/luxury/`.

### Luxury moves, it does not change

Every extraction is verbatim: the shader source, the physics arithmetic, the warp
effect, the sampler throttle, the measured loupe ratios `0.359 / 0.342 / 0.220`.

The `useFrame` priority chain is preserved exactly:

```
-2  pointer projector
-1  physics
-0.5 selection
 0  dog transforms
 1  effect composer
```

**Success for the refactor is no visible difference.** Screenshot before,
screenshot after.

### Stubs are real worlds, not placeholders

Each stub uses the shared physics, the existing GLB, a flat-colour background, a
placeholder instrument, and a two-field card. Deliberately plain, but functional:
it proves the socket fits three times rather than once, and the arrows do
something real the day the shell lands. The supplied models and PNGs then drop
into config without the shell being touched.

## Cleanup

Confirmed unused by search, not assumed.

| File | Size | Note |
| --- | --- | --- |
| `src/RippleEffect.js` | 6 KB | superseded by the inline shaders in App.jsx |
| `src/shader/vertex.glsl`, `fragment.glsl` | — | superseded |
| `src/Aperture-Lens.gif` | 2.0 MB | never imported |
| `src/newdesign.png` | 156 KB | the rejected camera-lens art |
| `src/lens.pdf` | 216 KB | reference art |
| `src/assets/react.svg` | — | Vite scaffold leftover |
| `public/upgradeddog-v1.glb` | 46 KB | the untransformed model — unused |
| `public/Upgradeddog-v1.jsx` | 674 B | gltfjsx output — unused |

The two `public/` entries matter beyond tidiness: `public/` is copied verbatim
into `dist/`, so both are **currently deployed to GitHub Pages**, including a
`.jsx` source file served as a static asset with a stale absolute Windows path in
its header comment. Removing them cuts dead payload and stops publishing that
path.

### Lint

`eslint .` currently reports 159 problems. The breakdown says the configuration
is wrong, not the code:

```
139  react/prop-types
 13  react/no-unknown-property
  5  react-hooks/exhaustive-deps
  2  no-unused-vars
```

- `react/no-unknown-property` fires on every react-three-fiber prop
  (`<ambientLight intensity>`, `<mesh geometry>`, …). The rule cannot know that
  r3f extends JSX with three.js properties. **Disable, with a comment saying why.**
- `react/prop-types` fires 139 times because this project uses no PropTypes
  anywhere and passes refs freely. **Disable, with a comment saying why.**

Annotating 152 sites to satisfy two misapplied rules would be vandalism. Turning
them off leaves **7 real findings** and a lint run that means something
afterwards.

Those 7 are to be read individually, not bulk-fixed. Several of the
`exhaustive-deps` warnings are deliberate: the render target and orthographic
camera in `RippleScene` are memoised with `[]` precisely so they survive resize,
with an effect handling resize separately. Each is either fixed or suppressed
inline with a comment giving the reason. "Zero warnings" is not the goal; zero
*unexplained* warnings is.

### Documentation

- `projects/dogs-gold/README.md` is stock Vite boilerplate. Replace with: what
  the piece is, how to run it, how the world registry works, and how to add a
  world.
- The root `README.md` has one paragraph naming dead files that this spec
  deletes. Correct **that clause only** — its encoding, its other prose, and every
  other project's entry are left alone.

Nothing outside `projects/dogs-gold/` is otherwise touched.

## Testing

Node's built-in runner, no new dependencies, matching the existing pattern.

| Test | Covers |
| --- | --- |
| `shell/navigation.test.js` | arrows clamp at both ends; input ignored mid-transition; swap commits only on `covered`; phase returns to `IDLE` |
| `shared/selection.test.js` | moved, unchanged — 10 tests |
| `worlds/luxury/creds.test.js` | moved, unchanged — 6 tests |
| each new world's `creds.test.js` | its own document generation |

### The test script must change

Today's script is `node --test src/loupe/*.test.js`, relying on the shell to
expand the glob because Node 20 on the CI runner cannot expand one itself. That
breaks the moment tests move, and no glob fixes it: `sh` has `globstar` off, so
`src/**/*.test.js` collapses to `src/*/*.test.js` and silently misses
`src/worlds/luxury/creds.test.js` at three levels deep. Silently — the run would
report passing tests while skipping a file.

Use the bare recursive form instead:

```json
"test": "node --test"
```

Node walks the working directory recursively for test files and skips
`node_modules` on its own. No shell globbing, no depth assumption, nothing to
re-fix when the tree moves again. Verified finding all 16 current tests on both
**Node 20.20.2** (the CI runner's major) and **Node 24.14.1** (local).

Manual verification:

- Screenshot luxury before and after decomposition; compare.
- Switch worlds ten times in a row, watching `gl.info.memory` for monotonic
  growth in geometries, textures, or programs.
- Confirm the curtain never reveals an unloaded scene.
- Confirm arrows disable at both ends and ignore input mid-transition.
- Browser console free of errors throughout.

## Risks

| Risk | Handling |
| --- | --- |
| Unmounting `EffectComposer` inside a live Canvas may leak render targets | The memory-counter check is a real gate. If it leaks, worlds share one composer owned by the shell and pass their effect list up to it. |
| Supplied GLBs may not use the node name `dogmodel` | `nodeName` is world config, defaulting to `"dogmodel"`. `Dog.jsx` throws a named error rather than rendering nothing when the node is missing. |
| `useGLTF` caches by URL; unmounting frees nothing | Accepted — three small models. `useGLTF.clear()` is available if it ever matters. |
| Decomposing a 674-line file in one pass | Verbatim moves only, screenshot-compared, committed per extraction so a regression bisects cleanly. |
| Base-path regression on Pages | Every asset keeps routing through `import.meta.env.BASE_URL`. Verified by serving the build under a `/vscodemainrepo/` prefix before pushing. |

## Limitations

Carried forward from the previous spec, unchanged and deliberate.

- Desktop only. Interaction is pointer-driven and the page sets `cursor: none`.
- No `prefers-reduced-motion` handling.
- No fallback when WebGL is unavailable.
- No deep-linking; worlds are not addressable by URL.

## Roadmap

1. **This spec** — the shell, the luxury decomposition, two working stubs.
2. **Spec 2 — middle class.** Its scene, palette, instrument, and document.
3. **Spec 3 — stray.** The same, and the bottom of the descent.
