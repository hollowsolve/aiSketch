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
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[Math.min(n - 1, i + 1)]
    const p3 = points[Math.min(n - 1, i + 2)]

    const steps = i === n - 2 ? segmentsPerSpan + 1 : segmentsPerSpan

    for (let j = 0; j < steps; j++) {
      const t = j / segmentsPerSpan
      const globalT = globalIndex / totalSamples

      const x = catmullRom(p0.x, p1.x, p2.x, p3.x, t, tension)
      const y = catmullRom(p0.y, p1.y, p2.y, p3.y, t, tension)
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

function catmullRom(
  p0: number, p1: number, p2: number, p3: number,
  t: number, tension: number
): number {
  const alpha = (1 - tension) * 0.5
  const t2 = t * t
  const t3 = t2 * t

  const m0 = alpha * (p2 - p0)
  const m1 = alpha * (p3 - p1)

  const a = 2 * p1 - 2 * p2 + m0 + m1
  const b = -3 * p1 + 3 * p2 - 2 * m0 - m1
  const c = m0
  const d = p1

  return a * t3 + b * t2 + c * t + d
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
