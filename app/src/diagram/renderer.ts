// @diagram-renderer
import type { DiagramNodeType, DiagramLinkType, DiagramGroupType, LayoutResult, LayoutNode, LayoutLink, LayoutGroup } from './types'

// @diagram-renderer-colors
const NODE_COLORS: Record<DiagramNodeType, { fill: string; stroke: string; text: string }> = {
  service:  { fill: '#e3f2fd', stroke: '#1976d2', text: '#0d47a1' },
  database: { fill: '#fce4ec', stroke: '#c62828', text: '#b71c1c' },
  queue:    { fill: '#fff3e0', stroke: '#e65100', text: '#bf360c' },
  cache:    { fill: '#e8f5e9', stroke: '#2e7d32', text: '#1b5e20' },
  gateway:  { fill: '#f3e5f5', stroke: '#7b1fa2', text: '#4a148c' },
  client:   { fill: '#e0f7fa', stroke: '#00838f', text: '#006064' },
  storage:  { fill: '#fff8e1', stroke: '#f9a825', text: '#f57f17' },
  function: { fill: '#ede7f6', stroke: '#512da8', text: '#311b92' },
  external: { fill: '#f5f5f5', stroke: '#616161', text: '#424242' },
  custom:   { fill: '#eceff1', stroke: '#546e7a', text: '#37474f' },
}

const LINK_COLORS: Record<DiagramLinkType, string> = {
  sync: '#1976d2',
  async: '#e65100',
  data: '#c62828',
  event: '#2e7d32',
  dependency: '#757575',
}

const GROUP_COLORS: Record<DiagramGroupType, { fill: string; stroke: string; text: string }> = {
  boundary: { fill: 'rgba(25, 118, 210, 0.04)', stroke: '#90caf9', text: '#1565c0' },
  vpc:      { fill: 'rgba(46, 125, 50, 0.04)',  stroke: '#a5d6a7', text: '#2e7d32' },
  team:     { fill: 'rgba(123, 31, 162, 0.04)', stroke: '#ce93d8', text: '#7b1fa2' },
  zone:     { fill: 'rgba(230, 81, 0, 0.04)',   stroke: '#ffcc80', text: '#e65100' },
  region:   { fill: 'rgba(0, 131, 143, 0.04)',  stroke: '#80deea', text: '#00838f' },
}

const NODE_ICONS: Record<DiagramNodeType, string> = {
  service:  '\u2699',
  database: '\u26C1',
  queue:    '\u21C6',
  cache:    '\u26A1',
  gateway:  '\u25C6',
  client:   '\u25A0',
  storage:  '\u2601',
  function: '\u03BB',
  external: '\u2197',
  custom:   '\u25CF',
}
// @diagram-renderer-colors-end

// @diagram-renderer-main
export function renderDiagram(ctx: CanvasRenderingContext2D, layout: LayoutResult, selectedId?: string | null) {
  for (const group of layout.groups) {
    renderGroup(ctx, group)
  }
  for (const link of layout.links) {
    renderLink(ctx, link, layout)
  }
  for (const node of layout.nodes) {
    renderNode(ctx, node)
  }
  if (selectedId) {
    const sel = layout.nodes.find(n => n.id === selectedId)
    if (sel) renderSelectionHighlight(ctx, sel)
  }
}
// @diagram-renderer-main-end

// @diagram-renderer-selection
function renderSelectionHighlight(ctx: CanvasRenderingContext2D, ln: LayoutNode) {
  const pad = 4
  const left = ln.x - ln.width / 2 - pad
  const top = ln.y - ln.height / 2 - pad
  const w = ln.width + pad * 2
  const h = ln.height + pad * 2

  ctx.save()
  ctx.strokeStyle = '#1a73e8'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 3])
  ctx.beginPath()
  ctx.roundRect(left, top, w, h, 10)
  ctx.stroke()
  ctx.setLineDash([])

  const handleSize = 6
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#1a73e8'
  ctx.lineWidth = 1.5
  const corners = [
    [left, top],
    [left + w, top],
    [left + w, top + h],
    [left, top + h],
  ]
  for (const [cx, cy] of corners) {
    ctx.beginPath()
    ctx.rect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
}
// @diagram-renderer-selection-end

