// @app-viewport
import { store } from './state'
import { renderScene } from '@engine/renderer'
import { DEFAULT_RENDER_OPTIONS } from '@engine/types'
import { resolveStyle } from '@engine/styles'
import { renderDesignOverlays } from './design'

// @app-viewport-init
let canvas: HTMLCanvasElement
let ctx: CanvasRenderingContext2D
let dpr = 1
let canvasArea: HTMLElement
let rafId = 0
let isPanning = false
let panStart = { x: 0, y: 0 }
let panOrigin = { x: 0, y: 0 }
let spaceHeld = false

export function initViewport() {
  canvas = document.getElementById('main-canvas') as HTMLCanvasElement
  ctx = canvas.getContext('2d')!
  canvasArea = document.getElementById('canvas-area') as HTMLElement
  dpr = window.devicePixelRatio || 1

  resize()
  window.addEventListener('resize', resize)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointerleave', onPointerUp)

  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat) spaceHeld = true })
  document.addEventListener('keyup', (e) => { if (e.code === 'Space') spaceHeld = false })

  store.subscribe(requestRender)
  requestRender()

  updateZoomDisplay()
}

function resize() {
  const rect = canvasArea.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'
  requestRender()
}
// @app-viewport-init-end

// @app-viewport-render
function requestRender() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    render()
  })
}

function render() {
  const { viewport, scene, mode, design, selection } = store.get()

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  if (mode === 'design') {
    drawDesignBackground(viewport, design)
  } else {
    drawSketchBackground(viewport)
  }

  ctx.save()
  ctx.translate(viewport.panX, viewport.panY)
  ctx.scale(viewport.zoom, viewport.zoom)

  renderScene(ctx, scene, DEFAULT_RENDER_OPTIONS)

  if (mode === 'design') {
    renderDesignOverlays(ctx, scene, design)
  }

  if (selection.selectionBox) {
    const b = selection.selectionBox
    ctx.strokeStyle = '#4a90d9'
    ctx.lineWidth = 1 / viewport.zoom
    ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom])
    ctx.strokeRect(b.x, b.y, b.w, b.h)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(74, 144, 217, 0.1)'
    ctx.fillRect(b.x, b.y, b.w, b.h)
  }

  ctx.restore()
}

function drawSketchBackground(vp: { panX: number; panY: number; zoom: number }) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr)

  const gridSize = 50 * vp.zoom
  if (gridSize < 8) return

  ctx.strokeStyle = 'rgba(0,0,0,0.04)'
  ctx.lineWidth = 1

  const offsetX = vp.panX % gridSize
  const offsetY = vp.panY % gridSize
  const w = canvas.width / dpr
  const h = canvas.height / dpr

  ctx.beginPath()
  for (let x = offsetX; x < w; x += gridSize) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
  }
  for (let y = offsetY; y < h; y += gridSize) {
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
  }
  ctx.stroke()
}

function drawDesignBackground(
  vp: { panX: number; panY: number; zoom: number },
  design: { gridSpacing: number; gridVisible: boolean; sheetWidth: number; sheetHeight: number }
) {
  const w = canvas.width / dpr
  const h = canvas.height / dpr

  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(0, 0, w, h)

  const sw = design.sheetWidth * vp.zoom
  const sh = design.sheetHeight * vp.zoom
  const sx = vp.panX
  const sy = vp.panY

  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.fillRect(sx, sy, sw, sh)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
  ctx.strokeRect(sx, sy, sw, sh)

  if (design.gridVisible) {
    const gridPx = design.gridSpacing * vp.zoom
    if (gridPx >= 6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (let gx = gridPx; gx < sw; gx += gridPx) {
        ctx.moveTo(sx + gx, sy)
        ctx.lineTo(sx + gx, sy + sh)
      }
      for (let gy = gridPx; gy < sh; gy += gridPx) {
        ctx.moveTo(sx, sy + gy)
        ctx.lineTo(sx + sw, sy + gy)
      }
      ctx.stroke()
    }
  }
}
// @app-viewport-render-end

// @app-viewport-input
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const { viewport } = store.get()
  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const factor = e.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.1, Math.min(10, viewport.zoom * factor))
  const scale = newZoom / viewport.zoom

  store.setViewport({
    zoom: newZoom,
    panX: mx - (mx - viewport.panX) * scale,
    panY: my - (my - viewport.panY) * scale,
  })
  updateZoomDisplay()
}

