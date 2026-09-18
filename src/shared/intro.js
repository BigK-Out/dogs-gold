// Pure, and deliberately importing nothing, so `node --test` can load it — see
// repulsion.js.

// How strongly a world's arrival intro applies `ms` after it began: 1 through
// `holdMs`, then a smooth ease to 0 across `fadeMs`, and 0 from then on.
//
// The background and anything else that joins the intro each measure `ms` from
// their own first frame. They mount together, so those first frames coincide
// and every part of the intro rises and settles in step.
export function introStrength(ms, { holdMs, fadeMs }) {
  if (ms <= holdMs) return 1
  const x = Math.min((ms - holdMs) / fadeMs, 1)
  return 1 - x * x * (3 - 2 * x)
}
