# World Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single luxury scene into the first of three arrow-navigable worlds, by building the shell that hosts a world, decomposing the existing scene to fit it, and shipping two working stubs.

**Architecture:** A world is a config object in an ordered registry; the shell never branches on which world is active. One `<Canvas>` is created for the life of the page and only the React subtree inside it swaps, so switching costs no WebGL context. Navigation is a pure reducer. The transition fades through black and reveals on a readiness signal fired from inside the world's Suspense boundary, never on a timer alone.

**Tech Stack:** React 18, Vite 5, three.js 0.168, @react-three/fiber, @react-three/drei, @react-three/postprocessing. Tests use Node's built-in runner — no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-12-world-shell-design.md`

## Global Constraints

- **No new runtime or dev dependencies.** Tests use `node --test`, built into Node 18+.
- **Project root for every path and command below:** `projects/dogs-gold/`.
- `npm run build`, `npm test`, and `./node_modules/.bin/vite` all work directly. The old `node node_modules/vite/bin/vite.js` workaround is **no longer needed** — the execute bits were restored by a later `npm install`.
- **Desktop only.** No touch support, no `prefers-reduced-motion`, no WebGL fallback. Do not add them.
- **`preserveDrawingBuffer: true` and `alpha: false` stay on the `<Canvas>` forever.** They are fixed at context creation and cannot be per-world. The luxury caption sampler depends on the first.
- **The luxury world must look and behave identically when this plan is done.** Every extraction is a verbatim move. Screenshot before, screenshot after.
- **Preserve the `useFrame` priority chain exactly:** `-2` pointer projector, `-1` physics, `-0.5` selection, `0` dog transforms, `1` effect composer.
- **Nothing outside `projects/dogs-gold/` is touched**, except one clause in the root `README.md` in Task 11.
- Every `public/` asset must keep routing through `import.meta.env.BASE_URL`. A root-absolute path 404s under the `/vscodemainrepo/` Pages prefix and yields an empty scene with no error.

## World Contract

Every world exports a default config object. The shell reads only these keys.

| Key | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | string | yes | stable identifier |
| `label` | string | yes | shown between the arrows |
| `pageBackground` | CSS colour | yes | painted behind the canvas; visible during transitions |
| `camera` | `{ fov, near, far }` | yes | applied imperatively on mount |
| `Scene` | component | yes | in-canvas subtree |
| `instrument` | `{ src, size, cx, cy, radius }` | yes | art plus measured ratios |
| `selection` | `{ radius, releaseMargin, dwellMs }` | yes | passed to `DogSelector` |
| `Card` | component | no | DOM reveal content; omit for no card |
| `cardStyle` | style object | no | merged over the shared card container |
| `Instrument` | component | no | overrides the shared positioner entirely |
| `Overlay` | component | no | extra DOM drawn inside the shell wrapper |

**Note on `Overlay`:** this key is not in the spec. It emerged in planning because the luxury caption is a DOM element that must share a ref with the in-canvas `TextColorSampler`. Rather than widen the contract with a generic ref-passing mechanism, the caption and the sampler share a module-scoped ref object — the same idiom the codebase already uses for `pointer`. `Overlay` is simply the slot the caption renders into.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/App.jsx` | Modify — shell only: canvas, curtain, arrows, world mount |
| `src/shell/navigation.js` | Create — pure reducer for index and transition phase |
| `src/shell/navigation.test.js` | Create — tests for the above |
| `src/shell/Arrows.jsx` | Create — bottom-centre navigation DOM |
| `src/shell/Curtain.jsx` | Create — fade overlay |
| `src/shell/WorldReady.jsx` | Create — first-frame-ready signal |
| `src/shell/ApplyCamera.jsx` | Create — applies world camera config in-canvas |
| `src/shared/usePointer.js` | Move from `src/hooks/` — unchanged |
| `src/shared/selection.js` | Move from `src/loupe/` — unchanged |
| `src/shared/selection.test.js` | Move from `src/loupe/` — unchanged |
| `src/shared/useDogSelection.js` | Move from `src/loupe/` — radii now from config |
| `src/shared/physics.js` | Create — parameterized physics extracted from `DogsPhysics` |
| `src/shared/Dog.jsx` | Create — parameterized dog mesh |
| `src/shared/Instrument.jsx` | Create — pointer-following positioner |
| `src/shared/Card.jsx` | Create — positioned, fading container |
| `src/worlds/registry.js` | Create — ordered world array |
| `src/worlds/luxury/index.js` | Create — the luxury config object |
| `src/worlds/luxury/Scene.jsx` | Create — luxury in-canvas composition |
| `src/worlds/luxury/background.js` | Create — gold-river shader, moved verbatim |
| `src/worlds/luxury/material.js` | Create — gold dog material factory |
| `src/worlds/luxury/creds.js` | Move from `src/loupe/` — unchanged |
| `src/worlds/luxury/creds.test.js` | Move from `src/loupe/` — unchanged |
| `src/worlds/luxury/Certificate.jsx` | Create — card content, extracted from `CredsCard` |
| `src/worlds/luxury/Caption.jsx` | Create — bottom-right text, plus the shared caption ref |
| `src/worlds/luxury/TextColorSampler.jsx` | Create — moved verbatim |
| `src/worlds/luxury/RippleWarp.jsx` | Create — brush trail and warp pass, moved verbatim |
| `src/worlds/middle/` | Create — stub world |
| `src/worlds/stray/` | Create — stub world |
| `eslint.config.js` | Modify — disable two misapplied rules |
| `package.json` | Modify — test script |
| `README.md` | Modify — replace Vite boilerplate |

`src/hooks/` and `src/loupe/` cease to exist.

---

### Task 1: Cleanup, lint config, and the test script

Clears the noise before any restructuring, so later tasks have a lint run and a test run that mean something. Nothing here changes runtime behaviour.

**Files:**
- Delete: `src/RippleEffect.js`, `src/shader/`, `src/Aperture-Lens.gif`, `src/newdesign.png`, `src/lens.pdf`, `src/assets/`, `public/upgradeddog-v1.glb`, `public/Upgradeddog-v1.jsx`
- Modify: `eslint.config.js`, `package.json`, `src/App.jsx`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` runs recursively; `npm run lint` reports only meaningful findings. Both relied on by every later task.

- [ ] **Step 1: Delete the dead files**

All eight are confirmed unused by search. The two under `public/` are currently being copied into `dist/` and deployed.

```bash
cd projects/dogs-gold
git rm -r src/shader src/assets
git rm src/RippleEffect.js src/Aperture-Lens.gif src/newdesign.png src/lens.pdf
git rm public/upgradeddog-v1.glb public/Upgradeddog-v1.jsx
```

- [ ] **Step 2: Confirm nothing referenced them**

Run: `grep -rn "RippleEffect\|Aperture-Lens\|newdesign\|lens.pdf\|react.svg\|shader/\|upgradeddog-v1.glb\|Upgradeddog-v1.jsx" src/ index.html vite.config.js`

Expected: no output. `upgradeddog-v1-transformed.glb` is the model still in use and must NOT appear in the deletions — it is a different filename and the grep above will not match it.

- [ ] **Step 3: Fix the lint configuration**

Two rules produce 152 of the 159 findings and are both wrong for this project. Replace the `rules` block in `eslint.config.js` with:

```js
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',

      // react-three-fiber extends JSX with three.js properties
      // (<ambientLight intensity>, <mesh geometry>, …). This rule only knows
      // the DOM's property list, so every r3f element is a false positive.
      'react/no-unknown-property': 'off',

      // This project uses no PropTypes anywhere and passes refs freely between
      // components. The rule fires 139 times and finds nothing real.
      'react/prop-types': 'off',

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
```

- [ ] **Step 4: Fix the one real lint finding**

`src/App.jsx` line 558 destructures `gl` in `Scene` and never uses it. Change:

```jsx
  const { viewport, camera, gl } = useThree();
```

to:

```jsx
  const { viewport, camera } = useThree();
```

- [ ] **Step 5: Annotate the five deliberate hook warnings**

These are intentional and must NOT be "fixed" by adding dependencies — doing so would recreate the render target and camera on every resize, which is exactly what the separate resize effect exists to avoid. Add an explanatory disable above each.

In `RippleScene`, above the `camera` `useMemo` (ends line 66) and the `rt` `useMemo` (ends line 76):

```jsx
  // Deliberately created once. A resize must mutate these in place — see the
  // effect below — not build a new camera and render target every time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
```

Above the resize `useEffect` (ends line 87) and the brush-loading `useEffect` (ends line 112):

```jsx
  // eslint-disable-next-line react-hooks/exhaustive-deps
```

In `Dog`, above the `material` `useMemo` (ends line 476):

```jsx
  // Each dog picks its gold hue once, at mount. Re-running this on a material
  // change would reshuffle all fifty colours mid-scene.
  // eslint-disable-next-line react-hooks/exhaustive-deps
```

- [ ] **Step 6: Fix the test script**

The current script relies on the shell expanding a glob, which breaks as soon as tests move deeper than two levels — `sh` has `globstar` off, so `src/**/*.test.js` silently collapses to `src/*/*.test.js` and skips files without failing.

In `package.json`, change:

```json
    "test": "node --test src/loupe/*.test.js",
```

to:

```json
    "test": "node --test",
```

Node walks the working directory recursively and skips `node_modules` itself. Verified to find all current tests on Node 20.20.2 and Node 24.14.1.

- [ ] **Step 7: Verify all three gates**

```bash
npm test          # expect: 16 pass, 0 fail
npm run lint      # expect: 0 problems
npm run build     # expect: "✓ built in …"
```

