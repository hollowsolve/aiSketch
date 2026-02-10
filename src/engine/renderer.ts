// @renderer
import type { Scene, SceneNode, StrokeNode, FillNode, Component, RenderOptions } from './types'
import { interpolateSpline } from './spline'
import { applyWobble, applyTaper, applyOvershoot } from './wobble'
import { renderBrushStroke } from './brush'
import { resolveStyle, strokeToPoints, fillToPoints } from './styles'

// @renderer-collect-elements
export interface FlatElement {
  node: StrokeNode | FillNode
  transforms: Component['transform'][]
  depth: number
}

export type FlatStroke = FlatElement

export function collectStrokes(scene: Scene): FlatElement[] {
  const elements: FlatElement[] = []
  walkNode(scene.root, [], 0, elements)
  elements.sort((a, b) => a.node.layer - b.node.layer || a.depth - b.depth)
  return elements
}

function walkNode(
  node: SceneNode,
  parentTransforms: Component['transform'][],
  depth: number,
  out: FlatElement[]
) {
  if (node.type === 'stroke' || node.type === 'fill') {
    out.push({ node, transforms: [...parentTransforms], depth })
  } else {
    const transforms = [...parentTransforms, node.transform]
    for (const child of node.children) {
      walkNode(child, transforms, depth + 1, out)
    }
  }
}
// @renderer-collect-elements-end

// @renderer-draw
export function renderScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  opts: RenderOptions
) {
  if (scene.background) {
    ctx.fillStyle = scene.background
    ctx.fillRect(0, 0, scene.canvas.width, scene.canvas.height)
  } else {
    ctx.clearRect(0, 0, scene.canvas.width, scene.canvas.height)
  }
  const elements = collectStrokes(scene)
  for (const el of elements) {
    if (el.node.type === 'fill') {
      renderSingleFill(ctx, el as FlatElement & { node: FillNode }, opts, scene.background)
    } else {
      renderSingleStroke(ctx, el as FlatElement & { node: StrokeNode }, opts)
    }
  }
}

export function renderSingleStroke(
  ctx: CanvasRenderingContext2D,
  flat: FlatElement & { node: StrokeNode },
  opts: RenderOptions
) {
  const { node, transforms } = flat
  const resolved = resolveStyle(node)
  const rawPoints = strokeToPoints(node.points, resolved)

  ctx.save()
  for (const t of transforms) {
    ctx.translate(t.origin[0] + t.position[0], t.origin[1] + t.position[1])
    ctx.rotate(t.rotation)
    ctx.scale(t.scale[0], t.scale[1])
    ctx.translate(-t.origin[0], -t.origin[1])
  }

  ctx.fillStyle = resolved.brush.color || '#1a1a1a'

  let points = interpolateSpline(rawPoints, resolved.tension)
  const strokeSeed = hashString(node.name) + opts.seed
  points = applyWobble(points, opts, strokeSeed)
  points = applyTaper(points)
  points = applyOvershoot(points, opts.fidelity, strokeSeed + 999)

  renderBrushStroke(ctx, points, resolved.brush, { ...opts, seed: strokeSeed })

  ctx.restore()
}

export function renderSingleFill(
  ctx: CanvasRenderingContext2D,
  flat: FlatElement & { node: FillNode },
  opts: RenderOptions,
  background?: string
) {
  const { node, transforms } = flat
  if (node.points.length < 3) return

  const rawPoints = fillToPoints(node.points)
  const seed = hashString(node.name) + opts.seed
  const wobbleOpts = { ...opts, wobble: opts.wobble * 0.3 }
  let interpolated = interpolateSpline(rawPoints, 0.4)
  interpolated = applyWobble(interpolated, wobbleOpts, seed)

  const shouldOcclude = node.occlude !== false && node.layer > 0

  const buildPath = () => {
    ctx.beginPath()
    ctx.moveTo(interpolated[0].x, interpolated[0].y)
    for (let i = 1; i < interpolated.length; i++) {
      ctx.lineTo(interpolated[i].x, interpolated[i].y)
    }
    ctx.closePath()
  }

  if (shouldOcclude) {
    ctx.save()
    for (const t of transforms) {
      ctx.translate(t.origin[0] + t.position[0], t.origin[1] + t.position[1])
      ctx.rotate(t.rotation)
      ctx.scale(t.scale[0], t.scale[1])
      ctx.translate(-t.origin[0], -t.origin[1])
    }
    ctx.globalCompositeOperation = 'destination-out'
    ctx.globalAlpha = 1
    ctx.fillStyle = '#000000'
    buildPath()
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    if (background) {
      ctx.globalAlpha = 1
      ctx.fillStyle = background
      buildPath()
      ctx.fill()
    }
    ctx.restore()
  }

  ctx.save()
  for (const t of transforms) {
    ctx.translate(t.origin[0] + t.position[0], t.origin[1] + t.position[1])
    ctx.rotate(t.rotation)
    ctx.scale(t.scale[0], t.scale[1])
    ctx.translate(-t.origin[0], -t.origin[1])
  }

  ctx.globalAlpha = node.opacity
  ctx.fillStyle = node.color
  buildPath()
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.restore()
}
// @renderer-draw-end

// @renderer-utils
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
export { hashString }
// @renderer-utils-end
