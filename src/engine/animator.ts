// @animator
import type { Scene, RenderOptions } from './types'
import { collectStrokes, renderSingleStroke, type FlatStroke } from './renderer'

export interface AnimationOptions extends RenderOptions {
  strokeDuration: number
  layerPause: number
  onProgress?: (progress: number) => void
  onComplete?: () => void
}

export const DEFAULT_ANIMATION_OPTIONS: Omit<AnimationOptions, keyof RenderOptions> = {
  strokeDuration: 400,
  layerPause: 200,
}

export interface AnimationHandle {
  cancel: () => void
  pause: () => void
  resume: () => void
}

export function animateScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  opts: AnimationOptions
): AnimationHandle {
  const strokes = collectStrokes(scene)
  let cancelled = false
  let paused = false
  let currentStroke = 0
  let strokeStart = 0
  let layerPausing = false
  let pauseUntil = 0
  let animFrame = 0

  ctx.clearRect(0, 0, scene.canvas.width, scene.canvas.height)

  const drawnStrokes: FlatStroke[] = []

  function tick(now: number) {
    if (cancelled) return
    if (paused) {
      animFrame = requestAnimationFrame(tick)
      return
    }

    if (layerPausing) {
      if (now >= pauseUntil) {
        layerPausing = false
      } else {
        animFrame = requestAnimationFrame(tick)
        return
      }
    }

    if (currentStroke >= strokes.length) {
      opts.onProgress?.(1)
      opts.onComplete?.()
      return
    }

    if (strokeStart === 0) strokeStart = now

    const elapsed = now - strokeStart
    const progress = Math.min(1, elapsed / opts.strokeDuration)

    ctx.clearRect(0, 0, scene.canvas.width, scene.canvas.height)

    for (const drawn of drawnStrokes) {
      renderSingleStroke(ctx, drawn, opts)
    }

    const current = strokes[currentStroke]
    renderPartialStroke(ctx, current, progress, opts)

    const totalProgress = (currentStroke + progress) / strokes.length
    opts.onProgress?.(totalProgress)

    if (progress >= 1) {
      drawnStrokes.push(current)
      currentStroke++
      strokeStart = 0

      if (
        currentStroke < strokes.length &&
        strokes[currentStroke].node.layer !== current.node.layer
      ) {
        layerPausing = true
        pauseUntil = now + opts.layerPause
      }
    }

    animFrame = requestAnimationFrame(tick)
  }

  animFrame = requestAnimationFrame(tick)

  return {
    cancel: () => { cancelled = true; cancelAnimationFrame(animFrame) },
    pause: () => { paused = true },
    resume: () => { paused = false },
  }
}

// @animator-partial
function renderPartialStroke(
  ctx: CanvasRenderingContext2D,
  flat: FlatStroke,
  progress: number,
  opts: RenderOptions
) {
  if (progress >= 1) {
    renderSingleStroke(ctx, flat, opts)
    return
  }

  const { node, transforms } = flat

  ctx.save()
  for (const t of transforms) {
    ctx.translate(t.origin[0] + t.position[0], t.origin[1] + t.position[1])
    ctx.rotate(t.rotation)
    ctx.scale(t.scale[0], t.scale[1])
    ctx.translate(-t.origin[0], -t.origin[1])
  }

  const totalPoints = node.points.length
  const visibleCount = Math.max(2, Math.ceil(totalPoints * progress))
  const partialPoints = node.points.slice(0, visibleCount)

  const partialNode = { ...node, points: partialPoints }
  const partialFlat: FlatStroke = { node: partialNode, transforms: [], depth: flat.depth }

  ctx.restore()

  renderSingleStroke(ctx, partialFlat, opts)
}
// @animator-partial-end
// @animator-end
