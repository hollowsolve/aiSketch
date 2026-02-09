// @brush
import type { Brush, InterpolatedPoint, RenderOptions } from './types'

interface StampParams {
  x: number
  y: number
  size: number
  opacity: number
  hardness: number
  angle: number
}

// @brush-render-stroke
export function renderBrushStroke(
  ctx: CanvasRenderingContext2D,
  points: InterpolatedPoint[],
  brush: Brush,
  opts: RenderOptions
) {
  if (points.length < 2) return

  const totalLength = computePathLength(points)
  const stampInterval = Math.max(brush.size * brush.spacing, 0.5)
  const stamps = Math.ceil(totalLength / stampInterval)

  let distAccum = 0
  let ptIdx = 0

  for (let s = 0; s <= stamps; s++) {
    const targetDist = s * stampInterval

    while (ptIdx < points.length - 1) {
      const segLen = dist(points[ptIdx], points[ptIdx + 1])
      if (distAccum + segLen >= targetDist) break
      distAccum += segLen
      ptIdx++
    }

    if (ptIdx >= points.length - 1) break

    const segLen = dist(points[ptIdx], points[ptIdx + 1])
    const localT = segLen > 0 ? (targetDist - distAccum) / segLen : 0
    const a = points[ptIdx]
    const b = points[ptIdx + 1]

    const x = a.x + (b.x - a.x) * localT
    const y = a.y + (b.y - a.y) * localT
    const w = a.w + (b.w - a.w) * localT
    const o = a.o + (b.o - a.o) * localT
    const h = a.h + (b.h - a.h) * localT

    const dx = b.x - a.x
    const dy = b.y - a.y
    const pathAngle = Math.atan2(dy, dx)

    const seed = opts.seed + s * 0.73
    const sizeJitter = 1 + (seededRandom(seed) - 0.5) * 2 * brush.jitter.size
    const opacityJitter = 1 + (seededRandom(seed + 50) - 0.5) * 2 * brush.jitter.opacity
    const angleJitter = (seededRandom(seed + 100) - 0.5) * Math.PI * brush.jitter.angle

    const scatterOffset = (seededRandom(seed + 150) - 0.5) * 2 * brush.scatter * brush.size
    const nx = a.nx + (b.nx - a.nx) * localT
    const ny = a.ny + (b.ny - a.ny) * localT

    const stamp: StampParams = {
      x: x + nx * scatterOffset,
      y: y + ny * scatterOffset,
      size: brush.size * w * sizeJitter,
      opacity: brush.opacity * o * brush.flow * opacityJitter,
      hardness: h,
      angle: pathAngle + angleJitter
    }

    renderStamp(ctx, stamp, brush.type, seed)
  }
}
// @brush-render-stroke-end

// @brush-stamps
function renderStamp(
  ctx: CanvasRenderingContext2D,
  p: StampParams,
  type: Brush['type'],
  seed: number
) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.angle)
  ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity))

  const r = p.size / 2

  switch (type) {
    case 'round':
      drawRoundStamp(ctx, r, p.hardness)
      break
    case 'square':
      drawSquareStamp(ctx, r, p.hardness)
      break
    case 'pixel':
      drawPixelStamp(ctx, r)
      break
    case 'spray':
      drawSprayStamp(ctx, r, seed)
      break
    case 'calligraphy':
      drawCalligraphyStamp(ctx, r, p.hardness)
      break
    case 'chalk':
      drawChalkStamp(ctx, r, seed)
      break
    case 'charcoal':
      drawCharcoalStamp(ctx, r, p.hardness, seed)
      break
    case 'watercolor':
      drawWatercolorStamp(ctx, r, p.hardness)
      break
  }

  ctx.restore()
}

