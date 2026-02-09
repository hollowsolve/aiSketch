// @renderer
import type { Scene, SceneNode, StrokeNode, Component, RenderOptions } from './types'
import { interpolateSpline } from './spline'
import { applyWobble, applyTaper, applyOvershoot } from './wobble'
import { renderBrushStroke } from './brush'

// @renderer-collect-strokes
export interface FlatStroke {
  node: StrokeNode
  transforms: Component['transform'][]
  depth: number
}

export function collectStrokes(scene: Scene): FlatStroke[] {
  const strokes: FlatStroke[] = []
  walkNode(scene.root, [], 0, strokes)
  strokes.sort((a, b) => a.node.layer - b.node.layer || a.depth - b.depth)
  return strokes
}

function walkNode(
  node: SceneNode,
  parentTransforms: Component['transform'][],
  depth: number,
  out: FlatStroke[]
) {
  if (node.type === 'stroke') {
    out.push({ node, transforms: [...parentTransforms], depth })
  } else {
    const transforms = [...parentTransforms, node.transform]
    for (const child of node.children) {
      walkNode(child, transforms, depth + 1, out)
    }
  }
}
// @renderer-collect-strokes-end

// @renderer-draw
export function renderScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  opts: RenderOptions
) {
  ctx.clearRect(0, 0, scene.canvas.width, scene.canvas.height)
  const strokes = collectStrokes(scene)
  for (const flat of strokes) {
    renderSingleStroke(ctx, flat, opts)
  }
}

export function renderSingleStroke(
  ctx: CanvasRenderingContext2D,
  flat: FlatStroke,
  opts: RenderOptions
) {
  const { node, transforms } = flat

  ctx.save()
  for (const t of transforms) {
    ctx.translate(t.origin[0] + t.position[0], t.origin[1] + t.position[1])
    ctx.rotate(t.rotation)
    ctx.scale(t.scale[0], t.scale[1])
    ctx.translate(-t.origin[0], -t.origin[1])
  }

  ctx.fillStyle = '#1a1a1a'

  let points = interpolateSpline(node.points, node.tension)
  const strokeSeed = hashString(node.name) + opts.seed
  points = applyWobble(points, opts, strokeSeed)
  points = applyTaper(points)
  points = applyOvershoot(points, opts.fidelity, strokeSeed + 999)

  renderBrushStroke(ctx, points, node.brush, { ...opts, seed: strokeSeed })

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
// @renderer-utils-end