function onPointerDown(e: PointerEvent) {
  const { tool } = store.get()

  if (e.button === 1 || (e.button === 0 && (tool === 'pan' || spaceHeld))) {
    isPanning = true
    panStart = { x: e.clientX, y: e.clientY }
    panOrigin = { x: store.get().viewport.panX, y: store.get().viewport.panY }
    canvas.setPointerCapture(e.pointerId)
    canvas.style.cursor = 'grabbing'
    return
  }

  if (tool === 'draw' || tool === 'eraser') {
    startDrawStroke(e)
  } else if (tool === 'select') {
    startSelection(e)
  } else if (tool === 'line') {
    startLineTool(e)
  } else if (tool === 'rect') {
    startRectTool(e)
  }
}

function onPointerMove(e: PointerEvent) {
  if (isPanning) {
    const dx = e.clientX - panStart.x
    const dy = e.clientY - panStart.y
    store.setViewport({ panX: panOrigin.x + dx, panY: panOrigin.y + dy })
    return
  }

  if (activeStroke) {
    continueDrawStroke(e)
  } else if (selectionDrag) {
    continueSelection(e)
  } else if (lineDrag) {
    continueLineTool(e)
  } else if (rectDrag) {
    continueRectTool(e)
  }
}

function onPointerUp(e: PointerEvent) {
  if (isPanning) {
    isPanning = false
    canvas.style.cursor = ''
    return
  }

  if (activeStroke) {
    finishDrawStroke()
  } else if (selectionDrag) {
    finishSelection()
  } else if (lineDrag) {
    finishLineTool()
  } else if (rectDrag) {
    finishRectTool()
  }
}
// @app-viewport-input-end

// @app-viewport-draw-stroke
import type { StrokeNode, Component, StyleName } from '@engine/types'

interface ActiveStroke {
  points: [number, number][]
  pointerId: number
}

let activeStroke: ActiveStroke | null = null

function screenToScene(sx: number, sy: number): { x: number; y: number } {
  const { viewport } = store.get()
  const rect = canvas.getBoundingClientRect()
  return {
    x: (sx - rect.left - viewport.panX) / viewport.zoom,
    y: (sy - rect.top - viewport.panY) / viewport.zoom,
  }
}

function startDrawStroke(e: PointerEvent) {
  canvas.setPointerCapture(e.pointerId)
  const pt = screenToScene(e.clientX, e.clientY)
  activeStroke = {
    points: [[pt.x, pt.y]],
    pointerId: e.pointerId,
  }
}

function continueDrawStroke(e: PointerEvent) {
  if (!activeStroke) return
  const pt = screenToScene(e.clientX, e.clientY)
  const last = activeStroke.points[activeStroke.points.length - 1]
  const dx = pt.x - last[0]
  const dy = pt.y - last[1]
  if (dx * dx + dy * dy < 4) return
  activeStroke.points.push([pt.x, pt.y])
  renderPreviewStroke()
}

function renderPreviewStroke() {
  if (!activeStroke || activeStroke.points.length < 2) return
  requestRender()
}

function finishDrawStroke() {
  if (!activeStroke || activeStroke.points.length < 2) {
    activeStroke = null
    return
  }

  const { scene, draw, tool } = store.get()
  store.pushUndo()

  const id = 'stroke-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
  const strokeNode: StrokeNode = {
    name: id,
    type: 'stroke',
    layer: findCurrentLayer(),
    style: tool === 'eraser' ? 'outline-bold' : draw.style,
    color: draw.color,
    points: activeStroke.points,
    weight: draw.weight,
  }

  const newScene = structuredClone(scene)
  newScene.root.children.push(strokeNode)
  store.set({ scene: newScene })

  activeStroke = null
}

function findCurrentLayer(): number {
  const { layers } = store.get()
  const first = layers.find(l => !l.locked && l.visible)
  return first ? layers.indexOf(first) : 0
}
// @app-viewport-draw-stroke-end

// @app-viewport-selection
interface SelectionDrag {
  startX: number
  startY: number
}

let selectionDrag: SelectionDrag | null = null

function startSelection(e: PointerEvent) {
  canvas.setPointerCapture(e.pointerId)
  const pt = screenToScene(e.clientX, e.clientY)
  selectionDrag = { startX: pt.x, startY: pt.y }

  const hit = hitTest(pt.x, pt.y)
  if (hit) {
    const ids = new Set<string>()
    ids.add(hit.name)
    store.set({ selection: { selectedIds: ids, selectionBox: null } })
    selectionDrag = null
  } else {
    store.set({ selection: { selectedIds: new Set(), selectionBox: null } })
  }
}

