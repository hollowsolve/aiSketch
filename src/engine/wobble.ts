// @wobble
import type { InterpolatedPoint, RenderOptions } from './types'

export function applyWobble(
  points: InterpolatedPoint[],
  opts: RenderOptions,
  strokeSeed: number
): InterpolatedPoint[] {
  if (opts.wobble <= 0) return points

  const amplitude = opts.wobble * (1.2 - opts.fidelity) * 2.0

  return points.map((pt, i) => {
    const seed = strokeSeed + i * 0.37
    const dx = noise(seed, i * 0.15) * amplitude
    const dy = noise(seed + 100, i * 0.15) * amplitude

    return { ...pt, x: pt.x + dx, y: pt.y + dy }
  })
}

export function applyTaper(
  points: InterpolatedPoint[],
  taperStart = 0.08,
  taperEnd = 0.06
): InterpolatedPoint[] {
  return points.map(pt => {
    let widthMul = 1
    if (pt.t < taperStart) {
      widthMul = pt.t / taperStart
    } else if (pt.t > 1 - taperEnd) {
      widthMul = (1 - pt.t) / taperEnd
    }
    widthMul = smoothstep(widthMul)
    return { ...pt, w: pt.w * widthMul }
  })
}

export function applyOvershoot(
  points: InterpolatedPoint[],
  fidelity: number,
  seed: number
): InterpolatedPoint[] {
  if (fidelity > 0.7 || points.length < 3) return points

  const overshootChance = (0.7 - fidelity) * 1.5
  if (seededRandom(seed) > overshootChance) return points

  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  const dx = last.x - prev.x
  const dy = last.y - prev.y
  const ext = (0.5 - fidelity) * 8

  const extra: InterpolatedPoint = {
    ...last,
    x: last.x + dx * ext,
    y: last.y + dy * ext,
    w: last.w * 0.3,
    o: last.o * 0.5,
    t: 1.0
  }

  return [...points, extra]
}

function noise(seed: number, x: number): number {
  return (
    Math.sin(seed * 127.1 + x * 311.7) * 0.5 +
    Math.sin(seed * 269.5 + x * 183.3) * 0.3 +
    Math.sin(seed * 419.2 + x * 577.9) * 0.2
  )
}

function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t))
  return t * t * (3 - 2 * t)
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49.397
  return x - Math.floor(x)
}
// @wobble-end
