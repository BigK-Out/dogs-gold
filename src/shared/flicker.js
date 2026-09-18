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

// How brightly a failing tube burns `ms` after it is switched on.
//
// It strikes far too bright, settles, and from then on holds steady except for
// its stutters: brief dips, written out and repeated every `period`, because a
// tube that flickers does the same thing over and over. Randomness gives a
// nervous shimmer, which is a different fault entirely.
//
// `stutters` are [at, duration, level] within a period; `strike` is how much
// brighter it burns at the moment it lights, dying away over `settle`.
export function tubeGlow(ms, { stutters = [], period = 6000, strike = 0, settle = 1 }) {
  if (ms < 0) return 0

  let level = 1
  const withinPeriod = ms % period
  for (const [at, duration, dip] of stutters) {
    if (withinPeriod >= at && withinPeriod < at + duration) {
      level = Math.min(level, dip)
    }
  }

  // The strike: brightest at the instant it lights, gone by `settle`.
  const flare = ms < settle ? strike * (1 - smoothstep(0, settle, ms)) : 0
  return level + flare
}

// The stutters of every letter in a sign, as `count` lists for tubeGlow.
//
// A sign does not fail as one: a handful of its letters are on their way out
// and the rest burn steady. `unsteady` is the fraction that are faulty, and each
// of those gets one burst of one to three dips, in a stretch of the period of
// its own. Written from a seed, not from Math.random(), so the same sign fails
// the same way every period and every visit — a fault has a rhythm.
//
// Nothing dips before `after`, so a burst never lands on the strike.
export function letterStutters(count, { period, after = 0, unsteady = 0.3, seed = 1 }) {
  let state = seed >>> 0 || 1
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }

  return Array.from({ length: count }, () => {
    if (random() >= unsteady) return []
    const dips = 1 + Math.floor(random() * 3)
    const stutters = []
    // Room for the whole burst inside the period: three dips take at most ~400ms.
    let at = after + random() * Math.max(period - after - 450, 0)
    for (let i = 0; i < dips; i++) {
      const duration = 40 + random() * 55
      stutters.push([at, duration, 0.08 + random() * 0.45])
      at += duration + 35 + random() * 40
    }
    return stutters
  })
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
