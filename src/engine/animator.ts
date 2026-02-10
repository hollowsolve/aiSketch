// @animator
import type { Scene, StrokeNode, FillNode, RenderOptions } from './types'
import { collectStrokes, renderSingleStroke, renderSingleFill, type FlatElement } from './renderer'

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
  const elements = collectStrokes(scene)
  let cancelled = false
  let paused = false
  let currentIdx = 0
  let strokeStart = 0
  let layerPausing = false
  let pauseUntil = 0
  let animFrame = 0

  const w = scene.canvas.width
  const h = scene.canvas.height

  if (scene.background) {
    ctx.fillStyle = scene.background
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.clearRect(0, 0, w, h)
  }

  const bufferCanvas = new OffscreenCanvas(
    ctx.canvas.width,
    ctx.canvas.height
  )
  const bufferCtx = bufferCanvas.getContext('2d')! as unknown as CanvasRenderingContext2D
  const dpr = ctx.canvas.width / w
  if (dpr !== 1) bufferCtx.scale(dpr, dpr)

  if (scene.background) {
    bufferCtx.fillStyle = scene.background
    bufferCtx.fillRect(0, 0, w, h)
  }

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

    if (currentIdx >= elements.length) {
      opts.onProgress?.(1)
      opts.onComplete?.()
      return
    }

    if (strokeStart === 0) strokeStart = now

    const current = elements[currentIdx]
    const isFill = current.node.type === 'fill'
    const duration = isFill ? opts.strokeDuration * 0.3 : opts.strokeDuration
    const elapsed = now - strokeStart
    const progress = Math.min(1, elapsed / duration)

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(bufferCanvas, 0, 0)
    ctx.restore()

    if (isFill) {
      renderPartialFill(ctx, current as FlatElement & { node: FillNode }, progress, opts, scene.background)
    } else {
      renderPartialStroke(ctx, current as FlatElement & { node: StrokeNode }, progress, opts)
    }

    const totalProgress = (currentIdx + progress) / elements.length
    opts.onProgress?.(totalProgress)

    if (progress >= 1) {
      if (isFill) {
        renderSingleFill(bufferCtx, current as FlatElement & { node: FillNode }, opts, scene.background)
      } else {
        renderSingleStroke(bufferCtx, current as FlatElement & { node: StrokeNode }, opts)
      }
      currentIdx++
      strokeStart = 0

      if (
        currentIdx < elements.length &&
        elements[currentIdx].node.layer !== current.node.layer
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
  flat: FlatElement & { node: StrokeNode },
  progress: number,
  opts: RenderOptions
) {
  if (progress >= 1) {
    renderSingleStroke(ctx, flat, opts)
    return
  }

  const { node, transforms } = flat
  const totalPoints = node.points.length
  const visibleCount = Math.max(2, Math.ceil(totalPoints * progress))
  const partialPoints = node.points.slice(0, visibleCount)

  const partialNode = { ...node, points: partialPoints }
  const partialFlat = { node: partialNode, transforms: [] as typeof transforms, depth: flat.depth }

  ctx.save()
  for (const t of transforms) {
    ctx.translate(t.origin[0] + t.position[0], t.origin[1] + t.position[1])
    ctx.rotate(t.rotation)
    ctx.scale(t.scale[0], t.scale[1])
    ctx.translate(-t.origin[0], -t.origin[1])
  }
  ctx.restore()

  renderSingleStroke(ctx, partialFlat, opts)
}

function renderPartialFill(
  ctx: CanvasRenderingContext2D,
  flat: FlatElement & { node: FillNode },
  progress: number,
  opts: RenderOptions,
  background?: string
) {
  const fadedNode = { ...flat.node, opacity: flat.node.opacity * progress }
  renderSingleFill(ctx, { ...flat, node: fadedNode }, opts, background)
}
// @animator-partial-end
// @animator-end
