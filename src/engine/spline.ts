// @spline
import type { StrokePoint, InterpolatedPoint } from './types'

export function interpolateSpline(
  points: StrokePoint[],
  tension: number,
  segmentsPerSpan = 12
): InterpolatedPoint[] {
  if (points.length === 0) return []
  if (points.length === 1) {
    return [{ x: points[0].x, y: points[0].y, w: points[0].w, o: points[0].o, h: points[0].h, nx: 0, ny: -1, t: 0 }]
  }
  if (points.length === 2) {
    return interpolateLinear(points[0], points[1], segmentsPerSpan)
  }

  const result: InterpolatedPoint[] = []
  const n = points.length
  const totalSpans = n - 1
  let globalIndex = 0
  const totalSamples = totalSpans * segmentsPerSpan

  for (let i = 0; i < n - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const p0 = i > 0 ? points[i - 1] : { ...p1, x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y }
    const p3 = i + 2 < n ? points[i + 2] : { ...p2, x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y }

    const d01 = ptDist(p0, p1) || 1
    const d12 = ptDist(p1, p2) || 1
    const d23 = ptDist(p2, p3) || 1

    const steps = i === n - 2 ? segmentsPerSpan + 1 : segmentsPerSpan

    for (let j = 0; j < steps; j++) {
      const t = j / segmentsPerSpan
      const globalT = globalIndex / totalSamples

      const x = catmullRomScaled(p0.x, p1.x, p2.x, p3.x, t, tension, d01, d12, d23)
      const y = catmullRomScaled(p0.y, p1.y, p2.y, p3.y, t, tension, d01, d12, d23)
      const w = lerp(p1.w, p2.w, t)
      const o = lerp(p1.o, p2.o, t)
      const h = lerp(p1.h, p2.h, t)

      result.push({ x, y, w, o, h, nx: 0, ny: 0, t: globalT })
      globalIndex++
    }
  }

  computeNormals(result)
  return result
}

function catmullRomScaled(
  v0: number, v1: number, v2: number, v3: number,
  t: number, tension: number,
  d01: number, d12: number, d23: number
): number {
  const alpha = (1 - tension) * 0.5
  const t2 = t * t
  const t3 = t2 * t

  const r01 = d12 / d01
  const r23 = d12 / d23
  const s0 = Math.min(r01, 2)
  const s1 = Math.min(r23, 2)

  const m0 = alpha * (v2 - v0) * s0
  const m1 = alpha * (v3 - v1) * s1

  const a = 2 * v1 - 2 * v2 + m0 + m1
  const b = -3 * v1 + 3 * v2 - 2 * m0 - m1
  const c = m0
  const d = v1

  return a * t3 + b * t2 + c * t + d
}

function ptDist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function interpolateLinear(a: StrokePoint, b: StrokePoint, steps: number): InterpolatedPoint[] {
  const result: InterpolatedPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    result.push({
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      w: lerp(a.w, b.w, t),
      o: lerp(a.o, b.o, t),
      h: lerp(a.h, b.h, t),
      nx: 0, ny: 0,
      t
    })
  }
  computeNormals(result)
  return result
}

function computeNormals(pts: InterpolatedPoint[]) {
  for (let i = 0; i < pts.length; i++) {
    let dx: number, dy: number
    if (i === 0) {
      dx = pts[1].x - pts[0].x
      dy = pts[1].y - pts[0].y
    } else if (i === pts.length - 1) {
      dx = pts[i].x - pts[i - 1].x
      dy = pts[i].y - pts[i - 1].y
    } else {
      dx = pts[i + 1].x - pts[i - 1].x
      dy = pts[i + 1].y - pts[i - 1].y
    }
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    pts[i].nx = -dy / len
    pts[i].ny = dx / len
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
// @spline-end
