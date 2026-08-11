# Loupe Inspection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the magnifying-glass cursor an inspection tool — passing it over a dog enlarges that dog and, after a short dwell, reveals its credentials.

**Architecture:** A module-level pointer singleton replaces three competing `mousemove` listeners and feeds both the DOM loupe image and an in-canvas world-space projector. Selection is a nearest-neighbour scan over the existing `physicsRef` array — no raycasting — fed through a pure state machine that debounces hover. Credentials are generated deterministically from each dog's index.

**Tech Stack:** React 18, Vite 5, three.js 0.168, @react-three/fiber, @react-three/drei, @react-three/postprocessing. Tests use Node's built-in runner (`node --test`) — no new dependencies.

## Global Constraints

- **No new runtime or dev dependencies.** Tests use `node --test`, built into Node 18+ (local runtime is v24.14.1).
- **Desktop only.** No touch support, no `prefers-reduced-motion`, no WebGL fallback. Do not add them.
- **Do not restructure `App.jsx` beyond what these tasks specify.** New code goes in new files.
- **`preserveDrawingBuffer: true` must stay** on the `<Canvas>` — `TextColorSampler` depends on it.
- Project root for all paths below: `projects/dogs-gold/`.
- Existing constants to reuse, not redefine: `COLLISION_RADIUS = 0.75` (App.jsx:303), dog plane `z = -40`, dog `count = 50`.
- Run all commands from `projects/dogs-gold/`. The `node_modules/.bin` scripts lack the execute bit, so invoke tools as `node node_modules/vite/bin/vite.js …` unless `npm install` has been re-run.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/loupe/loupe.png` | Create — transparent-background lens asset |
| `src/loupe/creds.js` | Create — deterministic credential generation |
| `src/loupe/creds.test.js` | Create — tests for the above |
| `src/loupe/selection.js` | Create — pure hover/dwell state machine |
| `src/loupe/selection.test.js` | Create — tests for the above |
| `src/hooks/usePointer.js` | Create — pointer singleton + in-canvas world projector |
| `src/loupe/Loupe.jsx` | Create — the lens image following the pointer |
| `src/loupe/useDogSelection.js` | Create — per-frame nearest-dog scan driving the machine |
| `src/loupe/CredsCard.jsx` | Create — credentials panel |
| `src/App.jsx` | Modify — wire everything, remove the three old listeners |
| `vite.config.js` | Modify — `base` for GitHub Pages |
| `.github/workflows/deploy.yml` | Create — build and publish to Pages |

---

### Task 1: Loupe asset — ALREADY COMPLETE

**No work required. Do not re-do this task.** It is recorded here so later
tasks can rely on its measurements.

An earlier revision of this plan derived the asset from `src/newdesign.png`, a
3/4-angle photograph of a camera lens. That was rejected on sight: at cursor
size it read as a squashed dark ellipse, it disappeared against the scene's
black regions, and its glass had a photograph of a garden baked into it.

It was replaced with a user-supplied magnifying glass — gold rim, wooden
handle — which suits the gold palette and is unmistakably a magnifier.

**Asset:** `src/loupe/loupe.png`, 1024x1024, RGBA, 274KB.

**Measured geometry** (from the alpha channel; later tasks depend on these):

| Property | Value | As fraction of image width |
| --- | --- | --- |
| Glass centre X | 368px | **0.359** |
| Glass centre Y | 350px | **0.342** |
| Glass radius | 225px | **0.220** |

Two consequences that drive Task 5:

- **The glass interior is already fully transparent** (`alpha = 0`). No mask of
  any kind is needed — the scene shows through natively.
- **The glass is not at the image centre.** The handle occupies the lower
  right, so the glass sits up and to the left. Centring the PNG on the pointer
  would place the *handle* under the cursor. The image must be offset so the
  glass centre lands on the pointer.

---

### Task 2: Deterministic credentials

**Files:**
- Create: `src/loupe/creds.js`
- Test: `src/loupe/creds.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `credsFor(index: number) -> { name, age, location, pedigree, grade, certificate, price }` — all values strings except `age` (number). Consumed by Task 8.

- [ ] **Step 1: Write the failing test**

