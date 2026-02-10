// @app-state
import type { AppState, AppMode, ToolType, ViewportState, DesignConfig, LayerInfo, Scene } from './types'

// @app-state-defaults
const DEFAULT_DESIGN_CONFIG: DesignConfig = {
  scale: '1:100',
  scaleRatio: 100,
  gridSpacing: 10,
  gridVisible: true,
  snapToGrid: true,
  sheetWidth: 1189,
  sheetHeight: 841,
  sheetTitle: 'Untitled',
  sheetNumber: 'A1',
  sheetDate: new Date().toISOString().split('T')[0],
  sheetRevision: '-',
}

function createEmptyScene(mode: AppMode): Scene {
  return {
    name: 'Untitled',
    version: '1.0',
    mode: mode === 'design' ? 'design' : mode === 'sketch' ? 'sketch' : 'draw',
    canvas: { width: 1920, height: 1080 },
    root: {
      name: 'root',
      type: 'component',
      transform: { origin: [0, 0], position: [0, 0], scale: [1, 1], rotation: 0 },
      children: [],
    },
  }
}

const DEFAULT_LAYERS: LayerInfo[] = [
  { id: 'layer-0', name: 'Layer 1', visible: true, locked: false },
]
// @app-state-defaults-end

// @app-state-store
type Listener = () => void

class Store {
  private state: AppState
  private listeners: Set<Listener> = new Set()

  constructor() {
    this.state = {
      mode: 'sketch',
      tool: 'draw',
      viewport: { panX: 0, panY: 0, zoom: 1 },
      scene: createEmptyScene('sketch'),
      selection: { selectedIds: new Set(), selectionBox: null },
      draw: { style: 'outline', color: '#1a1a1a', weight: 1 },
      design: { ...DEFAULT_DESIGN_CONFIG },
      layers: [...DEFAULT_LAYERS],
      undoStack: [],
      redoStack: [],
      generating: false,
    }
  }

  get(): AppState {
    return this.state
  }

  set(partial: Partial<AppState>) {
    this.state = { ...this.state, ...partial }
    this.notify()
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    for (const fn of this.listeners) fn()
  }

  setMode(mode: AppMode) {
    const tool: ToolType = mode === 'sketch' ? 'draw' : 'select'
    this.set({ mode, tool, scene: createEmptyScene(mode) })
  }

  setTool(tool: ToolType) {
    this.set({ tool })
  }

  setViewport(vp: Partial<ViewportState>) {
    this.set({ viewport: { ...this.state.viewport, ...vp } })
  }

  pushUndo() {
    const snapshot = structuredClone(this.state.scene)
    this.set({
      undoStack: [...this.state.undoStack.slice(-49), snapshot],
      redoStack: [],
    })
  }

  undo() {
    const { undoStack, redoStack, scene } = this.state
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    this.set({
      scene: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, structuredClone(scene)],
    })
  }

  redo() {
    const { undoStack, redoStack, scene } = this.state
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    this.set({
      scene: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, structuredClone(scene)],
    })
  }
}

export const store = new Store()
export { createEmptyScene }
// @app-state-store-end
// @app-state-end
