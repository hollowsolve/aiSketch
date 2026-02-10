// @diagram-editing
import { store } from '../state'
import { computeLayout } from './layout'
import type { DiagramGraph, DeltaOp, PositionOverrides } from './types'

// @diagram-editing-delta-apply
export function applyDelta(graph: DiagramGraph, op: DeltaOp): DiagramGraph {
  const g = structuredClone(graph)

  switch (op.op) {
    case 'addNode':
      if (!g.nodes.some(n => n.id === op.node.id)) {
        g.nodes.push(structuredClone(op.node))
      }
      break
    case 'removeNode':
      g.nodes = g.nodes.filter(n => n.id !== op.id)
      g.links = g.links.filter(l => l.from !== op.id && l.to !== op.id)
      break
    case 'updateNode': {
      const node = g.nodes.find(n => n.id === op.id)
      if (node) Object.assign(node, op.changes)
      break
    }
    case 'addLink':
      if (!g.links.some(l => l.id === op.link.id)) {
        g.links.push(structuredClone(op.link))
      }
      break
    case 'removeLink':
      g.links = g.links.filter(l => l.id !== op.id)
      break
    case 'updateLink': {
      const link = g.links.find(l => l.id === op.id)
      if (link) Object.assign(link, op.changes)
      break
    }
    case 'addGroup':
      if (!g.groups.some(gr => gr.id === op.group.id)) {
        g.groups.push(structuredClone(op.group))
      }
      break
    case 'removeGroup':
      g.groups = g.groups.filter(gr => gr.id !== op.id)
      for (const n of g.nodes) {
        if (n.group === op.id) n.group = undefined
      }
      break
    case 'updateGroup': {
      const group = g.groups.find(gr => gr.id === op.id)
      if (group) Object.assign(group, op.changes)
      break
    }
  }

  return g
}

export function applyDeltas(graph: DiagramGraph, ops: DeltaOp[]): DiagramGraph {
  let g = graph
  for (const op of ops) {
    g = applyDelta(g, op)
  }
  return g
}
// @diagram-editing-delta-apply-end

// @diagram-editing-undo-redo
interface DiagramSnapshot {
  graph: DiagramGraph
  overrides: PositionOverrides
}

let undoStack: DiagramSnapshot[] = []
let redoStack: DiagramSnapshot[] = []

export function pushDiagramUndo() {
  const { diagram } = store.get()
  if (!diagram.graph) return
  undoStack = [...undoStack.slice(-29), {
    graph: structuredClone(diagram.graph),
    overrides: new Map(positionOverrides),
  }]
  redoStack = []
}

export function diagramUndo() {
  const { diagram } = store.get()
  if (undoStack.length === 0 || !diagram.graph) return
  const snap = undoStack[undoStack.length - 1]
  redoStack = [...redoStack, {
    graph: structuredClone(diagram.graph),
    overrides: new Map(positionOverrides),
  }]
  undoStack = undoStack.slice(0, -1)
  positionOverrides = new Map(snap.overrides)
  relayout(snap.graph)
}

export function diagramRedo() {
  const { diagram } = store.get()
  if (redoStack.length === 0 || !diagram.graph) return
  const snap = redoStack[redoStack.length - 1]
  undoStack = [...undoStack, {
    graph: structuredClone(diagram.graph),
    overrides: new Map(positionOverrides),
  }]
  redoStack = redoStack.slice(0, -1)
  positionOverrides = new Map(snap.overrides)
  relayout(snap.graph)
}

export function clearDiagramHistory() {
  undoStack = []
  redoStack = []
  positionOverrides = new Map()
}
// @diagram-editing-undo-redo-end

// @diagram-editing-position-overrides
let positionOverrides: PositionOverrides = new Map()

export function getPositionOverrides(): PositionOverrides {
  return positionOverrides
}

export function setNodePosition(nodeId: string, x: number, y: number) {
  positionOverrides.set(nodeId, { x, y })
}

export function clearPositionOverrides() {
  positionOverrides = new Map()
}
// @diagram-editing-position-overrides-end

// @diagram-editing-relayout
export function relayout(graph?: DiagramGraph) {
  const g = graph ?? store.get().diagram.graph
  if (!g) return
  const layout = computeLayout(g)

  for (const ln of layout.nodes) {
    const override = positionOverrides.get(ln.id)
    if (override) {
      ln.x = override.x
      ln.y = override.y
    }
  }

  store.setDiagram({ graph: graph ? g : undefined, layout })
}

export function applyAndRelayout(ops: DeltaOp[]) {
  const { diagram } = store.get()
  if (!diagram.graph) return
  pushDiagramUndo()
  const newGraph = applyDeltas(diagram.graph, ops)
  relayout(newGraph)
}
// @diagram-editing-relayout-end

// @diagram-editing-selection
let selectedNodeId: string | null = null

export function getSelectedNodeId(): string | null {
  return selectedNodeId
}

export function selectNode(id: string | null) {
  selectedNodeId = id
  store.set({})
}

export function hitTestDiagramNode(sceneX: number, sceneY: number): string | null {
  const { diagram } = store.get()
  if (!diagram.layout) return null

  for (let i = diagram.layout.nodes.length - 1; i >= 0; i--) {
    const ln = diagram.layout.nodes[i]
    const left = ln.x - ln.width / 2
    const top = ln.y - ln.height / 2
    if (sceneX >= left && sceneX <= left + ln.width && sceneY >= top && sceneY <= top + ln.height) {
      return ln.id
    }
  }
  return null
}
// @diagram-editing-selection-end
// @diagram-editing-end
