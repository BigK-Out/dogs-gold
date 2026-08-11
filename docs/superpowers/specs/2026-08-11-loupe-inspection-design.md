# Loupe inspection — design

**Date:** 2026-08-11
**Project:** `projects/dogs-gold`
**Status:** approved, ready for planning

## Summary

Turn the decorative cursor into an inspection tool. A magnifying-glass image
follows the pointer; when it passes over a dog, that dog enlarges, brightens,
and — after a short dwell — reveals a card of credentials: name, age, location,
pedigree, grade, price.

The framing is a luxury dog showroom appraised through a jeweler's loupe. The
existing gold-river background and the loupe reference art (`lens.pdf`, a 10x
jeweler's loupe) already point at gem appraisal; this makes the interaction say
the same thing.

## Goals

- The loupe reads as a tool, not an ornament.
- Every dog is individually identifiable, with stable credentials that do not
  change as it drifts in and out of the glass.
- Selection feels deliberate: no strobing as dogs pass under the pointer.
- The build deploys to GitHub Pages with all assets resolving.

## Non-goals

Explicitly out of scope for this spec. Each is a later, separate piece of work.

- Optical magnification of the rendered frame. An earlier draft designed a
  second render pass with a narrowed camera and a distortion shader. Rejected:
  a real loupe magnifies whatever sits under it, including empty background,
  while this piece wants the *subject* to come forward. The simpler approach is
  also a fraction of the code.
- The luxury ↔ stray world switch, bottom arrows, and the palette / shine /
  background morph between them.
- Touch support (see Limitations).
- Restructuring `App.jsx` beyond what the feature requires.

## Architecture

New code lands in its own files. `App.jsx` keeps its current shape and is only
wired up.

```
src/
  App.jsx                 wire in the loupe, the card, and shared pointer state
  hooks/usePointer.js     NEW  single pointer source
  loupe/
    Loupe.jsx             NEW  the magnifying-glass image, follows pointer
    CredsCard.jsx         NEW  the credentials panel
    useSelection.js       NEW  nearest-dog selection + dwell state
    creds.js              NEW  deterministic per-dog credential generation
```

### Shared pointer

`App.jsx` currently registers three separate `mousemove` listeners:
`RippleScene` (line 109), `Scene` (line 557), and `Cursor` (line 611). They
disagree — `Cursor` lerps its position at `0.08` per frame while `Scene` tracks
the pointer instantly.

`usePointer` becomes the single source, exposing:

- `screen` — raw client coordinates
- `smooth` — lerped coordinates, for anything drawn on screen
- `world` — position on the dog plane at `z = -40`, via the existing raycast
- `speed` — world-space delta per frame, feeding the existing dog repulsion

The loupe image and the selection test must read the **same** value (`smooth`),
or the glass will indicate one dog while the card describes another.

### Selection without raycasting

Every dog's position already lives in `physicsRef`, and the pointer's world
position on that same plane is already computed. Selection is therefore a
nearest-neighbour scan over an array that already exists — about 50 distance
comparisons per frame, negligible next to the existing 1225-pair collision
loop.

```
candidate = argmin over dogs of |dog.xy - pointer.world.xy|
selected  = candidate if that distance < SELECT_RADIUS
```

`SELECT_RADIUS` starts at `1.2` world units, slightly wider than the existing
`COLLISION_RADIUS` of `0.75`, so the glass grabs a dog just before it visually
overlaps.

No raycaster, no per-dog colliders, no changes to the GLTF.

### Dwell

Dogs drift continuously, so a bare hover test would flicker. A small state
machine debounces it:

| State | Enters when | Leaves when |
| --- | --- | --- |
| `idle` | no dog within radius | a dog is within radius → `pending` |
| `pending` | dog entered radius | same dog held `DWELL_MS` → `locked`; dog lost → `idle` |
| `locked` | dwell satisfied | pointer leaves that dog's radius plus `RELEASE_MARGIN` → `idle` |

`DWELL_MS` starts at `500`. `RELEASE_MARGIN` adds `0.3` world units of
hysteresis so a dog hovering exactly at the boundary does not oscillate.

Enlargement begins at `pending` — immediate visual feedback that the glass has
found something. The card appears only at `locked`.

### Dog response

In each `Dog`'s existing `useFrame`, lerp toward targets rather than snapping:

- scale `0.065 → 0.12`
- `z` from `-40` toward `-36.5`, lifting it into the glass
- `emissive` on the dog's already-cloned `skin` material lerps from black
  toward a dim gold, lifting it out of the background without washing out the
  per-dog hue set at init

Lerp factor `0.12` per frame. Deselection lerps back to the same targets, so
there is one code path and no special release animation.

### Credentials

Generated once per dog at physics init, stored alongside its physics entry, and
never regenerated — a dog that leaves and re-enters the glass shows identical
credentials.

Generation is deterministic from the dog's index: index into fixed name,
location, and pedigree tables, then derive age, grade, and price from the same
index. No RNG, so the showroom is stable across reloads.

Fields, chosen to sustain the gem-appraisal framing:

| Field | Example |
| --- | --- |
| Name | Bijou |
| Age | 3 yrs |
| Location | Geneva |
| Pedigree | Standard Poodle |
| Grade | VVS1 |
| Certificate | No. 0417 |
| Price | 48,000 |

### Card presentation

A DOM panel near the loupe, offset so the glass never covers it, flipping to
the opposite side within roughly 320px of a viewport edge. It inherits the
existing typography — Josefin Sans, uppercase, wide letter-spacing — and the
gold-on-near-black palette. `pointer-events: none`, like the existing caption,
so it can never intercept the pointer and break selection. Fades in over
`250ms`.

## Deploy

Target: GitHub Pages on `BigK-Out/vscodemainrepo` via an Actions workflow that
builds `projects/dogs-gold` and publishes `dist/`.

**The asset-path landmine.** The model loads as
`useGLTF("/upgradeddog-v1-transformed.glb")`. Under Pages the site is served
from `/vscodemainrepo/`, so that root-absolute path resolves to
`bigk-out.github.io/upgradeddog-v1-transformed.glb` — a 404, producing an empty
gold scene with no dogs and no obvious error. Every public asset must route
through `import.meta.env.BASE_URL`, with `base: '/vscodemainrepo/'` set in
`vite.config.js`.

Pages on a private repository requires a paid plan; repository visibility must
be confirmed before wiring the workflow.

## Performance

`TextColorSampler` (line 488) performs five synchronous `gl.readPixels` calls
every frame. Each forces a CPU/GPU sync. This spec adds no render passes, so it
is not urgent, but it is the single largest avoidable cost in the frame and the
selection work sits in the same loop. Throttle to roughly 6Hz and reuse one
`Uint8Array`. The caption already transitions colour over `0.5s`, so nothing
visibly changes. `preserveDrawingBuffer: true` must stay — the readback depends
on it.

## Verification

The feature is visual and is verified by driving the running app.

- Screenshot before and after the pointer consolidation to confirm no
  behavioural change.
- Screenshot the loupe at rest, over a dog at `pending`, and at `locked` with
  the card shown.
- Move the pointer slowly across a cluster and confirm the card does not
  strobe, and that credentials stay attached to their dog.
- Confirm the card flips near a viewport edge.
- Check the browser console is free of errors.
- Compare frame timing before and after.
- Build, serve `dist/` under a `/vscodemainrepo/` path prefix, and confirm the
  dogs actually load before touching the deploy workflow.

## Limitations

Accepted deliberately, recorded so they are not mistaken for defects.

- **Desktop only.** Interaction is pointer-driven and the page sets
  `cursor: none`. On touch devices there is no hover, so the loupe cannot be
  positioned and no dog can be selected. Phones will see the scene without the
  feature.
- No `prefers-reduced-motion` handling.
- No fallback when WebGL is unavailable.

## Roadmap

Captured so the larger concept survives this slice.

1. **This spec** — loupe, selection, credentials.
2. **Two worlds** — bottom arrows travelling between the luxury showroom and a
   stray/injured counterpart, with background, palette, and dog shine morphing
   across the transition, degrading further with distance.
