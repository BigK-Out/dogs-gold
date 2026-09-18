// Pure, and deliberately importing nothing, so `node --test` can load it — see
// repulsion.js and intro.js.

const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

// One cut: dark falls, holds a moment, and lifts again, eased at both ends like
// the shell's curtain. A hard cut reads as a dropped frame; this reads as the
// lights going out and coming back.
function pulse(t) {
  if (t < 0.4) return smoothstep(0, 0.4, t)
  if (t < 0.6) return 1
  return 1 - smoothstep(0.6, 1, t)
}

// How black the screen is `ms` after a world arrives, for a world whose lights
// fail as it settles.
//
// `pulses` are the moments the dark falls, in milliseconds, each lasting
// `duration`. They are written out rather than generated: a failing light has a
// rhythm — a long dark, a stutter, a pause that makes you think it is over —
// and randomness gives an even stammer instead.
//
// From `softenFrom` each cut lands lighter than the last, so the world fades in
// rather than stopping abruptly at the final one.
export function blackoutAt(ms, { pulses, duration = 600, softenFrom = Infinity, endsAt = Infinity }) {
  let darkest = 0
  for (const start of pulses) {
    const t = (ms - start) / duration
    if (t < 0 || t > 1) continue
    darkest = Math.max(darkest, pulse(t))
  }
  if (darkest === 0 || ms < softenFrom) return darkest
  const through = Math.min((ms - softenFrom) / (endsAt - softenFrom), 1)
  return darkest * (1 - through)
}
