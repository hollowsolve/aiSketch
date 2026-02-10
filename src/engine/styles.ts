// @styles
import type { StyleName, ResolvedStyle, StrokeNode, StrokePoint } from './types'

// @styles-presets
const STYLE_PRESETS: Record<StyleName, ResolvedStyle> = {
  'outline': {
    brush: { type: 'round', size: 3, opacity: 0.85, hardness: 0.8, flow: 1, spacing: 0.15, scatter: 0, jitter: { size: 0.02, opacity: 0.01, angle: 0 } },
    tension: 0.3,
  },
  'outline-bold': {
    brush: { type: 'round', size: 5, opacity: 0.9, hardness: 0.85, flow: 1, spacing: 0.15, scatter: 0, jitter: { size: 0.03, opacity: 0.01, angle: 0 } },
    tension: 0.25,
  },
  'outline-fine': {
    brush: { type: 'round', size: 1.5, opacity: 0.75, hardness: 0.9, flow: 1, spacing: 0.12, scatter: 0, jitter: { size: 0.01, opacity: 0.01, angle: 0 } },
    tension: 0.35,
  },
  'detail': {
    brush: { type: 'round', size: 2, opacity: 0.7, hardness: 0.8, flow: 1, spacing: 0.15, scatter: 0, jitter: { size: 0.02, opacity: 0.02, angle: 0 } },
    tension: 0.4,
  },
  'hatching': {
    brush: { type: 'round', size: 1.5, opacity: 0.35, hardness: 0.7, flow: 1, spacing: 0.12, scatter: 0, jitter: { size: 0.03, opacity: 0.05, angle: 0 } },
    tension: 0.15,
  },
  'crosshatch': {
    brush: { type: 'round', size: 1.2, opacity: 0.3, hardness: 0.75, flow: 1, spacing: 0.1, scatter: 0, jitter: { size: 0.02, opacity: 0.04, angle: 0.02 } },
    tension: 0.1,
  },
  'shading': {
    brush: { type: 'charcoal', size: 6, opacity: 0.15, hardness: 0.4, flow: 0.8, spacing: 0.2, scatter: 0.1, jitter: { size: 0.05, opacity: 0.04, angle: 0.1 } },
    tension: 0.5,
  },
  'sketch': {
    brush: { type: 'round', size: 2.5, opacity: 0.6, hardness: 0.7, flow: 1, spacing: 0.15, scatter: 0, jitter: { size: 0.04, opacity: 0.03, angle: 0.05 } },
    tension: 0.5,
  },
  'gesture': {
    brush: { type: 'charcoal', size: 4, opacity: 0.4, hardness: 0.5, flow: 0.9, spacing: 0.18, scatter: 0.05, jitter: { size: 0.06, opacity: 0.04, angle: 0.08 } },
    tension: 0.6,
  },
  'underdrawing': {
    brush: { type: 'round', size: 1.5, opacity: 0.15, hardness: 0.6, flow: 0.8, spacing: 0.15, scatter: 0, jitter: { size: 0.03, opacity: 0.03, angle: 0.03 } },
    tension: 0.5,
  },
  'soft': {
    brush: { type: 'watercolor', size: 8, opacity: 0.2, hardness: 0.35, flow: 0.8, spacing: 0.25, scatter: 0, jitter: { size: 0.03, opacity: 0.02, angle: 0 } },
    tension: 0.6,
  },
  'wash': {
    brush: { type: 'watercolor', size: 12, opacity: 0.12, hardness: 0.3, flow: 0.7, spacing: 0.3, scatter: 0, jitter: { size: 0.04, opacity: 0.03, angle: 0 } },
    tension: 0.6,
  },
  'scumble': {
    brush: { type: 'chalk', size: 10, opacity: 0.08, hardness: 0.3, flow: 0.6, spacing: 0.3, scatter: 0.2, jitter: { size: 0.08, opacity: 0.04, angle: 0.15 } },
    tension: 0.7,
  },
  'texture': {
    brush: { type: 'chalk', size: 4, opacity: 0.25, hardness: 0.5, flow: 1, spacing: 0.2, scatter: 0.15, jitter: { size: 0.06, opacity: 0.05, angle: 0.1 } },
    tension: 0.4,
  },
  'accent': {
    brush: { type: 'calligraphy', size: 4, opacity: 0.8, hardness: 0.7, flow: 1, spacing: 0.15, scatter: 0, jitter: { size: 0.02, opacity: 0.01, angle: 0 } },
    tension: 0.4,
  },
  'highlight': {
    brush: { type: 'watercolor', size: 6, opacity: 0.1, hardness: 0.25, flow: 0.6, spacing: 0.3, scatter: 0.05, jitter: { size: 0.04, opacity: 0.03, angle: 0 } },
    tension: 0.5,
  },
  'construction': {
    brush: { type: 'round', size: 2.5, opacity: 0.8, hardness: 0.95, flow: 1, spacing: 0.12, scatter: 0, jitter: { size: 0, opacity: 0, angle: 0 } },
    tension: 0.05,
  },
  'dimension': {
    brush: { type: 'round', size: 1, opacity: 0.6, hardness: 0.95, flow: 1, spacing: 0.1, scatter: 0, jitter: { size: 0, opacity: 0, angle: 0 } },
    tension: 0,
  },
  'label': {
    brush: { type: 'round', size: 1.5, opacity: 0.5, hardness: 0.9, flow: 1, spacing: 0.12, scatter: 0, jitter: { size: 0, opacity: 0, angle: 0 } },
    tension: 0.1,
  },
}
// @styles-presets-end

// @styles-resolve
export function resolveStyle(node: StrokeNode): ResolvedStyle {
  const preset = STYLE_PRESETS[node.style] || STYLE_PRESETS['outline']
  const weight = node.weight ?? 1

  return {
    brush: {
      ...preset.brush,
      color: node.color,
      size: preset.brush.size * weight,
    },
    tension: preset.tension,
  }
}

export function strokeToPoints(points: [number, number][], style: ResolvedStyle): StrokePoint[] {
  return points.map((p) => ({
    x: p[0],
    y: p[1],
    w: 1,
    o: 1,
    h: style.brush.hardness,
  }))
}

export function fillToPoints(points: [number, number][]): StrokePoint[] {
  return points.map((p) => ({
    x: p[0],
    y: p[1],
    w: 1,
    o: 1,
    h: 1,
  }))
}

export { STYLE_PRESETS }
// @styles-resolve-end
// @styles-end
