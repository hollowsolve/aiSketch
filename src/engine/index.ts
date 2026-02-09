// @engine-index
export type {
  StrokePoint,
  BrushType,
  BrushJitter,
  Brush,
  StrokeNode,
  Transform,
  DesignMeta,
  Component,
  SceneNode,
  Scene,
  InterpolatedPoint,
  RenderOptions,
} from './types'

export { DEFAULT_RENDER_OPTIONS, DEFAULT_BRUSH } from './types'
export { interpolateSpline } from './spline'
export { applyWobble, applyTaper, applyOvershoot } from './wobble'
export { renderBrushStroke } from './brush'
export { renderScene, collectStrokes, renderSingleStroke } from './renderer'
export { animateScene, DEFAULT_ANIMATION_OPTIONS } from './animator'
export type { AnimationOptions, AnimationHandle } from './animator'
export type { FlatStroke } from './renderer'
// @engine-index-end
