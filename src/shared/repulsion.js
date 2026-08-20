// Pure, and deliberately importing nothing — like selection.js and
// navigation.js, so `node --test` can load it directly. physics.js itself
// cannot be tested that way: it imports react-three-fiber through
// extensionless specifiers that only Vite resolves.

// Tuned against a simulation of the pursuit the damping exists to fix — pointer
// homing on one dog for four seconds — measuring total impulse delivered:
//
//   pointer speed   ~px/s @1080p   impulse vs before
//   0.2 u/frame            192           47%
//   0.4                    384           60%
//   0.8                    768           81%
//   1.2 and above         1152+         100%   (untouched)
//
// calmRadius matches the default repulsionRadius deliberately: when the pointer
// is slow, the damping should span the whole field rather than leaving a hard
// ring where the push suddenly returns. calmSpeed sits above a normal chase but
// below a deliberate flick, which is the gesture that must keep scattering the
// pack at full force.
export const DEFAULT_CALM = {
  calmRadius: 4.5,
  calmSpeed: 1.2,
  calmFloor: 0.1,
}

// Repulsion's own falloff grows as the pointer closes in, so chasing a dog with
// the instrument shoves it harder the nearer you get — the opposite of what
// inspecting one wants. A pointer that is both near and slow is inspecting, not
// shooing, so damp the push toward `calmFloor` as those two conditions hold
// together.
//
// Either condition alone leaves the push untouched: a fast flick at point-blank
// range still scatters the pack (`slow` is 0 at or above `calmSpeed`), and a
// crawling pointer out at `calmRadius` still nudges (`near` is 0). Only the
// product attenuates, which is why the damping cannot swallow the effect
// wholesale.
//
// `distance` and `calmRadius` are world units on the dog plane; `speed` and
// `calmSpeed` are world units per frame, matching `pointer.speed`.
export function calmDamping(distance, speed, config) {
  const { calmRadius, calmSpeed, calmFloor = 0 } = config
  if (!calmRadius || !calmSpeed) return 1
  const near = Math.max(0, 1 - distance / calmRadius)
  const slow = Math.max(0, 1 - speed / calmSpeed)
  return 1 - (1 - calmFloor) * near * slow
}
