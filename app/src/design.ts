// @app-design
import type { Scene, Component, StrokeNode, SceneNode } from '@engine/types'
import type { DesignConfig } from './types'

// @app-design-overlays
export function renderDesignOverlays(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  config: DesignConfig
) {
  renderSheetBorder(ctx, config)
  renderTitleBlock(ctx, config)
  renderScaleBar(ctx, config)
  renderDimensions(ctx, scene)
  renderAnnotations(ctx, scene)
  renderZoneLabels(ctx, scene, config)
}
// @app-design-overlays-end

// @app-design-sheet-border
function renderSheetBorder(ctx: CanvasRenderingContext2D, config: DesignConfig) {
  const margin = 20
  const { sheetWidth: w, sheetHeight: h } = config

  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 0.5
  ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2)

  ctx.lineWidth = 0.25
  ctx.strokeStyle = '#999999'
  const innerMargin = margin + 10
  ctx.strokeRect(innerMargin, innerMargin, w - innerMargin * 2, h - innerMargin * 2)
}
// @app-design-sheet-border-end

// @app-design-title-block
function renderTitleBlock(ctx: CanvasRenderingContext2D, config: DesignConfig) {
  const { sheetWidth: w, sheetHeight: h } = config
  const bw = 200
  const bh = 60
  const bx = w - 20 - bw
  const by = h - 20 - bh

  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 0.75
  ctx.strokeRect(bx, by, bw, bh)

  ctx.beginPath()
  ctx.moveTo(bx, by + 20)
  ctx.lineTo(bx + bw, by + 20)
  ctx.moveTo(bx, by + 40)
  ctx.lineTo(bx + bw, by + 40)
  ctx.moveTo(bx + bw / 2, by)
  ctx.lineTo(bx + bw / 2, by + 20)
  ctx.stroke()

  ctx.fillStyle = '#333333'
  ctx.font = '8px Inter, sans-serif'
  ctx.textBaseline = 'top'

  ctx.fillStyle = '#888888'
  ctx.font = '6px Inter, sans-serif'
  ctx.fillText('PROJECT', bx + 4, by + 3)
  ctx.fillText('SCALE', bx + bw / 2 + 4, by + 3)
  ctx.fillText('SHEET', bx + 4, by + 23)
  ctx.fillText('DATE', bx + 4, by + 43)
  ctx.fillText('REV', bx + bw / 2 + 4, by + 43)

  ctx.fillStyle = '#333333'
  ctx.font = '9px Inter, sans-serif'
  ctx.fillText(config.sheetTitle, bx + 4, by + 10)
  ctx.fillText(config.scale, bx + bw / 2 + 4, by + 10)
  ctx.fillText(config.sheetNumber, bx + 4, by + 30)
  ctx.fillText(config.sheetDate, bx + 4, by + 50)
  ctx.fillText(config.sheetRevision, bx + bw / 2 + 4, by + 50)
}
// @app-design-title-block-end

// @app-design-scale-bar
function renderScaleBar(ctx: CanvasRenderingContext2D, config: DesignConfig) {
  const barX = 30
  const barY = config.sheetHeight - 35
  const meterPx = config.gridSpacing
  const segments = 5

  ctx.strokeStyle = '#333333'
  ctx.fillStyle = '#333333'
  ctx.lineWidth = 0.75

  for (let i = 0; i < segments; i++) {
    const sx = barX + i * meterPx
    if (i % 2 === 0) {
      ctx.fillRect(sx, barY, meterPx, 4)
    } else {
      ctx.strokeRect(sx, barY, meterPx, 4)
    }
  }

  ctx.font = '7px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = 0; i <= segments; i++) {
    const val = (i * config.gridSpacing * config.scaleRatio) / 1000
    const label = val >= 1 ? val.toFixed(0) + 'm' : (val * 1000).toFixed(0) + 'mm'
    ctx.fillText(label, barX + i * meterPx, barY + 6)
  }
  ctx.textAlign = 'start'
}
// @app-design-scale-bar-end

// @app-design-dimensions
function renderDimensions(ctx: CanvasRenderingContext2D, scene: Scene) {
  walkForDimensions(scene.root, ctx)
}