Then confirm the dead assets are gone from the build output:

```bash
ls dist/ | grep -i "Upgradeddog-v1.jsx\|^upgradeddog-v1.glb$" || echo "OK: dead assets no longer deployed"
```

Expected: `OK: dead assets no longer deployed`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore(dogs-gold): remove dead files, fix lint config and test script"
```

---

### Task 2: Navigation reducer

A pure state machine, matching the pattern `selection.js` already establishes. Keeping it pure is what makes the transition timing testable without a browser.

**Files:**
- Create: `src/shell/navigation.js`
- Test: `src/shell/navigation.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `IDLE`, `COVERING`, `REVEALING` — phase string constants
  - `INITIAL` — `{ index: 0, pending: null, phase: IDLE }`
  - `nextNavigation(state, action, worldCount) -> state`, where `action` is
    `{ type: "go", delta: -1 | 1 }`, `{ type: "covered" }`, or `{ type: "revealed" }`
  - Consumed by Task 9.

- [ ] **Step 1: Write the failing test**

```js
// src/shell/navigation.test.js
import test from "node:test"
import assert from "node:assert/strict"
import { nextNavigation, INITIAL, IDLE, COVERING, REVEALING } from "./navigation.js"

const COUNT = 3
const go = (delta) => ({ type: "go", delta })

test("starts idle on the first world", () => {
  assert.equal(INITIAL.index, 0)
  assert.equal(INITIAL.phase, IDLE)
  assert.equal(INITIAL.pending, null)
})

test("going forward starts covering without moving yet", () => {
  const s = nextNavigation(INITIAL, go(1), COUNT)
  assert.equal(s.phase, COVERING)
  assert.equal(s.pending, 1)
  assert.equal(s.index, 0, "index must not move until the curtain is opaque")
})

test("ignores going back from the first world", () => {
  const s = nextNavigation(INITIAL, go(-1), COUNT)
  assert.deepEqual(s, INITIAL)
})

test("ignores going forward from the last world", () => {
  const last = { index: COUNT - 1, pending: null, phase: IDLE }
  const s = nextNavigation(last, go(1), COUNT)
  assert.deepEqual(s, last)
})

test("ignores input while covering", () => {
  const covering = { index: 0, pending: 1, phase: COVERING }
  const s = nextNavigation(covering, go(1), COUNT)
  assert.deepEqual(s, covering, "queued swaps would land on the wrong world")
})

test("ignores input while revealing", () => {
  const revealing = { index: 1, pending: null, phase: REVEALING }
  const s = nextNavigation(revealing, go(1), COUNT)
  assert.deepEqual(s, revealing)
})

test("covered commits the pending index", () => {
  const covering = { index: 0, pending: 2, phase: COVERING }
  const s = nextNavigation(covering, { type: "covered" }, COUNT)
  assert.equal(s.index, 2)
  assert.equal(s.pending, null)
  assert.equal(s.phase, REVEALING)
})

test("covered is ignored outside covering", () => {
  const s = nextNavigation(INITIAL, { type: "covered" }, COUNT)
  assert.deepEqual(s, INITIAL)
})

test("revealed returns to idle", () => {
  const revealing = { index: 2, pending: null, phase: REVEALING }
  const s = nextNavigation(revealing, { type: "revealed" }, COUNT)
  assert.equal(s.phase, IDLE)
  assert.equal(s.index, 2)
})

test("revealed is ignored outside revealing", () => {
  const covering = { index: 0, pending: 1, phase: COVERING }
  const s = nextNavigation(covering, { type: "revealed" }, COUNT)
  assert.deepEqual(s, covering)
})

test("a full round trip returns to the first world", () => {
  let s = INITIAL
  for (const delta of [1, 1, -1, -1]) {
    s = nextNavigation(s, go(delta), COUNT)
    s = nextNavigation(s, { type: "covered" }, COUNT)
    s = nextNavigation(s, { type: "revealed" }, COUNT)
  }
  assert.equal(s.index, 0)
  assert.equal(s.phase, IDLE)
})

test("an unknown action changes nothing", () => {
  const s = nextNavigation(INITIAL, { type: "wat" }, COUNT)
  assert.deepEqual(s, INITIAL)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./navigation.js`

- [ ] **Step 3: Write the implementation**

```js
// src/shell/navigation.js

// Arrow input during a transition is dropped rather than queued. Queuing it
// lets a held arrow key land the user on a world they never aimed at, with the
// curtain half faded.

export const IDLE = "idle"
export const COVERING = "covering"
export const REVEALING = "revealing"

export const INITIAL = { index: 0, pending: null, phase: IDLE }

export function nextNavigation(state, action, worldCount) {
  switch (action.type) {
    case "go": {
      if (state.phase !== IDLE) return state
      const target = state.index + action.delta
      if (target < 0 || target >= worldCount) return state
      return { index: state.index, pending: target, phase: COVERING }
    }

    case "covered": {
      if (state.phase !== COVERING) return state
      return { index: state.pending, pending: null, phase: REVEALING }
    }

    case "revealed": {
      if (state.phase !== REVEALING) return state
      return { index: state.index, pending: null, phase: IDLE }
    }

    default:
      return state
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 27 tests total (16 existing, 11 here)

- [ ] **Step 5: Commit**

```bash
git add src/shell/navigation.js src/shell/navigation.test.js
git commit -m "feat(shell): navigation state machine for world switching"
```

---

### Task 3: Move the shared pointer and selection modules

A mechanical move. `useDogSelection` additionally stops hardcoding its radii, because they depend on how large a dog *looks*, which differs per world.

**Files:**
- Move: `src/hooks/usePointer.js` → `src/shared/usePointer.js`
- Move: `src/loupe/selection.js` → `src/shared/selection.js`
- Move: `src/loupe/selection.test.js` → `src/shared/selection.test.js`
- Move: `src/loupe/useDogSelection.js` → `src/shared/useDogSelection.js`
- Modify: `src/shared/useDogSelection.js`, `src/App.jsx`

**Interfaces:**
- Consumes: `nextSelection`, `INITIAL` (Task 2 of the previous plan, already built)
- Produces:
  - `pointer`, `startPointerTracking()`, `<PointerProjector planeZ />` from `shared/usePointer.js`
  - `nextSelection`, `INITIAL`, `IDLE`, `PENDING`, `LOCKED` from `shared/selection.js`
  - `<DogSelector physicsRef selectionRef count selection />` where `selection` is `{ radius, releaseMargin, dwellMs }`
  - Consumed by Tasks 4, 6, 8, 9, 10.

- [ ] **Step 1: Move the files**

```bash
cd projects/dogs-gold
mkdir -p src/shared
git mv src/hooks/usePointer.js src/shared/usePointer.js
git mv src/loupe/selection.js src/shared/selection.js
git mv src/loupe/selection.test.js src/shared/selection.test.js
git mv src/loupe/useDogSelection.js src/shared/useDogSelection.js
rmdir src/hooks
```

`selection.js`, `selection.test.js`, and `usePointer.js` change in no other way. `selection.test.js` imports `./selection.js`, which is still correct after the move.

- [ ] **Step 2: Make the selection radii configurable**

Replace `src/shared/useDogSelection.js` entirely:

```jsx
import { useFrame } from "@react-three/fiber"
import { pointer } from "./usePointer"
import { nextSelection } from "./selection"

// Selection is a nearest-neighbour scan over the physics array that already
// exists — ~50 distance comparisons per frame, negligible beside the existing
// 1225-pair collision loop. No raycaster, no per-dog colliders.
//
// The radii are per-world config rather than constants here. They must be sized
// against how large a dog *looks* through that world's instrument, not against
// COLLISION_RADIUS: in luxury, deriving them from the 0.75 collision radius put
// the hot zone at ~14px, so the glass would sit squarely on a dog and select
// nothing.
export function DogSelector({ physicsRef, selectionRef, count, selection }) {
  useFrame(() => {
    const dogs = physicsRef.current
    // worldSmooth, not world: selection must agree with where the instrument
    // is drawn.
    const mw = pointer.worldSmooth
    if (!dogs || !dogs.length || !mw) return

    let nearestIndex = null
    let nearestDistance = Infinity
    let activeDistance = null
    const active = selectionRef.current.index

    for (let i = 0; i < count; i++) {
      const d = dogs[i]
      const dx = d.x - mw.x
      const dy = d.y - mw.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearestDistance) {
        nearestDistance = dist
        nearestIndex = i
      }
      if (i === active) activeDistance = dist
    }

    selectionRef.current = nextSelection(selectionRef.current, {
      nearestIndex,
      nearestDistance,
      activeDistance,
      now: performance.now(),
      selectRadius: selection.radius,
      releaseMargin: selection.releaseMargin,
      dwellMs: selection.dwellMs,
    })
  }, -0.5) // after PointerProjector (-2) and DogsPhysics (-1), before Dog (0)

  return null
}
```

- [ ] **Step 3: Update the imports and the call site in `App.jsx`**

Change the three import paths:

```jsx
import { pointer, startPointerTracking, PointerProjector } from "./shared/usePointer";
import { DogSelector } from "./shared/useDogSelection";
import { INITIAL } from "./shared/selection";
```

`src/loupe/Loupe.jsx` and `src/loupe/CredsCard.jsx` also import from `../hooks/usePointer`. Change both to `../shared/usePointer`. `CredsCard.jsx` imports `LOCKED` from `./selection` — change to `../shared/selection`.

Then pass the radii at the `DogSelector` call site in `Scene`, replacing the existing element:

```jsx
        <DogSelector
          physicsRef={physicsRef}
          selectionRef={selectionRef}
          count={count}
          selection={{ radius: 4.0, releaseMargin: 1.0, dwellMs: 500 }}
        />
