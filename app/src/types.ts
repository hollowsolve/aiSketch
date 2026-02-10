// @app-types
import type { Scene, Component, StrokeNode, StyleName } from '@engine/types'
import type { DiagramGraph, LayoutResult } from './diagram/types'

export type AppMode = 'sketch' | 'design' | 'diagram'

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
  style: StyleName
  color: string
  weight: number
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

export interface DiagramState {
  graph: DiagramGraph | null
  layout: LayoutResult | null
}

export interface AppState {
  mode: AppMode
  tool: ToolType
  viewport: ViewportState
  scene: Scene
  selection: SelectionState
  draw: DrawState
  design: DesignConfig
  diagram: DiagramState
  layers: LayerInfo[]
  undoStack: Scene[]
  redoStack: Scene[]
  generating: boolean
}

export type { Scene, Component, StrokeNode, StyleName, DiagramGraph, LayoutResult }
// @app-types-end