```js
// src/loupe/creds.test.js
import test from "node:test"
import assert from "node:assert/strict"
import { credsFor } from "./creds.js"

test("is deterministic for the same index", () => {
  assert.deepEqual(credsFor(7), credsFor(7))
})

test("returns every field populated", () => {
  const c = credsFor(0)
  for (const key of ["name", "age", "location", "pedigree", "grade", "certificate", "price"]) {
    assert.ok(c[key] !== undefined && c[key] !== "", `missing ${key}`)
  }
})

test("age is a plausible dog age", () => {
  for (let i = 0; i < 50; i++) {
    const { age } = credsFor(i)
    assert.ok(Number.isInteger(age) && age >= 1 && age <= 12, `bad age ${age} at ${i}`)
  }
})

test("certificate is always four digits", () => {
  for (let i = 0; i < 50; i++) {
    assert.match(credsFor(i).certificate, /^No\. \d{4}$/)
  }
})

test("price is formatted with a thousands separator", () => {
  for (let i = 0; i < 50; i++) {
    assert.match(credsFor(i).price, /^\d{1,3},\d{3}$/)
  }
})

test("names vary across the pack", () => {
  const names = new Set(Array.from({ length: 50 }, (_, i) => credsFor(i).name))
  assert.ok(names.size >= 20, `only ${names.size} distinct names`)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd projects/dogs-gold && node --test src/loupe/`
Expected: FAIL — cannot find module `./creds.js`

- [ ] **Step 3: Write the implementation**

```js
// src/loupe/creds.js

const NAMES = [
  "Bijou", "Comtesse", "Aurelio", "Perle", "Sable", "Vermeil",
  "Osiris", "Colette", "Vestige", "Lumen", "Cassis", "Doré",
  "Marceau", "Ondine", "Brioche", "Solange", "Tourmaline", "Amboise",
  "Vesper", "Halcyon", "Cygne", "Amaretto", "Fontaine", "Noor",
]

const LOCATIONS = [
  "Geneva", "Monaco", "Kyoto", "Antwerp", "Milano", "Gstaad",
  "Jaipur", "Vienna", "Bruges", "Zurich", "Lucerne", "Biarritz",
]

const PEDIGREES = [
  "Standard Poodle", "Continental Clip", "Royal Miniature",
  "Toy Sovereign", "Caniche Noble", "Grand Barbet",
  "Alpine Standard", "Court Miniature",
]

const GRADES = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2"]

export function credsFor(index) {
  const i = Math.abs(Math.trunc(index))
  const priceThousands = 12 + ((i * 17) % 88)
  return {
    name: NAMES[i % NAMES.length],
    age: 1 + ((i * 7) % 12),
    location: LOCATIONS[(i * 5) % LOCATIONS.length],
    pedigree: PEDIGREES[(i * 3) % PEDIGREES.length],
    grade: GRADES[(i * 11) % GRADES.length],
    certificate: `No. ${String(1000 + i * 137).slice(-4)}`,
    price: `${priceThousands},000`,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd projects/dogs-gold && node --test src/loupe/`
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/loupe/creds.js src/loupe/creds.test.js
git commit -m "feat(loupe): deterministic per-dog credentials"
```

---

### Task 3: Selection state machine

A bare hover test flickers because dogs drift continuously. This pure reducer debounces it. Keeping it pure and separate is what makes the timing testable without a browser.

**Files:**
- Create: `src/loupe/selection.js`
- Test: `src/loupe/selection.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `IDLE`, `PENDING`, `LOCKED` — phase string constants
  - `INITIAL` — `{ phase: IDLE, index: null, since: 0 }`
  - `nextSelection(state, input) -> state`, where `input` is
    `{ nearestIndex, nearestDistance, activeDistance, now, selectRadius, releaseMargin, dwellMs }`.
    `activeDistance` is the distance to `state.index`, or `null` when there is none.
  - Consumed by Task 7.

- [ ] **Step 1: Write the failing test**

