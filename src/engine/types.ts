// @types

export type StyleName =
  | 'outline'
  | 'outline-bold'
  | 'outline-fine'
  | 'detail'
  | 'hatching'
  | 'crosshatch'
  | 'shading'
  | 'sketch'
  | 'gesture'
  | 'underdrawing'
  | 'soft'
  | 'wash'
  | 'scumble'
  | 'texture'
  | 'accent'
  | 'highlight'
  | 'construction'
  | 'dimension'
  | 'label'

export interface StrokeNode {
  name: string
  type: 'stroke'
  layer: number
  style: StyleName
  color: string
  points: [number, number][]
  weight?: number
}

export interface FillNode {
  name: string
  type: 'fill'
  layer: number
  color: string
  opacity: number
  points: [number, number][]
}

export interface Transform {
  origin: [number, number]
  position: [number, number]
  scale: [number, number]
  rotation: number
}

export interface DesignMeta {
  roomType?: string
  area?: string
  wallConnections?: Array<{
    wall: string
    point?: string
    segment?: [number, number]
  }>
}

export interface Component {
  name: string
  type: 'component'
  transform: Transform
  designMeta?: DesignMeta
  children: SceneNode[]
}

export type SceneNode = Component | StrokeNode | FillNode

export interface Scene {
  name: string
  version: string
  mode: 'draw' | 'design' | 'sketch'
  background?: string
  canvas: { width: number; height: number }
  root: Component
}

export type BrushType =
  | 'round'
  | 'square'
  | 'pixel'
  | 'spray'
  | 'calligraphy'
  | 'chalk'
  | 'charcoal'
  | 'watercolor'

export interface BrushJitter {
  size: number
  opacity: number
  angle: number
}

export interface Brush {
  type: BrushType
  color?: string
  size: number
  opacity: number
  hardness: number
  flow: number
  spacing: number
  scatter: number
  jitter: BrushJitter
}

export interface StrokePoint {
  x: number
  y: number
  w: number
  o: number
  h: number
}

export interface InterpolatedPoint {
  x: number
  y: number
  w: number
  o: number
  h: number
  nx: number
  ny: number
  t: number
}

export interface ResolvedStyle {
  brush: Brush
  tension: number
}

export interface RenderOptions {
  wobble: number
  fidelity: number
  seed: number
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  wobble: 0.5,
  fidelity: 0.7,
  seed: 42
}

export const DEFAULT_BRUSH: Brush = {
  type: 'round',
  size: 3,
  opacity: 0.9,
  hardness: 0.8,
  flow: 1.0,
  spacing: 0.15,
  scatter: 0,
  jitter: { size: 0, opacity: 0, angle: 0 }
}
// @types-end