function continueSelection(e: PointerEvent) {
  if (!selectionDrag) return
  const pt = screenToScene(e.clientX, e.clientY)
  const x = Math.min(selectionDrag.startX, pt.x)
  const y = Math.min(selectionDrag.startY, pt.y)
  const w = Math.abs(pt.x - selectionDrag.startX)
  const h = Math.abs(pt.y - selectionDrag.startY)
  store.set({ selection: { selectedIds: new Set(), selectionBox: { x, y, w, h } } })
}

function finishSelection() {
  if (!selectionDrag) return
  const { selection, scene } = store.get()
  if (selection.selectionBox) {
    const box = selection.selectionBox
    const ids = new Set<string>()
    collectHitsInBox(scene.root, box, ids)
    store.set({ selection: { selectedIds: ids, selectionBox: null } })
  }
  selectionDrag = null
}

function hitTest(x: number, y: number): StrokeNode | null {
  const { scene } = store.get()
  return hitTestNode(scene.root, x, y)
}

function hitTestNode(node: Component | StrokeNode, x: number, y: number): StrokeNode | null {
  if (node.type === 'stroke') {
    const resolved = resolveStyle(node)
    const hitRadius = resolved.brush.size * 3
    for (const pt of node.points) {
      const dx = pt[0] - x
      const dy = pt[1] - y
      if (dx * dx + dy * dy < hitRadius * hitRadius) return node
    }
    return null
  }
  if (node.type === 'fill') return null
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i]
    if (child.type === 'component' || child.type === 'stroke') {
      const hit = hitTestNode(child, x, y)
      if (hit) return hit
    }
  }
  return null
}

function collectHitsInBox(
  node: Component | StrokeNode,
  box: { x: number; y: number; w: number; h: number },
  out: Set<string>
) {
  if (node.type === 'stroke') {
    for (const pt of node.points) {
      if (pt[0] >= box.x && pt[0] <= box.x + box.w && pt[1] >= box.y && pt[1] <= box.y + box.h) {
        out.add(node.name)
        break
      }
    }
    return
  }
  if (node.type === 'fill') return
  for (const child of node.children) {
    if (child.type === 'component' || child.type === 'stroke') {
      collectHitsInBox(child, box, out)
    }
  }
}
// @app-viewport-selection-end

// @app-viewport-line-tool
interface LineDrag {
  startX: number
  startY: number
  endX: number
  endY: number
}

let lineDrag: LineDrag | null = null

function startLineTool(e: PointerEvent) {
  canvas.setPointerCapture(e.pointerId)
  const pt = screenToScene(e.clientX, e.clientY)
  const snapped = snapToGrid(pt.x, pt.y)
  lineDrag = { startX: snapped.x, startY: snapped.y, endX: snapped.x, endY: snapped.y }
}

function continueLineTool(e: PointerEvent) {
  if (!lineDrag) return
  const pt = screenToScene(e.clientX, e.clientY)
  const snapped = snapToGrid(pt.x, pt.y)
  lineDrag.endX = snapped.x
  lineDrag.endY = snapped.y
  requestRender()
}

function finishLineTool() {
  if (!lineDrag) return
  const dx = lineDrag.endX - lineDrag.startX
  const dy = lineDrag.endY - lineDrag.startY
  if (dx * dx + dy * dy < 4) {
    lineDrag = null
    return
  }

  const { scene, draw } = store.get()
  store.pushUndo()

  const id = 'line-' + Date.now()
  const strokeNode: StrokeNode = {
    name: id,
    type: 'stroke',
    layer: findCurrentLayer(),
    style: 'construction' as StyleName,
    color: draw.color,
    points: [
      [lineDrag.startX, lineDrag.startY],
      [lineDrag.endX, lineDrag.endY],
    ],
  }

  const newScene = structuredClone(scene)
  newScene.root.children.push(strokeNode)
  store.set({ scene: newScene })
  lineDrag = null
}
// @app-viewport-line-tool-end

// @app-viewport-rect-tool
interface RectDrag {
  startX: number
  startY: number
  endX: number
  endY: number
}

let rectDrag: RectDrag | null = null