// @diagram-renderer-node
function renderNode(ctx: CanvasRenderingContext2D, ln: LayoutNode) {
  const { x, y, width, height, node } = ln
  const colors = NODE_COLORS[node.type] || NODE_COLORS.custom
  const left = x - width / 2
  const top = y - height / 2

  ctx.save()

  if (node.type === 'database') {
    renderDatabaseShape(ctx, left, top, width, height, colors)
  } else if (node.type === 'queue') {
    renderQueueShape(ctx, left, top, width, height, colors)
  } else if (node.type === 'function') {
    renderFunctionShape(ctx, x, y, width, height, colors)
  } else if (node.type === 'gateway') {
    renderGatewayShape(ctx, x, y, width, height, colors)
  } else {
    renderRoundedRect(ctx, left, top, width, height, 8, colors)
  }

  const icon = NODE_ICONS[node.type] || ''
  ctx.fillStyle = colors.text
  ctx.font = '600 12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const labelText = icon ? `${icon}  ${node.label}` : node.label
  ctx.fillText(labelText, x, y - (node.description ? 6 : 0), width - 16)

  if (node.description) {
    ctx.fillStyle = colors.text + 'aa'
    ctx.font = '400 10px Inter, system-ui, sans-serif'
    ctx.fillText(node.description, x, y + 10, width - 16)
  }

  ctx.restore()
}

function renderRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  colors: { fill: string; stroke: string }
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = colors.fill
  ctx.fill()
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function renderDatabaseShape(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  colors: { fill: string; stroke: string }
) {
  const ry = 10

  ctx.beginPath()
  ctx.moveTo(x, y + ry)
  ctx.lineTo(x, y + h - ry)
  ctx.ellipse(x + w / 2, y + h - ry, w / 2, ry, 0, Math.PI, 0, true)
  ctx.lineTo(x + w, y + ry)
  ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI, true)
  ctx.closePath()
  ctx.fillStyle = colors.fill
  ctx.fill()
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = colors.fill
  ctx.fill()
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function renderQueueShape(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  colors: { fill: string; stroke: string }
) {
  const r = h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2)
  ctx.lineTo(x + r, y + h)
  ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2)
  ctx.closePath()
  ctx.fillStyle = colors.fill
  ctx.fill()
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function renderFunctionShape(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, w: number, h: number,
  colors: { fill: string; stroke: string }
) {
  const hw = w / 2, hh = h / 2
  ctx.beginPath()
  ctx.moveTo(cx - hw + 12, cy - hh)
  ctx.lineTo(cx + hw - 12, cy - hh)
  ctx.lineTo(cx + hw, cy)
  ctx.lineTo(cx + hw - 12, cy + hh)
  ctx.lineTo(cx - hw + 12, cy + hh)
  ctx.lineTo(cx - hw, cy)
  ctx.closePath()
  ctx.fillStyle = colors.fill
  ctx.fill()
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function renderGatewayShape(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, w: number, h: number,
  colors: { fill: string; stroke: string }
) {
  renderRoundedRect(ctx, cx - w / 2, cy - h / 2, w, h, 12, colors)
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(cx - w / 2 + 6, cy - h / 2)
  ctx.lineTo(cx - w / 2 + 6, cy + h / 2)
  ctx.moveTo(cx + w / 2 - 6, cy - h / 2)
  ctx.lineTo(cx + w / 2 - 6, cy + h / 2)
  ctx.stroke()
}
// @diagram-renderer-node-end

// @diagram-renderer-link
function renderLink(ctx: CanvasRenderingContext2D, ll: LayoutLink, layout: LayoutResult) {
  const { points, link } = ll
  if (points.length < 2) return

  const color = LINK_COLORS[link.type] || LINK_COLORS.dependency

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5

  if (link.type === 'async' || link.type === 'event') {
    ctx.setLineDash([6, 4])
  }

  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1])
  }
  ctx.stroke()
  ctx.setLineDash([])

  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0])
  renderArrowhead(ctx, last[0], last[1], angle, color)

  if (link.label) {
    const midIdx = Math.floor(points.length / 2)
    const mx = points[midIdx][0]
    const my = points[midIdx][1]

    ctx.fillStyle = '#ffffff'
    ctx.font = '400 10px Inter, system-ui, sans-serif'
    const tw = ctx.measureText(link.label).width + 8
    ctx.fillRect(mx - tw / 2, my - 8, tw, 16)

    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(link.label, mx, my)
  }

  ctx.restore()
}

function renderArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) {
  const size = 8
  ctx.save()
  ctx.fillStyle = color
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size / 2)
  ctx.lineTo(-size, size / 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
// @diagram-renderer-link-end

// @diagram-renderer-group
function renderGroup(ctx: CanvasRenderingContext2D, lg: LayoutGroup) {
  const { x, y, width, height, group } = lg
  const colors = GROUP_COLORS[group.type] || GROUP_COLORS.boundary

  ctx.save()

  ctx.fillStyle = colors.fill
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, 12)
  ctx.fill()

  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 1.5
  ctx.setLineDash([8, 4])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = colors.text
  ctx.font = '600 11px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(group.label.toUpperCase(), x + 12, y + 8)

  ctx.restore()
}
// @diagram-renderer-group-end
// @diagram-renderer-end