```js
// src/loupe/selection.test.js
import test from "node:test"
import assert from "node:assert/strict"
import { nextSelection, INITIAL, IDLE, PENDING, LOCKED } from "./selection.js"

const OPTS = { selectRadius: 1.2, releaseMargin: 0.3, dwellMs: 500 }
const input = (over) => ({ nearestIndex: null, nearestDistance: Infinity, activeDistance: null, now: 0, ...OPTS, ...over })

test("stays idle when nothing is near", () => {
  const s = nextSelection(INITIAL, input({ now: 100 }))
  assert.equal(s.phase, IDLE)
})

test("enters pending when a dog comes within radius", () => {
  const s = nextSelection(INITIAL, input({ nearestIndex: 3, nearestDistance: 0.9, now: 100 }))
  assert.equal(s.phase, PENDING)
  assert.equal(s.index, 3)
  assert.equal(s.since, 100)
})

test("ignores a dog outside the radius", () => {
  const s = nextSelection(INITIAL, input({ nearestIndex: 3, nearestDistance: 5, now: 100 }))
  assert.equal(s.phase, IDLE)
})

test("holds pending until the dwell elapses", () => {
  const pending = { phase: PENDING, index: 3, since: 100 }
  const s = nextSelection(pending, input({ nearestIndex: 3, nearestDistance: 0.9, activeDistance: 0.9, now: 400 }))
  assert.equal(s.phase, PENDING)
})

test("locks once the dwell elapses", () => {
  const pending = { phase: PENDING, index: 3, since: 100 }
  const s = nextSelection(pending, input({ nearestIndex: 3, nearestDistance: 0.9, activeDistance: 0.9, now: 600 }))
  assert.equal(s.phase, LOCKED)
  assert.equal(s.index, 3)
})

test("restarts the dwell when a different dog becomes nearest", () => {
  const pending = { phase: PENDING, index: 3, since: 100 }
  const s = nextSelection(pending, input({ nearestIndex: 8, nearestDistance: 0.5, now: 300 }))
  assert.equal(s.phase, PENDING)
  assert.equal(s.index, 8)
  assert.equal(s.since, 300)
})

test("drops to idle if the dog is lost before locking", () => {
  const pending = { phase: PENDING, index: 3, since: 100 }
  const s = nextSelection(pending, input({ now: 300 }))
  assert.equal(s.phase, IDLE)
})

test("keeps the lock inside the release margin", () => {
  const locked = { phase: LOCKED, index: 3, since: 100 }
  const s = nextSelection(locked, input({ nearestIndex: 3, nearestDistance: 1.4, activeDistance: 1.4, now: 900 }))
  assert.equal(s.phase, LOCKED)
  assert.equal(s.index, 3)
})

test("keeps the lock even when another dog is nearer", () => {
  const locked = { phase: LOCKED, index: 3, since: 100 }
  const s = nextSelection(locked, input({ nearestIndex: 8, nearestDistance: 0.2, activeDistance: 1.0, now: 900 }))
  assert.equal(s.phase, LOCKED)
  assert.equal(s.index, 3)
})

test("releases the lock beyond the margin", () => {
  const locked = { phase: LOCKED, index: 3, since: 100 }
  const s = nextSelection(locked, input({ nearestIndex: 3, nearestDistance: 2.0, activeDistance: 2.0, now: 900 }))
  assert.equal(s.phase, IDLE)
  assert.equal(s.index, null)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd projects/dogs-gold && node --test src/loupe/`
Expected: FAIL — cannot find module `./selection.js`

- [ ] **Step 3: Write the implementation**

```js
// src/loupe/selection.js

export const IDLE = "idle"
export const PENDING = "pending"
export const LOCKED = "locked"

export const INITIAL = { phase: IDLE, index: null, since: 0 }

export function nextSelection(state, input) {
  const {
    nearestIndex, nearestDistance, activeDistance, now,
    selectRadius, releaseMargin, dwellMs,
  } = input

  // A locked dog keeps its lock until the pointer leaves its wider release
  // radius, even if another dog drifts closer. Without this the card would
  // swap targets whenever dogs cross paths.
  if (state.phase === LOCKED) {
    const held = activeDistance !== null && activeDistance <= selectRadius + releaseMargin
    return held ? state : INITIAL
  }

  if (nearestIndex === null || nearestDistance > selectRadius) {
    return state.phase === IDLE ? state : INITIAL
  }

  if (state.phase === PENDING && state.index === nearestIndex) {
    if (now - state.since >= dwellMs) {
      return { phase: LOCKED, index: nearestIndex, since: state.since }
    }
    return state
  }

  return { phase: PENDING, index: nearestIndex, since: now }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd projects/dogs-gold && node --test src/loupe/`
Expected: PASS — 16 tests total (6 from Task 2, 10 here)

- [ ] **Step 5: Commit**

```bash
git add src/loupe/selection.js src/loupe/selection.test.js
git commit -m "feat(loupe): hover/dwell selection state machine"
```

---

### Task 4: Shared pointer

`App.jsx` registers three `mousemove` listeners — `RippleScene` (line 109), `Scene` (line 557), `Cursor` (line 611) — and they disagree: `Cursor` lerps at `0.08` while `Scene` tracks instantly. The loupe and the selection must agree on one position or the glass will highlight one dog while the card describes another.

The store is a module singleton rather than React state because it updates every frame; putting it in state would re-render the tree 60x/second.