function walkForDimensions(node: SceneNode, ctx: CanvasRenderingContext2D) {
  if (node.type === 'component' && node.designMeta?.area) {
    const bbox = computeBBox(node)
    if (bbox) {
      drawDimensionLine(ctx, bbox.x, bbox.y - 15, bbox.x + bbox.w, bbox.y - 15, bbox.w)
      drawDimensionLine(ctx, bbox.x + bbox.w + 15, bbox.y, bbox.x + bbox.w + 15, bbox.y + bbox.h, bbox.h)
    }
  }
  if (node.type === 'component') {
    for (const child of node.children) {
      walkForDimensions(child, ctx)
    }
  }
}

function drawDimensionLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  measurement: number
) {
  const ext = 5
  const isHorizontal = Math.abs(y2 - y1) < 1

  ctx.strokeStyle = '#d32f2f'
  ctx.lineWidth = 0.5
  ctx.fillStyle = '#d32f2f'
  ctx.font = '7px Inter, sans-serif'

  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  if (isHorizontal) {
    ctx.beginPath()
    ctx.moveTo(x1, y1 - ext)
    ctx.lineTo(x1, y1 + ext)
    ctx.moveTo(x2, y2 - ext)
    ctx.lineTo(x2, y2 + ext)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(x1 - ext, y1)
    ctx.lineTo(x1 + ext, y1)
    ctx.moveTo(x2 - ext, y2)
    ctx.lineTo(x2 + ext, y2)
    ctx.stroke()
  }

  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const label = formatMeasurement(measurement)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  ctx.fillStyle = '#ffffff'
  const tw = ctx.measureText(label).width + 4
  ctx.fillRect(mx - tw / 2, my - 10, tw, 12)

  ctx.fillStyle = '#d32f2f'
  ctx.fillText(label, mx, my)
  ctx.textAlign = 'start'
}

function formatMeasurement(px: number): string {
  return px.toFixed(0)
}
// @app-design-dimensions-end

// @app-design-annotations
function renderAnnotations(ctx: CanvasRenderingContext2D, scene: Scene) {
  walkForAnnotations(scene.root, ctx)
}

function walkForAnnotations(node: SceneNode, ctx: CanvasRenderingContext2D) {
  if (node.type === 'component' && node.name.startsWith('annotation-')) {
    const bbox = computeBBox(node)
    if (bbox) {
      ctx.fillStyle = '#1565c0'
      ctx.font = '8px Inter, sans-serif'
      ctx.fillText(node.name.replace('annotation-', ''), bbox.x, bbox.y - 5)
    }
  }
  if (node.type === 'component') {
    for (const child of node.children) {
      walkForAnnotations(child, ctx)
    }
  }
}
// @app-design-annotations-end

// @app-design-zone-labels
function renderZoneLabels(ctx: CanvasRenderingContext2D, scene: Scene, config: DesignConfig) {
  walkForZones(scene.root, ctx, config)
}

function walkForZones(node: SceneNode, ctx: CanvasRenderingContext2D, config: DesignConfig) {
  if (node.type === 'component' && node.designMeta?.roomType) {
    const bbox = computeBBox(node)
    if (bbox) {
      ctx.fillStyle = 'rgba(25, 118, 210, 0.06)'
      ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h)

      ctx.fillStyle = '#1565c0'
      ctx.font = 'bold 10px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.designMeta.roomType, bbox.x + bbox.w / 2, bbox.y + bbox.h / 2 - 6)

      if (node.designMeta.area) {
        ctx.font = '8px Inter, sans-serif'
        ctx.fillStyle = '#666666'
        ctx.fillText(node.designMeta.area, bbox.x + bbox.w / 2, bbox.y + bbox.h / 2 + 6)
      }

      ctx.textAlign = 'start'
    }
  }
  if (node.type === 'component') {
    for (const child of node.children) {
      walkForZones(child, ctx, config)
    }
  }
}
// @app-design-zone-labels-end

// @app-design-utils
function computeBBox(node: Component): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let found = false

  function walk(n: SceneNode) {
    if (n.type === 'stroke') {
      for (const pt of n.points) {
        if (pt[0] < minX) minX = pt[0]
        if (pt[1] < minY) minY = pt[1]
        if (pt[0] > maxX) maxX = pt[0]
        if (pt[1] > maxY) maxY = pt[1]
        found = true
      }
    } else if (n.type === 'fill') {
      for (const pt of n.points) {
        if (pt[0] < minX) minX = pt[0]
        if (pt[1] < minY) minY = pt[1]
        if (pt[0] > maxX) maxX = pt[0]
        if (pt[1] > maxY) maxY = pt[1]
        found = true
      }
    } else {
      for (const child of n.children) walk(child)
    }
  }

  walk(node)
  if (!found) return null
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}
// @app-design-utils-end
// @app-design-end
