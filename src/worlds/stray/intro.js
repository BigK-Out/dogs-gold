// src/worlds/stray/intro.js
// The arrival: the descent's last step opens on hell. Shared by the Scene (the
// water and the dogs) and the Header (which message is showing), so every part
// of the world turns red and settles on the same schedule.
import * as THREE from "three"

// The water runs as dark blood with ember highlights over a deep-red ground,
// then settles into the world's own dirt water. Hold and fade are measured from
// the world's first frame, which is as the curtain begins its 600ms lift.
export const HELL_INTRO = {
  palette: {
    stops: [
      [0.025, 0.0, 0.0], // clotted black-red
      [0.09, 0.004, 0.0], // dried blood
      [0.2, 0.01, 0.003], // dark blood
      [0.33, 0.03, 0.006], // deep blood
      [0.45, 0.08, 0.015], // dim ember
    ],
    base: [0.02, 0.001, 0.0],
  },
  holdMs: 2500,
  fadeMs: 1600,
}

// The dogs' look through the intro: bright blood-red metal. Metalness stops
// short of 1 so some of the red stays diffuse and bright under the dimmed
// environment, rather than only showing where it reflects.
export const HELL_DOG = {
  color: new THREE.Color().setHSL(0.0, 0.9, 0.42),
  metalness: 0.85,
  roughness: 0.28,
}
