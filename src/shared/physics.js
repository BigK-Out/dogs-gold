// src/shared/physics.js
import { useFrame } from "@react-three/fiber"
import { pointer } from "./usePointer"
import { calmDamping, DEFAULT_CALM } from "./repulsion"

export const DEFAULT_PHYSICS = {
  collisionRadius: 0.75,
  barriers: [],
  repulsionRadius: 4.5,
  repulsionGain: 0.06,
  ...DEFAULT_CALM,
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
          // Damps both the impulse and the steer, so a slow pointer close in
          // neither knocks a dog away nor bends its heading.
          const calm = calmDamping(md, ms, config)
          const impact =
            Math.min(effectiveSpeed * config.repulsionGain, 0.05) * falloff * calm
          d.vx += awayX * impact
          d.vy += awayY * impact
          // Steer only above threshold
          const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy)
          const steer = 0.03 * falloff * Math.min(effectiveSpeed, 1) * calm
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