**Files:**
- Create: `src/hooks/usePointer.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `pointer` — `{ screen: {x,y}, smooth: {x,y}, world: {x,y} | null, worldSmooth: {x,y} | null, speed: number }`, mutated in place. Use `world` for physics, `worldSmooth` for selection, `smooth` for anything drawn.
  - `startPointerTracking()` — idempotent; attaches the listener and the smoothing loop
  - `<PointerProjector planeZ={-40} />` — in-canvas component filling `pointer.world` and `pointer.speed`
  - Consumed by Tasks 5, 6, 7, 8.

- [ ] **Step 1: Write the module**

```jsx
// src/hooks/usePointer.js
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { useThree, useFrame } from "@react-three/fiber"

const SMOOTHING = 0.08

export const pointer = {
  screen: { x: 0, y: 0 },   // raw, instantaneous
  smooth: { x: 0, y: 0 },   // lerped, for anything drawn on screen
  world: null,              // from `screen` — physics repulsion
  worldSmooth: null,        // from `smooth` — loupe selection
  speed: 0,                 // from `world` deltas
}

let started = false

export function startPointerTracking() {
  if (started || typeof window === "undefined") return
  started = true

  pointer.screen.x = pointer.smooth.x = window.innerWidth / 2
  pointer.screen.y = pointer.smooth.y = window.innerHeight / 2

  window.addEventListener("pointermove", (e) => {
    pointer.screen.x = e.clientX
    pointer.screen.y = e.clientY
  })

  const tick = () => {
    pointer.smooth.x += (pointer.screen.x - pointer.smooth.x) * SMOOTHING
    pointer.smooth.y += (pointer.screen.y - pointer.smooth.y) * SMOOTHING
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// Projects the pointer onto the dog plane twice, because the two consumers
// genuinely want different things:
//
//   world       ← raw screen. Physics repulsion was event-driven and
//                 instantaneous before this refactor; feeding it the lerped
//                 value would add lag, keep nudging dogs after the pointer
//                 stops, and understate peak speed so fast flicks push less.
//   worldSmooth ← smoothed screen. Selection must agree with where the lens
//                 is *drawn*, or the glass highlights one dog while the card
//                 describes another.
//
// A second raycast per frame against one plane is negligible.
export function PointerProjector({ planeZ = -40 }) {
  const { camera, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ),
    [planeZ],
  )
  const hit = useMemo(() => new THREE.Vector3(), [])
  const prev = useRef(null)

  useFrame(() => {
    const rect = gl.domElement.getBoundingClientRect()

    const project = (sx, sy) => {
      ndc.x = ((sx - rect.left) / rect.width) * 2 - 1
      ndc.y = -((sy - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      return raycaster.ray.intersectPlane(plane, hit)
        ? { x: hit.x, y: hit.y }
        : null
    }

    const raw = project(pointer.screen.x, pointer.screen.y)
    if (raw) {
      if (prev.current) {
        const dx = raw.x - prev.current.x
        const dy = raw.y - prev.current.y
        pointer.speed = Math.sqrt(dx * dx + dy * dy)
      }
      prev.current = raw
      pointer.world = raw
    }

    const sm = project(pointer.smooth.x, pointer.smooth.y)
    if (sm) pointer.worldSmooth = sm
  }, -2) // before DogsPhysics at -1

  return null
}
```

- [ ] **Step 2: Replace two of the three listeners in `App.jsx`**

`Cursor`'s listener (line 611) is deliberately left alone in this task —
Task 5 deletes the whole `Cursor` component, so rewiring it here would be
work thrown away one task later. After this task there are two pointer
sources; after Task 5 there is one.

In `RippleScene`, delete the `onMove` handler and its listener (lines 105–109 and the `removeEventListener` on line 111), and replace the two uses of `mouseRef.current` in `useFrame` with values derived from the shared pointer:

```jsx
// at the top of RippleScene's useFrame, replacing `const mouse = mouseRef.current`
// Raw, not smoothed: the brush trail was event-driven and instantaneous before
// this refactor, and the lerped value would make it lag and keep spawning
// strokes after the pointer stops.
const mouse = {
  x: pointer.screen.x - size.width / 2,
  y: size.height / 2 - pointer.screen.y,
}
```

Delete `mouseRef` entirely. Keep `prevMouseRef`.

In `Scene`, delete the whole `useEffect` that registers `onMove` (lines 539–559) plus `raycaster`, `ndcMouse`, `dogPlane`, `intersection`, and `prevMouseWorld`. Replace `mouseWorldRef`/`mouseSpeedRef` with the shared pointer: pass `pointer` straight into `DogsPhysics`.

In `DogsPhysics`, change the signature from
`({ physicsRef, count, hw, hh, mouseWorldRef, mouseSpeedRef })` to
`({ physicsRef, count, hw, hh })`, and inside replace:

```jsx
const mw = pointer.world
const ms = pointer.speed
```

Add `<PointerProjector planeZ={-40} />` as the first child inside `<Suspense>` in `Scene`, and call `startPointerTracking()` at the top of `App`.

- [ ] **Step 3: Verify no behavioural change**

```bash
cd projects/dogs-gold
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill
node node_modules/vite/bin/vite.js --port 5173 &
timeout 30 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'
```

Open the page. Expected, all unchanged from before this task: dogs drift and collide; moving the mouse pushes them away and the push is stronger when moving fast; the brush-stroke ripple warp follows the cursor; the SVG cursor still tracks. Browser console shows no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePointer.js src/App.jsx
git commit -m "refactor: single pointer source for cursor, ripple and physics"
```

---

### Task 5: Loupe image replaces the SVG cursor

The asset's glass is already transparent, so there is no mask. The only
subtlety is the offset: the image must be positioned so the **glass centre**,
not the image centre, sits on the pointer.

**Files:**
- Create: `src/loupe/Loupe.jsx`
- Modify: `src/App.jsx` (remove `Cursor`, mount `Loupe`)

**Interfaces:**
- Consumes: `pointer` from Task 4, `src/loupe/loupe.png` from Task 1
- Produces: `<Loupe />`; exports `LOUPE_SIZE_PX`, `GLASS_RADIUS_PX`,
  `GLASS_CX_PX`, `GLASS_CY_PX` for Task 8's card offset.

- [ ] **Step 1: Write the component**

```jsx
// src/loupe/Loupe.jsx
import { useEffect, useRef } from "react"
import { pointer } from "../hooks/usePointer"
import lensUrl from "./loupe.png"

export const LOUPE_SIZE_PX = 260

// Measured from the asset's alpha channel (see Task 1). The source image is
// square, so every fraction is of LOUPE_SIZE_PX.
const GLASS_CX_RATIO = 0.359
const GLASS_CY_RATIO = 0.342
const GLASS_RADIUS_RATIO = 0.220

export const GLASS_CX_PX = LOUPE_SIZE_PX * GLASS_CX_RATIO
export const GLASS_CY_PX = LOUPE_SIZE_PX * GLASS_CY_RATIO
export const GLASS_RADIUS_PX = LOUPE_SIZE_PX * GLASS_RADIUS_RATIO

export default function Loupe() {
  const ref = useRef()

  useEffect(() => {
    let id
    const tick = () => {
      if (ref.current) {
        // Offset by the glass centre, not the image centre — the handle
        // occupies the lower right, so centring the PNG would put the handle
        // under the cursor.
        const x = pointer.smooth.x - GLASS_CX_PX
        const y = pointer.smooth.y - GLASS_CY_PX
        ref.current.style.transform = `translate(${x}px, ${y}px)`
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <img
      ref={ref}
      src={lensUrl}
      alt=""
      draggable={false}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: LOUPE_SIZE_PX,
        height: LOUPE_SIZE_PX,
        pointerEvents: "none",
        zIndex: 9999,
        willChange: "transform",
        display: "block",
      }}
    />
  )
}
```

- [ ] **Step 2: Swap it into `App.jsx`**

Delete the entire `Cursor` component (lines 601–678) and its `<Cursor />` usage. Add `import Loupe from "./loupe/Loupe"` and render `<Loupe />` in its place. Leave `cursor: "none"` on the wrapper.

- [ ] **Step 3: Verify**

Reload the page. Expected: the gold magnifying glass follows the pointer with the same easing the SVG had; the **glass ring sits centred on the pointer**, with the handle trailing to the lower right; the scene is fully visible through the glass; no white box or halo anywhere; no console errors.

If the glass sits off the pointer, adjust `GLASS_CX_RATIO` / `GLASS_CY_RATIO` and reload — do not modify the PNG. If the loupe feels too large or small, change `LOUPE_SIZE_PX`; the glass geometry scales with it automatically.

- [ ] **Step 4: Commit**

```bash
git add src/loupe/Loupe.jsx src/App.jsx
git commit -m "feat(loupe): replace SVG cursor with lens image"
```

---

### Task 6: Throttle the readPixels sampler

`TextColorSampler` (App.jsx:488) makes five *synchronous* `gl.readPixels` calls every frame. Each forces the CPU to block on the GPU. Doing this 300 times a second is the largest avoidable cost in the frame, and Task 7 adds more per-frame work in the same loop.

**Files:**
- Modify: `src/App.jsx` (`TextColorSampler`)

- [ ] **Step 1: Add throttling and reuse the buffer**

Replace the body of `TextColorSampler` with:

```jsx
function TextColorSampler({ textRef }) {
  const { gl } = useThree()
  const lastRun = useRef(0)
  const px = useRef(new Uint8Array(4))

  useFrame(() => {
    if (!textRef.current) return
    const now = performance.now()
    if (now - lastRun.current < 160) return // ~6Hz
    lastRun.current = now

    const rect = textRef.current.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const ctx = gl.getContext()
    const h = gl.domElement.height

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
      ctx.readPixels(
        Math.round(x * dpr), Math.round(h - y * dpr),
        1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, buf,
      )
      totalLum += (buf[0] * 0.299 + buf[1] * 0.587 + buf[2] * 0.114) / 255
    }

    const lum = totalLum / points.length
    textRef.current.style.color = lum > 0.25 ? "#000000" : "#ffe000"
  })

  return null
}
```

- [ ] **Step 2: Verify**

Reload. Expected: the bottom-right caption still flips between black and gold as bright gold rivers pass beneath it. The change is slightly less immediate; the existing `0.5s` colour transition hides it. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "perf: throttle text colour sampling to ~6Hz"
```

---

### Task 7: Dog selection

Selection is a nearest-neighbour scan over `physicsRef`, which already holds every dog's live position — about 50 distance comparisons per frame, negligible beside the existing 1225-pair collision loop.

**Files:**
- Create: `src/loupe/useDogSelection.js`
- Modify: `src/App.jsx` (`Scene` mounts it; `Dog` reacts to it)

**Interfaces:**
- Consumes: `nextSelection`, `INITIAL`, `PENDING`, `LOCKED` (Task 3); `pointer` (Task 4)
- Produces: `<DogSelector physicsRef selectionRef count />`, writing `{ phase, index, since }` into `selectionRef.current`. Consumed by Task 8.

- [ ] **Step 1: Write the selector**

```jsx
// src/loupe/useDogSelection.js
import { useFrame } from "@react-three/fiber"
import { pointer } from "../hooks/usePointer"
import { nextSelection, INITIAL } from "./selection"

export const SELECT_RADIUS = 1.2
export const RELEASE_MARGIN = 0.3
export const DWELL_MS = 500

export function DogSelector({ physicsRef, selectionRef, count }) {
  useFrame(() => {
    const dogs = physicsRef.current
    // worldSmooth, not world: selection must agree with where the lens is drawn.
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
      selectRadius: SELECT_RADIUS,
      releaseMargin: RELEASE_MARGIN,
      dwellMs: DWELL_MS,
    })
  }, -0.5) // after PointerProjector (-2) and DogsPhysics (-1), before Dog (0)
}
```

- [ ] **Step 2: Mount it in `Scene`**

The ref is owned by `App`, not `Scene`, because Task 8's card lives outside the
`<Canvas>` and must read the same object. Creating it in `App` now avoids
moving it later.

In `App`, alongside `const textRef = useRef()`:

```jsx
const selectionRef = useRef(INITIAL)
```

with `import { INITIAL } from "./loupe/selection"`, and pass it down:

```jsx
<Scene textRef={textRef} selectionRef={selectionRef} />
```

Change `function Scene({ count = 50, textRef })` to
`function Scene({ count = 50, textRef, selectionRef })`, then inside
`<Suspense>` mount the selector and forward the ref to each `Dog`:

```jsx
<DogSelector physicsRef={physicsRef} selectionRef={selectionRef} count={count} />
{Array.from({ length: count }, (_, i) => (
  <Dog key={i} index={i} physicsRef={physicsRef} selectionRef={selectionRef} />
))}
```

- [ ] **Step 3: Make the dog respond**

In `Dog`, accept `selectionRef` and lerp toward selected targets. Add to the component body:

```jsx
const emissiveTarget = useMemo(() => new THREE.Color("#3a2a00"), [])
const emissiveOff = useMemo(() => new THREE.Color("#000000"), [])
```

Replace the existing `useFrame` in `Dog` with:

```jsx
useFrame(() => {
  const d = physicsRef.current[index]
  if (!d || !ref.current) return

  const sel = selectionRef.current
  const isSelected = sel.index === index && sel.phase !== "idle"

  const targetScale = isSelected ? 0.12 : 0.065
  const targetZ = isSelected ? d.z + 3.5 : d.z

  const s = ref.current.scale.x + (targetScale - ref.current.scale.x) * 0.12
  ref.current.scale.setScalar(s)

  ref.current.position.set(d.x, d.y, d.z)
  ref.current.position.z += (targetZ - d.z) *
    ((s - 0.065) / (0.12 - 0.065)) // lift proportionally to how enlarged it is

  ref.current.rotation.set(d.rX, d.rY, d.rZ)

  material.emissive.lerp(isSelected ? emissiveTarget : emissiveOff, 0.12)
}, 0)
```

- [ ] **Step 4: Verify**

Reload. Expected: moving the lens over a dog makes it smoothly grow and lift toward the camera with a faint warm glow; moving away shrinks it back; the selected dog keeps its selection briefly when another passes closer; there is never more than one enlarged dog. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/loupe/useDogSelection.js src/App.jsx
git commit -m "feat(loupe): select and enlarge the dog under the lens"
```

---

### Task 8: Credentials card

**Files:**
- Create: `src/loupe/CredsCard.jsx`
- Modify: `src/App.jsx` (mount the card, hoist `selectionRef`)

**Interfaces:**
- Consumes: `credsFor` (Task 2), `pointer` and `LOCKED` (Tasks 3–4), `GLASS_RADIUS_PX` (Task 5), `selectionRef` (Task 7)
- Produces: `<CredsCard selectionRef />`

- [ ] **Step 1: Write the card**

```jsx
// src/loupe/CredsCard.jsx
import { useEffect, useRef, useState } from "react"
import { pointer } from "../hooks/usePointer"
import { credsFor } from "./creds"
import { GLASS_RADIUS_PX } from "./Loupe"
import { LOCKED } from "./selection"

const CARD_WIDTH = 250
const GAP = 28

export default function CredsCard({ selectionRef }) {
  const boxRef = useRef()
  // Only the locked index lives in React state — it changes rarely. Position
  // is written straight to the DOM each frame to avoid re-rendering at 60fps.
  const [lockedIndex, setLockedIndex] = useState(null)

  useEffect(() => {
    let id
    const tick = () => {
      const sel = selectionRef.current
      const next = sel.phase === LOCKED ? sel.index : null
      setLockedIndex((prev) => (prev === next ? prev : next))

      if (boxRef.current) {
        // Default to the LEFT of the glass: the loupe's handle juts out to the
        // lower right, so a right-hand card would sit on top of it. Flip to
        // the right only when there is no room on the left.
        const leftX = pointer.smooth.x - GLASS_RADIUS_PX - GAP - CARD_WIDTH
        const x = leftX < 16
          ? pointer.smooth.x + GLASS_RADIUS_PX + GAP
          : leftX
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
  }, [selectionRef])

  const creds = lockedIndex === null ? null : credsFor(lockedIndex)

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
        opacity: creds ? 1 : 0,
        transition: "opacity 250ms ease",
        willChange: "transform, opacity",
        background: "rgba(10, 8, 0, 0.82)",
        border: "1px solid rgba(255, 224, 0, 0.35)",
        padding: "1rem 1.15rem",
        fontFamily: "'Josefin Sans', sans-serif",
        color: "#ffe000",
        fontSize: "0.68rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        lineHeight: 2,
      }}
    >
      {creds && (
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
      )}
    </div>
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

- [ ] **Step 2: Mount the card**

`selectionRef` already exists in `App` from Task 7. Render the card after the
`<Canvas>` and before the caption `div`:

```jsx
<CredsCard selectionRef={selectionRef} />
```

- [ ] **Step 3: Verify**

Reload. Expected: hold the glass over a dog for about half a second and the card fades in to the left of it showing name, age, origin, pedigree, grade, certificate, value; move away and it fades out; move slowly across a cluster and the card does not strobe; the same dog always shows the same credentials, including after a page reload; the card never overlaps the loupe's handle; near the left edge it flips to the right; near the top or bottom it stays on screen. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/loupe/CredsCard.jsx src/App.jsx
git commit -m "feat(loupe): credentials card for the selected dog"
```

---

### Task 9: Deploy to GitHub Pages

The repository is private and the account is on GitHub Pro, which permits Pages from private repositories. Enabling Pages is the first step here precisely so an insufficient plan fails loudly rather than publishing a broken site.

**The asset-path trap:** the model loads as `useGLTF("/upgradeddog-v1-transformed.glb")`. Served from `/vscodemainrepo/`, that root-absolute path resolves to `bigk-out.github.io/upgradeddog-v1-transformed.glb` — a 404 that yields an empty gold scene with no dogs and no obvious error. Every `public/` asset must route through `import.meta.env.BASE_URL`.

**Files:**
- Modify: `vite.config.js`, `src/App.jsx`
- Create: `.github/workflows/deploy.yml` (at repository root, not project root)

- [ ] **Step 1: Set the base path**

```js
// projects/dogs-gold/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import glsl from 'vite-plugin-glsl';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/vscodemainrepo/',
  plugins: [react(),glsl()],
})
```

- [ ] **Step 2: Route the model through the base URL**

The literal path appears exactly once, in the `useGLTF(...)` call inside `Dog`
(line 454). There is no `useGLTF.preload` call in this file. Replace it with:

```jsx
const MODEL_URL = `${import.meta.env.BASE_URL}upgradeddog-v1-transformed.glb`
```

declared at module scope, then `useGLTF(MODEL_URL)`. `BASE_URL` always ends in `/`, so do not add one.

- [ ] **Step 3: Verify the built site under the real path prefix**

```bash
cd projects/dogs-gold
node node_modules/vite/bin/vite.js build
mkdir -p /tmp/pages-check/vscodemainrepo
cp -r dist/* /tmp/pages-check/vscodemainrepo/
cd /tmp/pages-check && python3 -m http.server 8099
```

Open `http://localhost:8099/vscodemainrepo/`. Expected: dogs load and the piece behaves exactly as in dev. **A gold scene with no dogs means the model 404'd** — check the network tab and fix the path before continuing. Stop the server when done.

- [ ] **Step 4: Add the workflow**

```yaml
# .github/workflows/deploy.yml  (repository root)
name: Deploy dogs-gold to Pages

on:
  push:
    branches: [main]
    paths: ['projects/dogs-gold/**', '.github/workflows/deploy.yml']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: projects/dogs-gold
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: projects/dogs-gold/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Add the test script**

The workflow runs `npm test`, which currently does not exist in `projects/dogs-gold/package.json`. Add it to `scripts`:

```json
"test": "node --test src/loupe/"
```

- [ ] **Step 6: Enable Pages with the Actions source**

```bash
gh api -X POST repos/BigK-Out/vscodemainrepo/pages \
  -f 'build_type=workflow' 2>&1 || \
gh api -X PUT repos/BigK-Out/vscodemainrepo/pages -f 'build_type=workflow'
```

Expected: JSON describing the Pages site. A `404`/`403` mentioning plan or billing means the account is not actually on a plan that allows Pages from private repositories — **stop and report to the user** rather than making the repository public.

- [ ] **Step 7: Commit, then confirm before pushing**

```bash
git add projects/dogs-gold/vite.config.js projects/dogs-gold/src/App.jsx \
        projects/dogs-gold/package.json .github/workflows/deploy.yml
git commit -m "ci: build and deploy dogs-gold to GitHub Pages"
```

**Do not push without asking the user.** Pushing publishes the reorganisation and this feature to the remote, and triggers a live deploy. Ask first, then:

```bash
git push origin main
gh run watch
```

- [ ] **Step 8: Verify the live site**

Open `https://bigk-out.github.io/vscodemainrepo/`. Expected: the dogs load, the lens follows the pointer, and selection plus the credentials card work as they do locally. Check the console for 404s.

---

## Notes for the implementer

- `App.jsx` is 731 lines and holds several components. Line numbers cited here are from the pre-change file and will drift as you work — locate code by component name, not by line.
- There is uncommitted work in `src/App.jsx` at the time of writing. Do not revert or stash it; build on top.
- Tunable constants, all deliberately in one place each: `LOUPE_SIZE_PX`, `GLASS_CX_RATIO`, `GLASS_CY_RATIO`, `GLASS_RADIUS_RATIO` in `Loupe.jsx`; `SELECT_RADIUS`, `RELEASE_MARGIN`, `DWELL_MS` in `useDogSelection.js`. The three ratios are measured properties of the asset — change them only if the asset is replaced.
- `useFrame` priorities now in use: `-2` projector, `-1` physics, `-0.5` selection, `0` dog transforms, `1` the effect composer. Keep new work inside that ordering.