function startRectTool(e: PointerEvent) {
  canvas.setPointerCapture(e.pointerId)
  const pt = screenToScene(e.clientX, e.clientY)
  const snapped = snapToGrid(pt.x, pt.y)
  rectDrag = { startX: snapped.x, startY: snapped.y, endX: snapped.x, endY: snapped.y }
}

function continueRectTool(e: PointerEvent) {
  if (!rectDrag) return
  const pt = screenToScene(e.clientX, e.clientY)
  const snapped = snapToGrid(pt.x, pt.y)
  rectDrag.endX = snapped.x
  rectDrag.endY = snapped.y
  requestRender()
}

function finishRectTool() {
  if (!rectDrag) return
  const dx = Math.abs(rectDrag.endX - rectDrag.startX)
  const dy = Math.abs(rectDrag.endY - rectDrag.startY)
  if (dx < 4 && dy < 4) {
    rectDrag = null
    return
  }

  const { scene, draw } = store.get()
  store.pushUndo()

  const x1 = Math.min(rectDrag.startX, rectDrag.endX)
  const y1 = Math.min(rectDrag.startY, rectDrag.endY)
  const x2 = Math.max(rectDrag.startX, rectDrag.endX)
  const y2 = Math.max(rectDrag.startY, rectDrag.endY)

  const id = 'rect-' + Date.now()
  const layer = findCurrentLayer()
  const style: StyleName = 'construction'

  const rectComp: Component = {
    name: id,
    type: 'component',
    transform: { origin: [0, 0], position: [0, 0], scale: [1, 1], rotation: 0 },
    children: [
      { name: id + '-top', type: 'stroke', layer, style, color: draw.color, points: [[x1, y1], [x2, y1]] },
      { name: id + '-right', type: 'stroke', layer, style, color: draw.color, points: [[x2, y1], [x2, y2]] },
      { name: id + '-bottom', type: 'stroke', layer, style, color: draw.color, points: [[x2, y2], [x1, y2]] },
      { name: id + '-left', type: 'stroke', layer, style, color: draw.color, points: [[x1, y2], [x1, y1]] },
    ],
  }

  const newScene = structuredClone(scene)
  newScene.root.children.push(rectComp)
  store.set({ scene: newScene })
  rectDrag = null
}
// @app-viewport-rect-tool-end

// @app-viewport-snap
function snapToGrid(x: number, y: number): { x: number; y: number } {
  const { design, mode } = store.get()
  if (mode !== 'design' || !design.snapToGrid) return { x, y }
  const gs = design.gridSpacing
  return {
    x: Math.round(x / gs) * gs,
    y: Math.round(y / gs) * gs,
  }
}
// @app-viewport-snap-end

// @app-viewport-zoom-controls
export function zoomIn() {
  const { viewport } = store.get()
  const w = canvas.width / dpr / 2
  const h = canvas.height / dpr / 2
  const newZoom = Math.min(10, viewport.zoom * 1.2)
  const scale = newZoom / viewport.zoom
  store.setViewport({
    zoom: newZoom,
    panX: w - (w - viewport.panX) * scale,
    panY: h - (h - viewport.panY) * scale,
  })
  updateZoomDisplay()
}

export function zoomOut() {
  const { viewport } = store.get()
  const w = canvas.width / dpr / 2
  const h = canvas.height / dpr / 2
  const newZoom = Math.max(0.1, viewport.zoom / 1.2)
  const scale = newZoom / viewport.zoom
  store.setViewport({
    zoom: newZoom,
    panX: w - (w - viewport.panX) * scale,
    panY: h - (h - viewport.panY) * scale,
  })
  updateZoomDisplay()
}

export function zoomFit() {
  const { scene } = store.get()
  const cw = canvas.width / dpr
  const ch = canvas.height / dpr
  const sw = scene.canvas.width
  const sh = scene.canvas.height
  const zoom = Math.min(cw / sw, ch / sh) * 0.9
  store.setViewport({
    zoom,
    panX: (cw - sw * zoom) / 2,
    panY: (ch - sh * zoom) / 2,
  })
  updateZoomDisplay()
}

function updateZoomDisplay() {
  const el = document.getElementById('zoom-level')
  if (el) el.textContent = Math.round(store.get().viewport.zoom * 100) + '%'
}
// @app-viewport-zoom-controls-end

export function getCanvas(): HTMLCanvasElement { return canvas }
export function getCtx(): CanvasRenderingContext2D { return ctx }
// @app-viewport-end
