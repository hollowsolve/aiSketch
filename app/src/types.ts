// @app-types
import type { Scene, Component, StrokeNode, Brush, BrushType } from '@engine/types'

export type AppMode = 'sketch' | 'design'

export type ToolType =
  | 'select'
  | 'draw'
  | 'eraser'
  | 'pan'
  | 'line'
  | 'rect'
  | 'dimension'
  | 'annotation'
  | 'zone'

export interface ViewportState {
  panX: number
  panY: number
  zoom: number
}

export interface SelectionState {
  selectedIds: Set<string>
  selectionBox: { x: number; y: number; w: number; h: number } | null
}

export interface DrawState {
  brush: Brush
  color: string
}

export interface DesignConfig {
  scale: string
  scaleRatio: number
  gridSpacing: number
  gridVisible: boolean
  snapToGrid: boolean
  sheetWidth: number
  sheetHeight: number
  sheetTitle: string
  sheetNumber: string
  sheetDate: string
  sheetRevision: string
}

export interface LayerInfo {
  id: string
  name: string
  visible: boolean
  locked: boolean
}

export interface AppState {
  mode: AppMode
  tool: ToolType
  viewport: ViewportState
  scene: Scene
  selection: SelectionState
  draw: DrawState
  design: DesignConfig
  layers: LayerInfo[]
  undoStack: Scene[]
  redoStack: Scene[]
  generating: boolean
}

export type { Scene, Component, StrokeNode, Brush, BrushType }
// @app-types-end
