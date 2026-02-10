// @engine-index
export type {
  StyleName,
  StrokeNode,
  FillNode,
  Transform,
  DesignMeta,
  Component,
  SceneNode,
  Scene,
  ResolvedStyle,
  RenderOptions,
  BrushType,
  BrushJitter,
  Brush,
  StrokePoint,
  InterpolatedPoint,
} from './types'

export { DEFAULT_RENDER_OPTIONS, DEFAULT_BRUSH } from './types'
export { interpolateSpline } from './spline'
export { applyWobble, applyTaper, applyOvershoot } from './wobble'
export { renderBrushStroke } from './brush'
export { renderScene, collectStrokes, renderSingleStroke, renderSingleFill } from './renderer'
export { animateScene, DEFAULT_ANIMATION_OPTIONS } from './animator'
export { resolveStyle, strokeToPoints, fillToPoints, STYLE_PRESETS } from './styles'
export type { AnimationOptions, AnimationHandle } from './animator'
export type { FlatStroke, FlatElement } from './renderer'
// @engine-index-end