function drawRoundStamp(ctx: CanvasRenderingContext2D, r: number, hardness: number) {
  if (hardness >= 0.95) {
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
  } else {
    const gradient = ctx.createRadialGradient(0, 0, r * hardness, 0, 0, r)
    gradient.addColorStop(0, ctx.fillStyle as string)
    const col = parseColor(ctx.fillStyle as string)
    gradient.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawSquareStamp(ctx: CanvasRenderingContext2D, r: number, hardness: number) {
  if (hardness >= 0.95) {
    ctx.fillRect(-r, -r, r * 2, r * 2)
  } else {
    const edge = r * (1 - hardness) * 0.5
    ctx.beginPath()
    roundRect(ctx, -r, -r, r * 2, r * 2, edge)
    ctx.fill()
  }
}

function drawPixelStamp(ctx: CanvasRenderingContext2D, r: number) {
  const s = Math.max(1, Math.round(r * 2))
  ctx.fillRect(-s / 2, -s / 2, s, s)
}

function drawSprayStamp(ctx: CanvasRenderingContext2D, r: number, seed: number) {
  const dots = Math.max(3, Math.floor(r * 2))
  for (let i = 0; i < dots; i++) {
    const angle = seededRandom(seed + i * 7.3) * Math.PI * 2
    const dist = seededRandom(seed + i * 13.1 + 50) * r
    const dotR = 0.5 + seededRandom(seed + i * 19.7 + 100) * 0.5
    ctx.beginPath()
    ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, dotR, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCalligraphyStamp(ctx: CanvasRenderingContext2D, r: number, hardness: number) {
  ctx.save()
  ctx.scale(1, 0.35 + hardness * 0.15)
  ctx.beginPath()
  ctx.ellipse(0, 0, r, r * 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawChalkStamp(ctx: CanvasRenderingContext2D, r: number, seed: number) {
  const patches = Math.max(4, Math.floor(r * 3))
  for (let i = 0; i < patches; i++) {
    const ox = (seededRandom(seed + i * 3.1) - 0.5) * r * 1.6
    const oy = (seededRandom(seed + i * 7.7) - 0.5) * r * 1.6
    if (ox * ox + oy * oy > r * r) continue
    const pr = 0.3 + seededRandom(seed + i * 11.3) * 0.8
    ctx.globalAlpha *= (0.3 + seededRandom(seed + i * 17.9) * 0.7)
    ctx.beginPath()
    ctx.arc(ox, oy, pr, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCharcoalStamp(ctx: CanvasRenderingContext2D, r: number, hardness: number, seed: number) {
  const gradient = ctx.createRadialGradient(0, 0, r * hardness * 0.5, 0, 0, r)
  const col = parseColor(ctx.fillStyle as string)
  gradient.addColorStop(0, `rgba(${col.r},${col.g},${col.b},1)`)
  gradient.addColorStop(0.6, `rgba(${col.r},${col.g},${col.b},0.7)`)
  gradient.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  const grains = Math.floor(r * 4)
  ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.8)`
  for (let i = 0; i < grains; i++) {
    const gx = (seededRandom(seed + i * 5.3) - 0.5) * r * 2
    const gy = (seededRandom(seed + i * 9.1) - 0.5) * r * 2
    if (gx * gx + gy * gy > r * r) continue
    ctx.fillRect(gx, gy, 0.5, 0.5)
  }
}

function drawWatercolorStamp(ctx: CanvasRenderingContext2D, r: number, hardness: number) {
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  const col = parseColor(ctx.fillStyle as string)
  gradient.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${0.3 + hardness * 0.3})`)
  gradient.addColorStop(0.5, `rgba(${col.r},${col.g},${col.b},${0.15 + hardness * 0.15})`)
  gradient.addColorStop(0.8, `rgba(${col.r},${col.g},${col.b},${0.05})`)
  gradient.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2)
  ctx.fill()
}
// @brush-stamps-end

// @brush-utils
function computePathLength(points: InterpolatedPoint[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += dist(points[i - 1], points[i])
  }
  return len
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49.397
  return x - Math.floor(x)
}

function parseColor(style: string): { r: number; g: number; b: number } {
  if (style.startsWith('#')) {
    const hex = style.slice(1)
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    }
  }
  const match = style.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (match) {
    return { r: +match[1], g: +match[2], b: +match[3] }
  }
  return { r: 0, g: 0, b: 0 }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
// @brush-utils-end