```

These are the exact values `useDogSelection.js` used as constants, so behaviour is unchanged. They move into world config in Task 8.

- [ ] **Step 4: Verify**

```bash
npm test          # expect: 27 pass
npm run lint      # expect: 0 problems
npm run build     # expect: success
```

Then run the app and confirm nothing changed:

```bash
npm run dev
```

Open the page. Expected, all identical to before: dogs drift and collide, the mouse pushes them, the loupe follows the pointer, holding it over a dog for half a second shows the credentials card. Console free of errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(dogs-gold): move pointer and selection into shared/"
```

---

### Task 4: Extract the physics loop

`DogsPhysics` currently hardcodes the collision radius, the speed range, and a barrier box that exists only to keep dogs off the luxury caption. All three become config.

**Files:**
- Create: `src/shared/physics.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `pointer` from `shared/usePointer.js`
- Produces:
  - `createDogs({ count, hw2, hh2, z, speedMin, speedSpread, spread }) -> Dog[]` where each entry is `{ x, y, z, vx, vy, baseSpeed, rX, rY, rZ }`
  - `<DogsPhysics physicsRef count hw hh config />` where `config` is `{ collisionRadius, barriers, repulsionRadius, repulsionGain }` and `barriers` is an array of `{ x0, y0, x1, y1 }` in world units
  - `DEFAULT_PHYSICS` — the luxury values, used by the stubs
  - Consumed by Tasks 8 and 10.

- [ ] **Step 1: Write the module**

The loop body below is the current `DogsPhysics` arithmetic with three substitutions: `COLLISION_RADIUS` becomes `config.collisionRadius`, the single hardcoded barrier becomes a loop over `config.barriers`, and the repulsion radius and gain become config. Nothing else changes — the drag, spin, flash, and collision-response numbers are identical.

```jsx
// src/shared/physics.js
import { useFrame } from "@react-three/fiber"
import { pointer } from "./usePointer"

export const DEFAULT_PHYSICS = {
  collisionRadius: 0.75,
  barriers: [],
  repulsionRadius: 4.5,
  repulsionGain: 0.06,
}

export function createDogs({
  count,
  hw2,
  hh2,
  z,
  speedMin = 0.005,
  speedSpread = 0.008,
  spread = 0.9,
}) {
  return Array.from({ length: count }, () => {
    const speed = speedMin + Math.random() * speedSpread
    const angle = Math.random() * Math.PI * 2
    return {
      x: (Math.random() - 0.5) * hw2 * spread,
      y: (Math.random() - 0.5) * hh2 * spread,
      z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      baseSpeed: speed,
      rX: Math.random() * Math.PI,
      rY: Math.random() * Math.PI,
      rZ: Math.random() * Math.PI,
    }
  })
}

export function DogsPhysics({ physicsRef, count, hw, hh, config = DEFAULT_PHYSICS }) {
  useFrame(() => {
    const dogs = physicsRef.current
    if (!dogs.length) return

    const r = config.collisionRadius
    const barriers = config.barriers || []

    // Move + wall bounce
    for (let i = 0; i < count; i++) {
      const d = dogs[i]
      d.x += d.vx
      d.y += d.vy
      if (d.x > hw) {
        d.x = hw
        d.vx *= -1
        d.flash = 0.6
      }
      if (d.x < -hw) {
        d.x = -hw
        d.vx *= -1
        d.flash = 0.6
      }
      if (d.y > hh) {
        d.y = hh
        d.vy *= -1
        d.flash = 0.6
      }
      if (d.y < -hh) {
        d.y = -hh
        d.vy *= -1
        d.flash = 0.6
      }

      // Barrier boxes — dogs bounce off the edges of each. Resolved along the
      // smallest penetration axis so a dog leaves the way it came in.
      for (let b = 0; b < barriers.length; b++) {
        const { x0, y0, x1, y1 } = barriers[b]
        if (d.x + r > x0 && d.x - r < x1 && d.y + r > y0 && d.y - r < y1) {
          const penLeft = d.x + r - x0
          const penBottom = d.y + r - y0
          const penRight = x1 - (d.x - r)
          const penTop = y1 - (d.y - r)
          const minPen = Math.min(penLeft, penBottom, penRight, penTop)
          if (minPen === penLeft) {
            d.x = x0 - r
            if (d.vx > 0) d.vx *= -1
          } else if (minPen === penTop) {
            d.y = y1 + r
            if (d.vy < 0) d.vy *= -1
          } else if (minPen === penRight) {
            d.x = x1 + r
            if (d.vx < 0) d.vx *= -1
          } else {
            d.y = y0 - r
            if (d.vy > 0) d.vy *= -1
          }
          d.flash = 0.6
        }
      }

      // Mouse repulsion — force scales with mouse speed
      const mw = pointer.world
      const ms = pointer.speed
      if (mw) {
        const mdx = d.x - mw.x
        const mdy = d.y - mw.y
        const md2 = mdx * mdx + mdy * mdy
        const radius = config.repulsionRadius
        if (md2 < radius * radius && md2 > 0.001) {
          const md = Math.sqrt(md2)
          const falloff = 1 - md / radius
          const awayX = mdx / md
          const awayY = mdy / md
          // Impact scales with mouse speed — dead zone for slow movement
          const effectiveSpeed = Math.max(ms - 0.15, 0)
          const impact = Math.min(effectiveSpeed * config.repulsionGain, 0.05) * falloff
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

      d.flash = (d.flash || 0) * 0.85
    }

    // Collision detection
    const minDist = r * 2
    const minDist2 = minDist * minDist
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = dogs[i],
          b = dogs[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist2 = dx * dx + dy * dy
        if (dist2 > minDist2 || dist2 === 0) continue
        const dist = Math.sqrt(dist2)
        const nx = dx / dist,
          ny = dy / dist
        const dvx = a.vx - b.vx,
          dvy = a.vy - b.vy
        const dot = dvx * nx + dvy * ny
        if (dot <= 0) continue
        a.vx -= dot * nx
        a.vy -= dot * ny
        b.vx += dot * nx
        b.vy += dot * ny
        const overlap = (minDist - dist) / 2
        a.x -= overlap * nx
        a.y -= overlap * ny
        b.x += overlap * nx
        b.y += overlap * ny
        a.flash = 1.0
        b.flash = 1.0
      }
    }
  }, -1)

  return null
}
```

- [ ] **Step 2: Use it from `App.jsx`**

Delete the whole `// --- Physics manager ---` section from `App.jsx`: the `COLLISION_RADIUS` constant and the entire `DogsPhysics` function. Add the import:

```jsx
import { DogsPhysics, createDogs } from "./shared/physics";
```

In `Scene`, replace the `physicsRef` initialiser with a call to `createDogs`, and pass the luxury config to `DogsPhysics`. The barrier reproduces the old hardcoded box exactly — bottom-right, from 55% of each half-extent to the corner:

```jsx
  const physicsRef = useRef(
    createDogs({ count, hw2, hh2, z: -40 }),
  );

  const physicsConfig = useMemo(
    () => ({
      collisionRadius: 0.75,
      // Keeps dogs off the bottom-right caption.
      barriers: [{ x0: hw * 0.55, y0: -hh, x1: hw, y1: -hh * 0.55 }],
      repulsionRadius: 4.5,
      repulsionGain: 0.06,
    }),
    [hw, hh],
  );
```

and change the element to:

```jsx
        <DogsPhysics
          physicsRef={physicsRef}
          count={count}
          hw={hw}
          hh={hh}
          config={physicsConfig}
        />
```

- [ ] **Step 3: Verify behaviour is unchanged**

```bash
npm run lint && npm run build && npm run dev
```

Expected: dogs still bounce off the walls; still bounce off an invisible box in the bottom-right around the caption; the mouse still pushes them harder when moved fast; dogs still flash on collision. Console free of errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(dogs-gold): extract parameterized physics into shared/"
```

---

### Task 5: Extract the dog mesh

**Files:**
- Create: `src/shared/Dog.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: nothing beyond r3f and three
- Produces: `<Dog index physicsRef selectionRef modelUrl nodeName makeMaterial scale selectedScale lift selectedEmissive />` where `makeMaterial(index, materials) -> THREE.Material`
- Consumed by Tasks 8 and 10.

- [ ] **Step 1: Write the module**

The `useFrame` body is today's `Dog` verbatim; only the constants become props and the geometry lookup gains an error.

```jsx
// src/shared/Dog.jsx
import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"

export default function Dog({
  index,
  physicsRef,
  selectionRef,
  modelUrl,
  nodeName = "dogmodel",
  makeMaterial,
  scale,
  selectedScale,
  lift,
  selectedEmissive = "#3a2a00",
}) {
  const ref = useRef()
  const { nodes, materials } = useGLTF(modelUrl)

  const node = nodes[nodeName]
  if (!node) {
    // Without this the mesh renders nothing and the world looks empty with no
    // error at all — the same silent failure mode as a 404'd model.
    throw new Error(
      `Dog: node "${nodeName}" not found in ${modelUrl}. ` +
        `Available nodes: ${Object.keys(nodes).join(", ")}`,
    )
  }

  // Each dog picks its material once, at mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => makeMaterial(index, materials), [])

  const emissiveTarget = useMemo(
    () => new THREE.Color(selectedEmissive),
    [selectedEmissive],
  )
  const emissiveOff = useMemo(() => new THREE.Color("#000000"), [])

  useFrame(() => {
    const d = physicsRef.current[index]
    if (!d || !ref.current) return

    const sel = selectionRef.current
    const isSelected = sel.index === index && sel.phase !== "idle"

    // One code path for select and release: everything follows the scale lerp,
    // so deselection is the same animation run backwards.
    const targetScale = isSelected ? selectedScale : scale
    const s = ref.current.scale.x + (targetScale - ref.current.scale.x) * 0.12
    ref.current.scale.setScalar(s)

    const grown = (s - scale) / (selectedScale - scale)
    ref.current.position.set(d.x, d.y, d.z + lift * grown)
    ref.current.rotation.set(d.rX, d.rY, d.rZ)

    if (material.emissive) {
      material.emissive.lerp(isSelected ? emissiveTarget : emissiveOff, 0.12)
    }
  }, 0)

  return (
    <mesh ref={ref} geometry={node.geometry} material={material} scale={scale} />
  )
}
```

- [ ] **Step 2: Use it from `App.jsx`**

Delete the whole `// --- Dog component ---` section: `MODEL_URL`, `DOG_SCALE`, `DOG_SCALE_SELECTED`, `DOG_LIFT`, and the `Dog` function. Add:

```jsx
import Dog from "./shared/Dog";
import { makeGoldMaterial } from "./worlds/luxury/material";
```

Create `material.js` now, holding exactly the material logic being deleted from `Dog` — the `mkdir -p src/worlds/luxury` in Task 6 is not needed yet, so create the directory here:

```js
// src/worlds/luxury/material.js
export function makeGoldMaterial(index, materials) {
  const mat = materials.skin.clone()
  mat.color.setHSL(
    0.11 + Math.random() * 0.06,
    0.7 + Math.random() * 0.3,
    0.35 + Math.random() * 0.35,
  )
  return mat
}
```

Add the model URL back at module scope in `App.jsx` — it moves into world config in Task 8:

```jsx
// Served from /vscodemainrepo/ on Pages, so a root-absolute path would 404 and
// leave an empty gold scene with no obvious error. BASE_URL always ends in "/".
const MODEL_URL = `${import.meta.env.BASE_URL}upgradeddog-v1-transformed.glb`;
```

Replace the dog list in `Scene`:

```jsx
        {Array.from({ length: count }, (_, i) => (
          <Dog
            key={i}
            index={i}
            physicsRef={physicsRef}
            selectionRef={selectionRef}
            modelUrl={MODEL_URL}
            makeMaterial={makeGoldMaterial}
            scale={0.065}
            selectedScale={0.12}
            lift={3.5}
          />
        ))}
```

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build && npm run dev
```

Expected: fifty gold dogs, each a slightly different hue; holding the loupe over one grows it, lifts it toward the camera, and warms it; moving away shrinks it back. Console free of errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(dogs-gold): extract parameterized dog mesh into shared/"
```

---

### Task 6: Extract the instrument positioner and the card container

Both split the same way: the shared module owns the mechanics, the world owns the appearance.

**Files:**
- Create: `src/shared/Instrument.jsx`, `src/shared/Card.jsx`
- Create: `src/worlds/luxury/Certificate.jsx`
- Move: `src/loupe/loupe.png` → `src/worlds/luxury/loupe.png`
- Delete: `src/loupe/Loupe.jsx`, `src/loupe/CredsCard.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `pointer` from `shared/usePointer.js`, `LOCKED` from `shared/selection.js`
- Produces:
  - `instrumentGeometry({ size, cx, cy, radius }) -> { cxPx, cyPx, radiusPx }`
  - `<Instrument instrument />` — the pointer-following image
  - `<Card selectionRef instrument Content style />` — positioned, fading container rendering `<Content index />`
  - Consumed by Tasks 8, 9 and 10.

- [ ] **Step 1: Write the instrument positioner**

```jsx
// src/shared/Instrument.jsx
import { useEffect, useRef } from "react"
import { pointer } from "./usePointer"

// The ratios are measured properties of each world's art: where the active
// point sits within the image, as a fraction of its width. The luxury loupe's
// handle occupies the lower right, so centring the PNG on the pointer would put
// the handle under the cursor instead of the glass.
export function instrumentGeometry({ size, cx, cy, radius }) {
  return {
    cxPx: size * cx,
    cyPx: size * cy,
    radiusPx: size * radius,
  }
}

export default function Instrument({ instrument }) {
  const ref = useRef()
  const { cxPx, cyPx } = instrumentGeometry(instrument)

  useEffect(() => {
    let id
    const tick = () => {
      if (ref.current) {
        const x = pointer.smooth.x - cxPx
        const y = pointer.smooth.y - cyPx
        ref.current.style.transform = `translate(${x}px, ${y}px)`
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [cxPx, cyPx])

  return (
    <img
      ref={ref}
      src={instrument.src}
      alt=""
      draggable={false}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: instrument.size,
        height: instrument.size,
        pointerEvents: "none",
        zIndex: 9999,
        willChange: "transform",
        display: "block",
      }}
    />
  )
}
```

- [ ] **Step 2: Write the card container**

```jsx
// src/shared/Card.jsx
import { useEffect, useRef, useState } from "react"
import { pointer } from "./usePointer"
import { instrumentGeometry } from "./Instrument"
import { LOCKED } from "./selection"

const CARD_WIDTH = 250
const GAP = 28

export default function Card({ selectionRef, instrument, Content, style }) {
  const boxRef = useRef()
  // Only the locked index lives in React state — it changes rarely. Position
  // is written straight to the DOM each frame to avoid re-rendering at 60fps.
  const [lockedIndex, setLockedIndex] = useState(null)
  const { radiusPx } = instrumentGeometry(instrument)

  useEffect(() => {
    let id
    const tick = () => {
      const sel = selectionRef.current
      const next = sel.phase === LOCKED ? sel.index : null
      setLockedIndex((prev) => (prev === next ? prev : next))

      if (boxRef.current) {
        // Default to the LEFT of the instrument: the loupe's handle juts out to
        // the lower right, so a right-hand card would sit on top of it. Flip to
        // the right only when there is no room on the left.
        const leftX = pointer.smooth.x - radiusPx - GAP - CARD_WIDTH
        const x = leftX < 16 ? pointer.smooth.x + radiusPx + GAP : leftX
        const y = Math.min(
          Math.max(pointer.smooth.y - 60, 16),
          window.innerHeight - 220,
        )
        boxRef.current.style.transform = `translate(${x}px, ${y}px)`
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [selectionRef, radiusPx])

  return (
    <div
      ref={boxRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: CARD_WIDTH,
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 9998,
        opacity: lockedIndex === null ? 0 : 1,
        transition: "opacity 250ms ease",
        willChange: "transform, opacity",
        ...style,
      }}
    >
      {lockedIndex !== null && <Content index={lockedIndex} />}
    </div>
  )
}
```

- [ ] **Step 3: Write the luxury card content**

This is the body of the old `CredsCard`, with its `Row` helper, unchanged.

```jsx
// src/worlds/luxury/Certificate.jsx
import { credsFor } from "./creds"

// The container's own appearance lives in the world config's `cardStyle`.
export const certificateStyle = {
  background: "rgba(10, 8, 0, 0.82)",
  border: "1px solid rgba(255, 224, 0, 0.35)",
  padding: "1rem 1.15rem",
  fontFamily: "'Josefin Sans', sans-serif",
  color: "#ffe000",
  fontSize: "0.68rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  lineHeight: 2,
}

export default function Certificate({ index }) {
  const creds = credsFor(index)
  return (
    <>
      <div style={{ fontSize: "0.95rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
        {creds.name}
      </div>
      <Row label="Age" value={`${creds.age} yrs`} />
      <Row label="Origin" value={creds.location} />
      <Row label="Pedigree" value={creds.pedigree} />
      <Row label="Grade" value={creds.grade} />
      <Row label="Cert" value={creds.certificate} />
      <Row label="Value" value={creds.price} />
    </>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span style={{ opacity: 0.55 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
```

- [ ] **Step 4: Move the remaining loupe files and delete the old components**

```bash
cd projects/dogs-gold
mkdir -p src/worlds/luxury
git mv src/loupe/loupe.png src/worlds/luxury/loupe.png
git mv src/loupe/creds.js src/worlds/luxury/creds.js
git mv src/loupe/creds.test.js src/worlds/luxury/creds.test.js
git rm src/loupe/Loupe.jsx src/loupe/CredsCard.jsx
```

`src/loupe/` is now empty and gone. `creds.test.js` imports `./creds.js`, still correct.

- [ ] **Step 5: Wire the new components into `App.jsx`**

Replace the `Loupe` and `CredsCard` imports:

```jsx
import Instrument from "./shared/Instrument";
import Card from "./shared/Card";
import Certificate, { certificateStyle } from "./worlds/luxury/Certificate";
import loupePng from "./worlds/luxury/loupe.png";

// Moves into world config in Task 8.
const LUXURY_INSTRUMENT = {
  src: loupePng,
  size: 260,
  cx: 0.359,
  cy: 0.342,
  radius: 0.220,
};
```

In the returned JSX, replace `<Loupe />` with:

```jsx
      <Instrument instrument={LUXURY_INSTRUMENT} />
```

and replace `<CredsCard selectionRef={selectionRef} />` with:

```jsx
      <Card
        selectionRef={selectionRef}
        instrument={LUXURY_INSTRUMENT}
        Content={Certificate}
        style={certificateStyle}
      />
```

- [ ] **Step 6: Verify**

```bash
npm test          # expect: 27 pass
npm run lint      # expect: 0 problems
npm run build && npm run dev
```

Expected: the loupe still tracks the pointer with the glass ring centred on it and the handle trailing to the lower right; holding it over a dog for half a second still fades in the gold-bordered card to the left; near the left edge the card still flips to the right. Console free of errors.

**The measured ratios `0.359 / 0.342 / 0.220` are correct and confirmed at the machine — do not adjust them.**

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(dogs-gold): split instrument and card into shared mechanics + world appearance"
```

---

### Task 7: Extract the luxury-only modules

Everything left in `App.jsx` that belongs to luxury alone: the background shader, the ripple and warp passes, the caption, and its colour sampler.

**Files:**
- Create: `src/worlds/luxury/background.js`, `src/worlds/luxury/RippleWarp.jsx`, `src/worlds/luxury/Caption.jsx`, `src/worlds/luxury/TextColorSampler.jsx`
- Move: `src/burash01.png` → `src/worlds/luxury/burash01.png`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `pointer` from `shared/usePointer.js`
- Produces:
  - `<DiamondBackground />` from `background.js`
  - `<RippleWarp />` — self-contained; owns its displacement ref internally
  - `<Caption />` and `captionRef` from `Caption.jsx`
  - `<TextColorSampler />` — reads `captionRef` directly, takes no props
  - Consumed by Task 8.

- [ ] **Step 1: Move the brush texture**

```bash
cd projects/dogs-gold
git mv src/burash01.png src/worlds/luxury/burash01.png
```

- [ ] **Step 2: Create `background.js`**

Copy `riverVert` and `riverFrag` **verbatim** from the `// --- Diamond background ---` section of `App.jsx`. Do not retype the shader source — copy it, so a stray character cannot change the look.

**Locate code by its banner comment, never by line number.** Task 1 inserted comment lines into `App.jsx`, so every line number in the original file has shifted.

```js
// src/worlds/luxury/background.js
import * as THREE from "three"
import { useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"

// Copy verbatim: the `riverVert` template literal under the
// `// --- Diamond background ---` banner in App.jsx.
const riverVert = `…`

// Copy verbatim: the `riverFrag` template literal under the same banner.
// ~85 lines: hash, noise, fbm, goldPalette, and main with two domain-warp
// passes. It must arrive character-for-character.
const riverFrag = `…`

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
```

- [ ] **Step 3: Create `RippleWarp.jsx`**

`RippleScene` and `WarpPass` currently communicate through a `displacementRef` owned by `Scene`. Nothing else uses it, so it becomes internal and the two components merge into one export.

Copy the bodies of `warpFrag`, `WarpEffectImpl`, `RippleScene`, and `WarpPass` **verbatim** from `App.jsx`, locating each by its banner comment rather than by line number. Keep the eslint-disable comments Task 1 added inside `RippleScene`. The wrapper is:

```jsx
// src/worlds/luxury/RippleWarp.jsx
import * as THREE from "three"
import { useMemo, useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { EffectComposer, DepthOfField, wrapEffect } from "@react-three/postprocessing"
import { Effect } from "postprocessing"
import { pointer } from "../../shared/usePointer"
import brush from "./burash01.png"

// All four below are copied verbatim from App.jsx, from under the banners
// `// --- Warp post-processing effect ---`, `// --- Brush stroke renderer ---`,
// and `// --- Warp pass ---`.
const warpFrag = `…`

class WarpEffectImpl extends Effect { /* … */ }

const WarpEffect = wrapEffect(WarpEffectImpl)

function RippleScene({ displacementRef }) { /* … */ }

function WarpPass({ displacementRef }) { /* … */ }

export default function RippleWarp() {
  const displacementRef = useRef(null)
  return (
    <>
      <RippleScene displacementRef={displacementRef} />
      <WarpPass displacementRef={displacementRef} />
    </>
  )
}
```

- [ ] **Step 4: Create `Caption.jsx`**

The caption is DOM but its colour is chosen by an in-canvas sampler. They share a module-scoped ref — the same idiom `pointer` already uses — rather than threading a ref through the world contract. Only one luxury world is ever mounted, so a module singleton is safe.

```jsx
// src/worlds/luxury/Caption.jsx

// Shared with TextColorSampler, which lives inside the <Canvas> and cannot
// receive a ref from here through React.
export const captionRef = { current: null }

export default function Caption() {
  return (
    <div
      ref={(el) => {
        captionRef.current = el
      }}
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
  )
}
```

- [ ] **Step 5: Create `TextColorSampler.jsx`**

The body is verbatim from `App.jsx` lines 513–552, with `textRef` replaced by the imported `captionRef` and the prop removed.

```jsx
// src/worlds/luxury/TextColorSampler.jsx
import { useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { captionRef } from "./Caption"

export default function TextColorSampler() {
  const { gl } = useThree()
  const lastRun = useRef(0)
  const px = useRef(new Uint8Array(4))

  useFrame(() => {
    if (!captionRef.current) return
    // Each readPixels below forces a CPU/GPU sync. At ~6Hz the caption's
    // existing 0.5s colour transition hides the reduced rate entirely.
    const now = performance.now()
    if (now - lastRun.current < 160) return
    lastRun.current = now

    const rect = captionRef.current.getBoundingClientRect()
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
    captionRef.current.style.color = lum > 0.25 ? "#000000" : "#ffe000"
  })

  return null
}
```

- [ ] **Step 6: Strip the moved code out of `App.jsx`**

Delete these sections entirely: `// --- Warp post-processing effect ---`, `// --- Brush stroke renderer ---`, `// --- Warp pass ---`, `// --- Diamond background ---`, `// --- Text color sampler ---`, and the caption `div` at the bottom of `App`. Delete the now-unused `textRef` and the `brush`, `THREE`, `Effect`, `EffectComposer`, `DepthOfField`, `wrapEffect` imports.

Import and use the new components:

```jsx
import DiamondBackground from "./worlds/luxury/background";
import RippleWarp from "./worlds/luxury/RippleWarp";
import TextColorSampler from "./worlds/luxury/TextColorSampler";
import Caption from "./worlds/luxury/Caption";
```

In `Scene`, `<RippleScene …/>` and `<WarpPass …/>` become a single `<RippleWarp />`, `<TextColorSampler textRef={textRef} />` becomes `<TextColorSampler />`, and `Scene` no longer takes a `textRef` prop. In `App`, the caption `div` becomes `<Caption />`.

- [ ] **Step 7: Verify — this is the screenshot gate**

```bash
npm run lint && npm run build && npm run dev
```

Expected, all identical to before this task: the gold river flows behind the dogs; the brush-stroke warp follows the cursor; depth of field blurs the far dogs; the bottom-right caption flips between black and gold as bright rivers pass beneath it. Compare against a screenshot taken before Task 4. Console free of errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(dogs-gold): extract luxury background, ripple, caption and sampler"
```

---

### Task 8: Assemble the luxury world

`App.jsx`'s `Scene` becomes `worlds/luxury/Scene.jsx`, and every constant scattered through the previous tasks collects into one config object.

**Files:**
- Create: `src/worlds/luxury/Scene.jsx`, `src/worlds/luxury/index.js`, `src/worlds/registry.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: everything from Tasks 3–7
- Produces:
  - `WORLDS` — ordered array from `worlds/registry.js`
  - the luxury config object, shaped per the World Contract table above
  - Consumed by Tasks 9 and 10.

- [ ] **Step 1: Write the luxury scene**

This is `App.jsx`'s `Scene`, minus its `<Suspense>` — the shell owns that in Task 9, so that `WorldReady` sits inside the same boundary.

```jsx
// src/worlds/luxury/Scene.jsx
import { useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { PointerProjector } from "../../shared/usePointer"
import { DogsPhysics, createDogs } from "../../shared/physics"
import { DogSelector } from "../../shared/useDogSelection"
import Dog from "../../shared/Dog"
import DiamondBackground from "./background"
import RippleWarp from "./RippleWarp"
import TextColorSampler from "./TextColorSampler"
import { makeGoldMaterial } from "./material"

const COUNT = 50
const PLANE_Z = -40

export default function Scene({ selectionRef, config }) {
  const { viewport, camera } = useThree()
  const { width: hw2, height: hh2 } = viewport.getCurrentViewport(camera, [0, 0, PLANE_Z])
  const hw = hw2 / 2
  const hh = hh2 / 2

  const physicsRef = useRef(createDogs({ count: COUNT, hw2, hh2, z: PLANE_Z }))

  const physicsConfig = useMemo(
    () => ({
      collisionRadius: 0.75,
      // Keeps dogs off the bottom-right caption.
      barriers: [{ x0: hw * 0.55, y0: -hh, x1: hw, y1: -hh * 0.55 }],
      repulsionRadius: 4.5,
      repulsionGain: 0.06,
    }),
    [hw, hh],
  )

  return (
    <>
      <color attach="background" args={["#0a0800"]} />
      <ambientLight intensity={0.2} />
      <spotLight position={[10, 10, 10]} intensity={1} />
      <PointerProjector planeZ={PLANE_Z} />
      <DiamondBackground />
      <Environment preset="sunset" />
      <DogsPhysics
        physicsRef={physicsRef}
        count={COUNT}
        hw={hw}
        hh={hh}
        config={physicsConfig}
      />
      <DogSelector
        physicsRef={physicsRef}
        selectionRef={selectionRef}
        count={COUNT}
        selection={config.selection}
      />
      {Array.from({ length: COUNT }, (_, i) => (
        <Dog
          key={i}
          index={i}
          physicsRef={physicsRef}
          selectionRef={selectionRef}
          modelUrl={config.modelUrl}
          makeMaterial={makeGoldMaterial}
          scale={0.065}
          selectedScale={0.12}
          lift={3.5}
        />
      ))}
      <RippleWarp />
      <TextColorSampler />
    </>
  )
}
```

- [ ] **Step 2: Write the luxury config**

```js
// src/worlds/luxury/index.js
import Scene from "./Scene"
import Caption from "./Caption"
import Certificate, { certificateStyle } from "./Certificate"
import loupePng from "./loupe.png"

// Served from /vscodemainrepo/ on Pages, so a root-absolute path would 404 and
// leave an empty gold scene with no obvious error. BASE_URL always ends in "/".
const MODEL_URL = `${import.meta.env.BASE_URL}upgradeddog-v1-transformed.glb`

export default {
  id: "luxury",
  label: "Luxury",
  pageBackground: "#0a0800",
  camera: { fov: 80, near: 0.01, far: 110 },

  Scene,
  Overlay: Caption,
  Card: Certificate,
  cardStyle: certificateStyle,

  modelUrl: MODEL_URL,

  // Measured from the asset's alpha channel and confirmed at the machine.
  // Do not adjust: the glass is not at the image centre, because the handle
  // occupies the lower right.
  instrument: {
    src: loupePng,
    size: 260,
    cx: 0.359,
    cy: 0.342,
    radius: 0.220,
  },

  // Sized against the glass, not against the collision radius. The dog plane
  // spans ~67 world units over the viewport height, so the 57px glass ring is
  // ~4.8 units. Deriving this from COLLISION_RADIUS (0.75) put the hot zone at
  // ~14px and the glass selected nothing.
  selection: { radius: 4.0, releaseMargin: 1.0, dwellMs: 500 },
}
```

- [ ] **Step 3: Write the registry**

```js
// src/worlds/registry.js
import luxury from "./luxury"

// Array order is arrow order. Worlds are added in Task 10.
export const WORLDS = [luxury]
```

- [ ] **Step 4: Reduce `App.jsx` to use the registry**

`App.jsx` still holds the shell inline; Task 9 restructures it. For now delete its local `Scene` function and the luxury constants, and render world zero:

```jsx
import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { startPointerTracking } from "./shared/usePointer";
import { INITIAL } from "./shared/selection";
import Instrument from "./shared/Instrument";
import Card from "./shared/Card";
import { WORLDS } from "./worlds/registry";

export default function App() {
  startPointerTracking();
  const selectionRef = useRef(INITIAL);
  const world = WORLDS[0];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: world.pageBackground,
        cursor: "none",
      }}
    >
      <Instrument instrument={world.instrument} />
      <Canvas
        gl={{ alpha: false, preserveDrawingBuffer: true }}
        camera={world.camera}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <world.Scene selectionRef={selectionRef} config={world} />
        </Suspense>
      </Canvas>
      <Card
        selectionRef={selectionRef}
        instrument={world.instrument}
        Content={world.Card}
        style={world.cardStyle}
      />
      <world.Overlay />
    </div>
  );
}
```

- [ ] **Step 5: Verify — the decomposition is complete here**

```bash
npm test && npm run lint && npm run build && npm run dev
```

Expected: **the piece is pixel-identical to how it started.** Compare against the screenshot from before Task 4. `wc -l src/App.jsx` should now report roughly 45 lines, down from 674. Console free of errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(dogs-gold): assemble luxury as the first registry world"
```

---

### Task 9: The shell

**Files:**
- Create: `src/shell/Curtain.jsx`, `src/shell/Arrows.jsx`, `src/shell/WorldReady.jsx`, `src/shell/ApplyCamera.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `nextNavigation`, `INITIAL`, `IDLE`, `COVERING`, `REVEALING` (Task 2); `WORLDS` (Task 8)
- Produces: a working shell. With one world registered the arrows render disabled; Task 10 makes them live.

- [ ] **Step 1: Write the curtain**

```jsx
// src/shell/Curtain.jsx

// Opacity is driven by the shell's phase, not by transition events: a
// transitionend that never fires (backgrounded tab, unchanged opacity) would
// strand the user behind an opaque overlay.
export default function Curtain({ opaque, fadeMs }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        opacity: opaque ? 1 : 0,
        transition: `opacity ${fadeMs}ms ease`,
        pointerEvents: "none",
        zIndex: 10000,
      }}
    />
  )
}
```

- [ ] **Step 2: Write the arrows**

```jsx
// src/shell/Arrows.jsx

// The only clickable elements on a `cursor: none` page. The instrument above
// them is pointerEvents: none, so it never swallows the click.
export default function Arrows({ index, count, label, onGo, disabled }) {
  const atStart = index === 0
  const atEnd = index === count - 1

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        zIndex: 9997,
        userSelect: "none",
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: "0.7rem",
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        color: "#ffffff",
        mixBlendMode: "difference",
      }}
    >
      <Arrow
        dir="◀"
        onClick={() => onGo(-1)}
        disabled={disabled || atStart}
        aria-label="Previous world"
      />
      <span style={{ minWidth: "7rem", textAlign: "center" }}>{label}</span>
      <Arrow
        dir="▶"
        onClick={() => onGo(1)}
        disabled={disabled || atEnd}
        aria-label="Next world"
      />
    </div>
  )
}

function Arrow({ dir, onClick, disabled, ...rest }) {
  return (
    <button
      {...rest}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "none",
        border: "none",
        color: "inherit",
        font: "inherit",
        fontSize: "1rem",
        lineHeight: 1,
        padding: "0.5rem",
        cursor: disabled ? "default" : "none",
        opacity: disabled ? 0.25 : 1,
        transition: "opacity 200ms ease",
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {dir}
    </button>
  )
}
```

- [ ] **Step 3: Write the readiness signal**

```jsx
// src/shell/WorldReady.jsx
import { useEffect } from "react"

// Rendered as the last child inside the world's <Suspense>. Mounting at all
// proves the boundary resolved; the rAF gives the first draw a frame before we
// uncover. A timed reveal would uncover an empty scene whenever a model loads
// slowly — the same silent failure as a 404'd asset.
export default function WorldReady({ onReady }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => onReady())
    return () => cancelAnimationFrame(id)
  }, [onReady])

  return null
}
```

- [ ] **Step 4: Write the camera applier**

The `<Canvas camera>` prop only applies at creation, and the canvas outlives every world.

```jsx
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
```

- [ ] **Step 5: Rewrite `App.jsx` as the shell**

```jsx
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { startPointerTracking } from "./shared/usePointer";
import { INITIAL as SELECTION_INITIAL } from "./shared/selection";
import Instrument from "./shared/Instrument";
import Card from "./shared/Card";
import { WORLDS } from "./worlds/registry";
import {
  nextNavigation,
  INITIAL as NAV_INITIAL,
  IDLE,
  COVERING,
  REVEALING,
} from "./shell/navigation";
import Curtain from "./shell/Curtain";
import Arrows from "./shell/Arrows";
import WorldReady from "./shell/WorldReady";
import ApplyCamera from "./shell/ApplyCamera";

const FADE_MS = 600;
// If a world never signals readiness, uncover anyway. A broken world must show
// itself as broken rather than trap the user behind an opaque curtain with the
// arrows unreachable.
const READY_CEILING_MS = 4000;

export default function App() {
  startPointerTracking();

  const [nav, setNav] = useState(NAV_INITIAL);
  const [ready, setReady] = useState(false);
  const selectionRef = useRef(SELECTION_INITIAL);

  const world = WORLDS[nav.index];
  const dispatch = useCallback(
    (action) => setNav((s) => nextNavigation(s, action, WORLDS.length)),
    [],
  );
  const go = useCallback((delta) => dispatch({ type: "go", delta }), [dispatch]);

  // A new world starts unready and inherits no selection from the last one.
  useEffect(() => {
    setReady(false);
    selectionRef.current = SELECTION_INITIAL;
  }, [nav.index]);

  // Covering: let the fade play out, then commit the swap behind it.
  useEffect(() => {
    if (nav.phase !== COVERING) return;
    const id = setTimeout(() => dispatch({ type: "covered" }), FADE_MS);
    return () => clearTimeout(id);
  }, [nav.phase, nav.pending, dispatch]);

  // Revealing: the ceiling that backs up the readiness signal.
  useEffect(() => {
    if (nav.phase !== REVEALING || ready) return;
    const id = setTimeout(() => setReady(true), READY_CEILING_MS);
    return () => clearTimeout(id);
  }, [nav.phase, ready]);

  // Revealing and ready: let the fade play out, then return to idle.
  useEffect(() => {
    if (nav.phase !== REVEALING || !ready) return;
    const id = setTimeout(() => dispatch({ type: "revealed" }), FADE_MS);
    return () => clearTimeout(id);
  }, [nav.phase, ready, dispatch]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onReady = useCallback(() => setReady(true), []);
  const covered = nav.phase === COVERING || (nav.phase === REVEALING && !ready);
  const Overlay = world.Overlay;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: world.pageBackground,
        cursor: "none",
      }}
    >
      <Instrument instrument={world.instrument} />

      <Canvas
        gl={{ alpha: false, preserveDrawingBuffer: true }}
        camera={WORLDS[0].camera}
        style={{ width: "100%", height: "100%" }}
      >
        <ApplyCamera camera={world.camera} />
        {/* Keyed so switching worlds remounts the subtree rather than trying
            to reconcile two unrelated scenes. */}
        <Suspense key={world.id} fallback={null}>
          <world.Scene selectionRef={selectionRef} config={world} />
          <WorldReady onReady={onReady} />
        </Suspense>
      </Canvas>

      {world.Card && (
        <Card
          key={world.id}
          selectionRef={selectionRef}
          instrument={world.instrument}
          Content={world.Card}
          style={world.cardStyle}
        />
      )}

      {Overlay && <Overlay key={world.id} />}

      <Arrows
        index={nav.index}
        count={WORLDS.length}
        label={world.label}
        onGo={go}
        disabled={nav.phase !== IDLE}
      />

      <Curtain opaque={covered} fadeMs={FADE_MS} />
    </div>
  );
}
```

- [ ] **Step 6: Verify**

```bash
npm test && npm run lint && npm run build && npm run dev
```

Expected: the piece is still identical to before. Both arrows are visible at the bottom centre and both are dimmed and unclickable, because only one world is registered. The label reads "Luxury". Pressing Left or Right does nothing. Console free of errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(shell): arrows, curtain and readiness-gated world transitions"
```

---

### Task 10: The middle and stray stubs

Deliberately plain, but genuinely working — they prove the socket fits three times rather than once. The supplied models and PNGs later drop into config without the shell being touched.

**Files:**
- Create: `src/worlds/middle/index.js`, `Scene.jsx`, `creds.js`, `creds.test.js`, `Record.jsx`
- Create: `src/worlds/stray/index.js`, `Scene.jsx`, `creds.js`, `creds.test.js`, `Record.jsx`
- Modify: `src/worlds/registry.js`

**Interfaces:**
- Consumes: everything shared, plus the luxury config as the shape to copy
- Produces: `WORLDS` with three entries

- [ ] **Step 1: Write the middle world's document and its test**

```js
// src/worlds/middle/creds.js
// Placeholder content. Spec 2 designs what this world actually says.

const NAMES = ["Max", "Bella", "Charlie", "Luna", "Cooper", "Daisy", "Rocky", "Sadie"]
const BREEDS = ["Beagle mix", "Labrador cross", "Terrier mix", "Collie cross"]

export function credsFor(index) {
  const i = Math.abs(Math.trunc(index))
  return {
    name: NAMES[i % NAMES.length],
    age: 1 + ((i * 5) % 12),
    breed: BREEDS[(i * 3) % BREEDS.length],
    home: `Family of ${2 + (i % 4)}`,
  }
}
```

```js
// src/worlds/middle/creds.test.js
import test from "node:test"
import assert from "node:assert/strict"
import { credsFor } from "./creds.js"

test("is deterministic for the same index", () => {
  assert.deepEqual(credsFor(7), credsFor(7))
})

test("returns every field populated", () => {
  const c = credsFor(0)
  for (const key of ["name", "age", "breed", "home"]) {
    assert.ok(c[key] !== undefined && c[key] !== "", `missing ${key}`)
  }
})

test("age is a plausible dog age", () => {
  for (let i = 0; i < 50; i++) {
    const { age } = credsFor(i)
    assert.ok(Number.isInteger(age) && age >= 1 && age <= 12, `bad age ${age} at ${i}`)
  }
})
```

- [ ] **Step 2: Write the middle world's card content**

```jsx
// src/worlds/middle/Record.jsx
import { credsFor } from "./creds"

export const recordStyle = {
  background: "rgba(28, 26, 24, 0.88)",
  border: "1px solid rgba(220, 210, 190, 0.3)",
  padding: "1rem 1.15rem",
  fontFamily: "'Josefin Sans', sans-serif",
  color: "#e8e2d6",
  fontSize: "0.68rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  lineHeight: 2,
}

export default function Record({ index }) {
  const c = credsFor(index)
  return (
    <>
      <div style={{ fontSize: "0.95rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
        {c.name}
      </div>
      <Row label="Age" value={`${c.age} yrs`} />
      <Row label="Breed" value={c.breed} />
      <Row label="Home" value={c.home} />
    </>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span style={{ opacity: 0.55 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
```

- [ ] **Step 3: Write the middle world's scene**

No ripple, no warp, no depth of field, no environment map — a stub proves the socket, and keeping the effect chain out of it also isolates the leak check in Step 7.

```jsx
// src/worlds/middle/Scene.jsx
import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { PointerProjector } from "../../shared/usePointer"
import { DogsPhysics, createDogs, DEFAULT_PHYSICS } from "../../shared/physics"
import { DogSelector } from "../../shared/useDogSelection"
import Dog from "../../shared/Dog"

const COUNT = 24
const PLANE_Z = -40

function makeMatteMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.09, 0.35, 0.3 + Math.random() * 0.2),
    roughness: 0.85,
    metalness: 0.0,
  })
}

export default function Scene({ selectionRef, config }) {
  const { viewport, camera } = useThree()
  const { width: hw2, height: hh2 } = viewport.getCurrentViewport(camera, [0, 0, PLANE_Z])
  const hw = hw2 / 2
  const hh = hh2 / 2

  const physicsRef = useRef(createDogs({ count: COUNT, hw2, hh2, z: PLANE_Z }))
  const physicsConfig = useMemo(() => ({ ...DEFAULT_PHYSICS }), [])

  return (
    <>
      <color attach="background" args={["#2b2722"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 6]} intensity={1.1} />
      <PointerProjector planeZ={PLANE_Z} />
      <DogsPhysics
        physicsRef={physicsRef}
        count={COUNT}
        hw={hw}
        hh={hh}
        config={physicsConfig}
      />
      <DogSelector
        physicsRef={physicsRef}
        selectionRef={selectionRef}
        count={COUNT}
        selection={config.selection}
      />
      {Array.from({ length: COUNT }, (_, i) => (
        <Dog
          key={i}
          index={i}
          physicsRef={physicsRef}
          selectionRef={selectionRef}
          modelUrl={config.modelUrl}
          makeMaterial={makeMatteMaterial}
          scale={0.065}
          selectedScale={0.11}
          lift={3.0}
          selectedEmissive="#2a2620"
        />
      ))}
    </>
  )
}
```

- [ ] **Step 4: Write the middle world's config**

```js
// src/worlds/middle/index.js
import Scene from "./Scene"
import Record, { recordStyle } from "./Record"
// Placeholder art — replaced when the real instrument PNG is supplied. Its
// ratios are the loupe's, and must be re-measured for the real asset.
import instrumentPng from "../luxury/loupe.png"

const MODEL_URL = `${import.meta.env.BASE_URL}upgradeddog-v1-transformed.glb`

export default {
  id: "middle",
  label: "Middle Class",
  pageBackground: "#2b2722",
  camera: { fov: 80, near: 0.01, far: 110 },

  Scene,
  Card: Record,
  cardStyle: recordStyle,

  modelUrl: MODEL_URL,

  instrument: { src: instrumentPng, size: 240, cx: 0.359, cy: 0.342, radius: 0.220 },
  selection: { radius: 4.0, releaseMargin: 1.0, dwellMs: 450 },
}
```

- [ ] **Step 5: Write the stray world**

Create `src/worlds/stray/` with its own five files. **Do not import anything from `middle/`** — the two diverge completely in specs 2 and 3, and a shared import now becomes a tangle to unpick later.

`creds.js`:

```js
// src/worlds/stray/creds.js
// Placeholder content. Spec 3 designs what this world actually says.

const CONDITIONS = ["Underweight", "Injured paw", "Untreated", "Malnourished"]

export function credsFor(index) {
  const i = Math.abs(Math.trunc(index))
  return {
    tag: `#${String(200 + i * 7).slice(-3)}`,
    age: `est. ${1 + ((i * 3) % 9)} yrs`,
    condition: CONDITIONS[(i * 5) % CONDITIONS.length],
    days: `${1 + ((i * 11) % 60)} days`,
  }
}
```

`creds.test.js`:

```js
// src/worlds/stray/creds.test.js
import test from "node:test"
import assert from "node:assert/strict"
import { credsFor } from "./creds.js"

test("is deterministic for the same index", () => {
  assert.deepEqual(credsFor(7), credsFor(7))
})

test("returns every field populated", () => {
  const c = credsFor(0)
  for (const key of ["tag", "age", "condition", "days"]) {
    assert.ok(c[key] !== undefined && c[key] !== "", `missing ${key}`)
  }
})

test("tag is always three digits", () => {
  for (let i = 0; i < 50; i++) {
    assert.match(credsFor(i).tag, /^#\d{3}$/)
  }
})
```

`Record.jsx`:

```jsx
// src/worlds/stray/Record.jsx
import { credsFor } from "./creds"

export const recordStyle = {
  background: "rgba(16, 17, 18, 0.88)",
  border: "1px solid rgba(150, 155, 160, 0.28)",
  padding: "1rem 1.15rem",
  fontFamily: "'Josefin Sans', sans-serif",
  color: "#b9bec2",
  fontSize: "0.68rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  lineHeight: 2,
}

export default function Record({ index }) {
  const c = credsFor(index)
  return (
    <>
      <div style={{ fontSize: "0.95rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
        {c.tag}
      </div>
      <Row label="Age" value={c.age} />
      <Row label="Condition" value={c.condition} />
      <Row label="Unclaimed" value={c.days} />
    </>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span style={{ opacity: 0.55 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
```

`Scene.jsx`:

```jsx
// src/worlds/stray/Scene.jsx
import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { PointerProjector } from "../../shared/usePointer"
import { DogsPhysics, createDogs, DEFAULT_PHYSICS } from "../../shared/physics"
import { DogSelector } from "../../shared/useDogSelection"
import Dog from "../../shared/Dog"

const COUNT = 12
const PLANE_Z = -40

function makeStrayMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.08, 0.12, 0.22 + Math.random() * 0.12),
    roughness: 0.95,
    metalness: 0.0,
  })
}

export default function Scene({ selectionRef, config }) {
  const { viewport, camera } = useThree()
  const { width: hw2, height: hh2 } = viewport.getCurrentViewport(camera, [0, 0, PLANE_Z])
  const hw = hw2 / 2
  const hh = hh2 / 2

  const physicsRef = useRef(createDogs({ count: COUNT, hw2, hh2, z: PLANE_Z }))
  const physicsConfig = useMemo(() => ({ ...DEFAULT_PHYSICS }), [])

  return (
    <>
      <color attach="background" args={["#0f1112"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 7, 5]} intensity={0.7} />
      <PointerProjector planeZ={PLANE_Z} />
      <DogsPhysics
        physicsRef={physicsRef}
        count={COUNT}
        hw={hw}
        hh={hh}
        config={physicsConfig}
      />
      <DogSelector
        physicsRef={physicsRef}
        selectionRef={selectionRef}
        count={COUNT}
        selection={config.selection}
      />
      {Array.from({ length: COUNT }, (_, i) => (
        <Dog
          key={i}
          index={i}
          physicsRef={physicsRef}
          selectionRef={selectionRef}
          modelUrl={config.modelUrl}
          makeMaterial={makeStrayMaterial}
          scale={0.065}
          selectedScale={0.11}
          lift={3.0}
          selectedEmissive="#1a1c1e"
        />
      ))}
    </>
  )
}
```

`index.js`:

```js
// src/worlds/stray/index.js
import Scene from "./Scene"
import Record, { recordStyle } from "./Record"
// Placeholder art — replaced when the real instrument PNG is supplied. Its
// ratios are the loupe's, and must be re-measured for the real asset.
import instrumentPng from "../luxury/loupe.png"

const MODEL_URL = `${import.meta.env.BASE_URL}upgradeddog-v1-transformed.glb`

export default {
  id: "stray",
  label: "Stray",
  pageBackground: "#0f1112",
  camera: { fov: 80, near: 0.01, far: 110 },

  Scene,
  Card: Record,
  cardStyle: recordStyle,

  modelUrl: MODEL_URL,

  instrument: { src: instrumentPng, size: 220, cx: 0.359, cy: 0.342, radius: 0.220 },
  selection: { radius: 4.0, releaseMargin: 1.0, dwellMs: 400 },
}
```

- [ ] **Step 6: Register all three**

```js
// src/worlds/registry.js
import luxury from "./luxury"
import middle from "./middle"
import stray from "./stray"

// Array order is arrow order: a descent from luxury to stray.
export const WORLDS = [luxury, middle, stray]
```

- [ ] **Step 7: Verify, including the leak gate**

```bash
npm test          # expect: 33 pass (27 + 3 middle + 3 stray)
npm run lint      # expect: 0 problems
npm run build && npm run dev
```

In the browser:

1. Click the right arrow. Expected: fade to black over ~600ms, then the brown middle-class world fades in with 24 matte dogs. The label reads "Middle Class". Both arrows are live.
2. Click right again for the grey stray world, 12 dogs. The right arrow is now dimmed and unclickable.
3. Click left twice, back to luxury. The left arrow is dimmed. The gold river, ripple warp, and caption all work exactly as before.
4. Hold the instrument over a dog in each world — each shows its own card.
5. Hold the Right arrow key down. Expected: exactly one transition per press, no queuing, and you never land mid-fade.

Then the leak gate. In the browser console, before switching:

```js
const r = document.querySelector('canvas').__r3f?.root?.getState?.().gl
// If that is undefined, use the React DevTools canvas state instead.
r.info.memory  // note geometries and textures
r.info.programs.length
```

Switch worlds ten times (right, left, right, left, …), then read the same three numbers.

Expected: they settle at a steady value rather than climbing on every switch. **If they climb monotonically**, the `EffectComposer` in `RippleWarp` is not disposing. The fix per the spec is to hoist a single composer into the shell and have worlds contribute their effect list to it; record the finding and stop for review rather than papering over it.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(worlds): middle-class and stray stubs, three-world registry"
```

---

### Task 11: Documentation and deploy verification

**Files:**
- Modify: `README.md`, `../../README.md` (repository root)

**Interfaces:**
- Consumes: everything
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Replace the project README**

`projects/dogs-gold/README.md` is stock Vite boilerplate. Replace it entirely:

````markdown
# dogs-gold

Three worlds of dogs, navigated by the arrows at the bottom of the screen:
**luxury**, **middle class**, **stray**. Each is a react-three-fiber scene with
its own background, palette, instrument, and revealed document.

Desktop only — the interaction is pointer-driven and the page hides the cursor.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # node --test, recursive
npm run lint
npm run build
```

## How a world works

`src/worlds/registry.js` holds an ordered array. Array order is arrow order.
The shell in `src/App.jsx` never branches on which world is active — it reads
only the keys below.

| Key | Required | Meaning |
| --- | --- | --- |
| `id`, `label` | yes | identity, and the text between the arrows |
| `pageBackground` | yes | painted behind the canvas; visible mid-transition |
| `camera` | yes | `{ fov, near, far }`, applied on mount |
| `Scene` | yes | the in-canvas subtree |
| `instrument` | yes | `{ src, size, cx, cy, radius }` — art plus measured ratios |
| `selection` | yes | `{ radius, releaseMargin, dwellMs }` |
| `Card`, `cardStyle` | no | the reveal panel's content and container style |
| `Instrument` | no | replaces the shared pointer-following positioner |
| `Overlay` | no | extra DOM inside the shell wrapper |

`src/shared/` holds what every world reuses: the pointer singleton, the physics
loop, the dog mesh, the selection state machine, the instrument positioner, and
the card container. `src/shell/` holds the navigation reducer and the transition.

## Adding a world

1. Create `src/worlds/<id>/` with an `index.js` exporting the config above.
2. Add it to the array in `src/worlds/registry.js`.

No shell code changes.

## Instrument ratios

`cx`, `cy`, and `radius` are fractions of the image width, measured from the
art's alpha channel: where the instrument's *active point* sits within the
image. The luxury loupe's handle occupies the lower right, so its glass is up
and to the left of centre — centring the PNG on the pointer would put the handle
under the cursor. Re-measure these whenever the art is replaced.

## Deploying

Built by `.github/workflows/deploy.yml` and served from `/vscodemainrepo/` on
GitHub Pages, so `vite.config.js` sets `base` to match. **Every `public/` asset
must route through `import.meta.env.BASE_URL`** — a root-absolute path 404s
under the prefix and yields a scene with no dogs and no visible error.
````

- [ ] **Step 2: Correct the root README**

The root `README.md` names dead files that no longer exist. It is UTF-16 encoded; edit it without changing its encoding. Find the bullet beginning "Some dead code is still present on purpose" and replace that whole bullet with:

```
- Dead code in `dogs-gold` has been removed. Still queued for a separate
  cleanup pass: `chatbot/src/ModelViewer.jsx`, `vite-ts-scratch/src/tooltip.tsx`,
  and a large commented-out block at the top of `vite-ts-scratch/src/App.tsx`.
```

Change nothing else in that file — not its encoding, not its other prose, not any other project's entry.

- [ ] **Step 3: Verify the build under the real Pages path prefix**

The base-path trap is the one failure that looks fine locally and breaks live.

```bash
cd projects/dogs-gold
npm run build
rm -rf /tmp/pages-check && mkdir -p /tmp/pages-check/vscodemainrepo
cp -r dist/* /tmp/pages-check/vscodemainrepo/
cd /tmp/pages-check && python3 -m http.server 8099
```

Open `http://localhost:8099/vscodemainrepo/`. Expected: all three worlds load and switch, dogs visible in each. **A background with no dogs means the model 404'd** — check the network tab and fix the path before pushing. Confirm the network tab shows no request for `upgradeddog-v1.glb` or `Upgradeddog-v1.jsx`, both deleted in Task 1. Stop the server when done.

- [ ] **Step 4: Final full verification**

```bash
cd projects/dogs-gold
npm test          # expect: 33 pass, 0 fail
npm run lint      # expect: 0 problems
npm run build     # expect: success
wc -l src/App.jsx # expect: roughly 130 lines, down from 674
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs(dogs-gold): document the world registry and shell"
```

- [ ] **Step 6: Stop before pushing**

**Do not push.** Pushing triggers a live deploy to GitHub Pages. Report completion and let the user decide.

---

## Notes for the implementer

- **Line numbers cited in Tasks 4–8 refer to the pre-change `App.jsx`** and drift as you work. Locate code by component name, not by line.
- **"Verbatim" means copy, not retype.** The shaders in particular are long and a single changed character alters the look without erroring.
- Take a screenshot of the running app **before starting Task 4**. Tasks 7, 8, and 9 all compare against it.
- Every task from 3 onward ends with a working app. If one doesn't, stop rather than pressing on — the next task builds on it.
- `useFrame` priorities in use, which must not change: `-2` pointer projector, `-1` physics, `-0.5` selection, `0` dog transforms, `1` effect composer.
- Tunable constants live in exactly one place each: the instrument ratios and `selection` block in each world's `index.js`, `FADE_MS` and `READY_CEILING_MS` in `App.jsx`.
- The instrument ratios `0.359 / 0.342 / 0.220` were confirmed correct at the machine after an earlier measurement artifact suggested otherwise. Do not change them.
