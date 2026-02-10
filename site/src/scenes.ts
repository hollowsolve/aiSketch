// @site-scenes
import type { Scene, Brush } from '@engine/types'

// @site-scene-utils
function b(overrides: Partial<Brush> = {}): Brush {
  return {
    type: 'round',
    color: '#1a1a1a',
    size: 3,
    opacity: 0.9,
    hardness: 0.8,
    flow: 1.0,
    spacing: 0.25,
    scatter: 0,
    jitter: { size: 0, opacity: 0, angle: 0 },
    ...overrides,
  }
}

function t() {
  return { origin: [0, 0] as [number, number], position: [0, 0] as [number, number], scale: [1, 1] as [number, number], rotation: 0 }
}
// @site-scene-utils-end

// @site-hero-scene
export const HERO_SCENE: Scene = {
  name: 'cozy cabin',
  version: '1.0',
  mode: 'draw',
  background: '#e8dfd0',
  canvas: { width: 900, height: 500 },
  root: {
    name: 'scene',
    type: 'component',
    transform: t(),
    children: [
      {
        name: 'sky-fill',
        type: 'fill',
        layer: 0,
        tension: 0.3,
        color: '#b5cde0',
        opacity: 0.7,
        points: [
          { x: 0, y: 0 }, { x: 900, y: 0 }, { x: 900, y: 320 }, { x: 0, y: 330 },
        ],
      },
      {
        name: 'ground-fill',
        type: 'fill',
        layer: 0,
        tension: 0.4,
        color: '#7a9a5e',
        opacity: 0.45,
        points: [
          { x: 0, y: 330 }, { x: 300, y: 360 }, { x: 600, y: 355 }, { x: 900, y: 340 }, { x: 900, y: 500 }, { x: 0, y: 500 },
        ],
      },
      {
        name: 'mountain-fill-left',
        type: 'fill',
        layer: 0,
        tension: 0.4,
        color: '#8a9eb5',
        opacity: 0.35,
        points: [
          { x: -20, y: 330 }, { x: 100, y: 200 }, { x: 200, y: 180 }, { x: 320, y: 320 },
        ],
      },
      {
        name: 'mountain-fill-center',
        type: 'fill',
        layer: 0,
        tension: 0.35,
        color: '#7b8fa6',
        opacity: 0.4,
        points: [
          { x: 240, y: 330 }, { x: 400, y: 180 }, { x: 450, y: 155 }, { x: 600, y: 310 },
        ],
      },
      {
        name: 'mountain-fill-right',
        type: 'fill',
        layer: 0,
        tension: 0.4,
        color: '#95a8bb',
        opacity: 0.3,
        points: [
          { x: 540, y: 325 }, { x: 700, y: 200 }, { x: 790, y: 190 }, { x: 930, y: 320 },
        ],
      },
      {
        name: 'treeline-fill-left',
        type: 'fill',
        layer: 1,
        tension: 0.5,
        color: '#3d6b42',
        opacity: 0.4,
        points: [
          { x: 0, y: 340 }, { x: 60, y: 290 }, { x: 140, y: 270 }, { x: 240, y: 320 }, { x: 240, y: 350 }, { x: 0, y: 350 },
        ],
      },
      {
        name: 'treeline-fill-right',
        type: 'fill',
        layer: 1,
        tension: 0.5,
        color: '#3d6b42',
        opacity: 0.4,
        points: [
          { x: 600, y: 340 }, { x: 680, y: 280 }, { x: 780, y: 275 }, { x: 900, y: 320 }, { x: 900, y: 350 }, { x: 600, y: 350 },
        ],
      },
      {
        name: 'cabin-body-fill',
        type: 'fill',
        layer: 1,
        tension: 0.1,
        color: '#8b6140',
        opacity: 0.75,
        points: [
          { x: 350, y: 375 }, { x: 350, y: 310 }, { x: 530, y: 310 }, { x: 530, y: 375 },
        ],
      },
      {
        name: 'cabin-roof-fill',
        type: 'fill',
        layer: 1,
        tension: 0.1,
        color: '#6b3520',
        opacity: 0.7,
        points: [
          { x: 335, y: 315 }, { x: 440, y: 250 }, { x: 545, y: 315 },
        ],
      },
      {
        name: 'tree-left-foliage-fill',
        type: 'fill',
        layer: 1,
        tension: 0.5,
        color: '#2e6b3e',
        opacity: 0.55,
        points: [
          { x: 250, y: 300 }, { x: 260, y: 260 }, { x: 280, y: 240 }, { x: 300, y: 250 }, { x: 310, y: 290 },
        ],
      },
      {
        name: 'tree-right-foliage-fill',
        type: 'fill',
        layer: 1,
        tension: 0.5,
        color: '#2e6b3e',
        opacity: 0.55,
        points: [
          { x: 585, y: 290 }, { x: 600, y: 250 }, { x: 625, y: 230 }, { x: 650, y: 245 }, { x: 660, y: 280 },
        ],
      },
      {
        name: 'mountains',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'mountain-left',
            type: 'stroke',
            layer: 0,
            tension: 0.4,
            brush: b({ type: 'watercolor', color: '#6b7fa3', size: 6, opacity: 0.12, hardness: 0.3 }),
            points: [
              { x: -20, y: 320, w: 1, o: 0.3, h: 0.5 },
              { x: 100, y: 200, w: 1.1, o: 0.35, h: 0.5 },
              { x: 200, y: 180, w: 1.2, o: 0.35, h: 0.5 },
              { x: 300, y: 310, w: 1, o: 0.3, h: 0.5 },
            ],
          },
          {
            name: 'mountain-center',
            type: 'stroke',
            layer: 0,
            tension: 0.3,
            brush: b({ type: 'watercolor', color: '#5a6d8a', size: 8, opacity: 0.15, hardness: 0.3 }),
            points: [
              { x: 250, y: 320, w: 1, o: 0.3, h: 0.5 },
              { x: 400, y: 180, w: 1.2, o: 0.4, h: 0.5 },
              { x: 440, y: 155, w: 1.3, o: 0.45, h: 0.5 },
              { x: 580, y: 300, w: 1, o: 0.3, h: 0.5 },
            ],
          },
          {
            name: 'mountain-right',
            type: 'stroke',
            layer: 0,
            tension: 0.4,
            brush: b({ type: 'watercolor', color: '#7b8faa', size: 5, opacity: 0.1, hardness: 0.3 }),
            points: [
              { x: 550, y: 315, w: 1, o: 0.3, h: 0.5 },
              { x: 700, y: 200, w: 1.1, o: 0.35, h: 0.5 },
              { x: 780, y: 190, w: 1.2, o: 0.35, h: 0.5 },
              { x: 920, y: 310, w: 1, o: 0.3, h: 0.5 },
            ],
          },
        ],
      },
      {
        name: 'treelines',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'treeline-left',
            type: 'stroke',
            layer: 1,
            tension: 0.6,
            brush: b({ type: 'watercolor', color: '#2d5a3d', size: 8, opacity: 0.2, hardness: 0.35 }),
            points: [
              { x: 20, y: 320, w: 1, o: 0.35, h: 0.4 },
              { x: 80, y: 275, w: 1.2, o: 0.4, h: 0.4 },
              { x: 140, y: 260, w: 1.3, o: 0.4, h: 0.4 },
              { x: 220, y: 310, w: 1, o: 0.35, h: 0.4 },
            ],
          },
          {
            name: 'treeline-right',
            type: 'stroke',
            layer: 1,
            tension: 0.6,
            brush: b({ type: 'watercolor', color: '#2d5a3d', size: 8, opacity: 0.2, hardness: 0.35 }),
            points: [
              { x: 620, y: 310, w: 1, o: 0.35, h: 0.4 },
              { x: 700, y: 265, w: 1.2, o: 0.4, h: 0.4 },
              { x: 780, y: 270, w: 1.1, o: 0.38, h: 0.4 },
              { x: 880, y: 310, w: 1, o: 0.35, h: 0.4 },
            ],
          },
        ],
      },
      {
        name: 'ground',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'ground-line',
            type: 'stroke',
            layer: 2,
            tension: 0.5,
            brush: b({ color: '#4a6741', size: 2.5, opacity: 0.35 }),
            points: [
              { x: 0, y: 380, w: 1, o: 0.4, h: 0.7 },
              { x: 300, y: 372, w: 1, o: 0.45, h: 0.7 },
              { x: 600, y: 374, w: 1, o: 0.45, h: 0.7 },
              { x: 900, y: 382, w: 1, o: 0.4, h: 0.7 },
            ],
          },
          {
            name: 'path',
            type: 'stroke',
            layer: 2,
            tension: 0.6,
            brush: b({ color: '#8b7355', size: 2, opacity: 0.2 }),
            points: [
              { x: 450, y: 500, w: 1.5, o: 0.25, h: 0.6 },
              { x: 435, y: 420, w: 1.1, o: 0.22, h: 0.6 },
              { x: 425, y: 375, w: 0.6, o: 0.15, h: 0.6 },
            ],
          },
        ],
      },
      {
        name: 'cabin',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'cabin-body',
            type: 'stroke',
            layer: 3,
            tension: 0.15,
            brush: b({ color: '#5c3a1e', size: 3.5, opacity: 0.8 }),
            points: [
              { x: 350, y: 370, w: 1, o: 0.9, h: 0.9 },
              { x: 350, y: 310, w: 1, o: 0.9, h: 0.9 },
              { x: 530, y: 310, w: 1, o: 0.9, h: 0.9 },
              { x: 530, y: 370, w: 1, o: 0.9, h: 0.9 },
              { x: 350, y: 370, w: 1, o: 0.9, h: 0.9 },
            ],
          },
          {
            name: 'cabin-roof',
            type: 'stroke',
            layer: 3,
            tension: 0.12,
            brush: b({ color: '#6b3520', size: 4, opacity: 0.85 }),
            points: [
              { x: 335, y: 315, w: 1, o: 0.9, h: 0.9 },
              { x: 440, y: 250, w: 1.2, o: 0.9, h: 0.9 },
              { x: 545, y: 315, w: 1, o: 0.9, h: 0.9 },
            ],
          },
          {
            name: 'cabin-door',
            type: 'stroke',
            layer: 4,
            tension: 0.15,
            brush: b({ color: '#3a2518', size: 2.5, opacity: 0.7 }),
            points: [
              { x: 420, y: 370, w: 1, o: 0.8, h: 0.9 },
              { x: 420, y: 335, w: 1, o: 0.8, h: 0.9 },
              { x: 460, y: 335, w: 1, o: 0.8, h: 0.9 },
              { x: 460, y: 370, w: 1, o: 0.8, h: 0.9 },
            ],
          },
          {
            name: 'cabin-window-left',
            type: 'stroke',
            layer: 4,
            tension: 0.15,
            brush: b({ color: '#c9a84c', size: 2, opacity: 0.6 }),
            points: [
              { x: 370, y: 325, w: 1, o: 0.7, h: 0.9 },
              { x: 370, y: 340, w: 1, o: 0.7, h: 0.9 },
              { x: 400, y: 340, w: 1, o: 0.7, h: 0.9 },
              { x: 400, y: 325, w: 1, o: 0.7, h: 0.9 },
              { x: 370, y: 325, w: 1, o: 0.7, h: 0.9 },
            ],
          },
          {
            name: 'cabin-window-right',
            type: 'stroke',
            layer: 4,
            tension: 0.15,
            brush: b({ color: '#c9a84c', size: 2, opacity: 0.6 }),
            points: [
              { x: 480, y: 325, w: 1, o: 0.7, h: 0.9 },
              { x: 480, y: 340, w: 1, o: 0.7, h: 0.9 },
              { x: 510, y: 340, w: 1, o: 0.7, h: 0.9 },
              { x: 510, y: 325, w: 1, o: 0.7, h: 0.9 },
              { x: 480, y: 325, w: 1, o: 0.7, h: 0.9 },
            ],
          },
        ],
      },
      {
        name: 'chimney',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'chimney-body',
            type: 'stroke',
            layer: 4,
            tension: 0.15,
            brush: b({ color: '#6b4030', size: 3, opacity: 0.7 }),
            points: [
              { x: 485, y: 275, w: 1, o: 0.8, h: 0.9 },
              { x: 485, y: 248, w: 1, o: 0.8, h: 0.9 },
              { x: 505, y: 248, w: 1, o: 0.8, h: 0.9 },
              { x: 505, y: 285, w: 1, o: 0.8, h: 0.9 },
            ],
          },
          {
            name: 'smoke',
            type: 'stroke',
            layer: 5,
            tension: 0.8,
            brush: b({ color: '#9ca8b8', size: 4, opacity: 0.1, hardness: 0.3, spacing: 0.3 }),
            points: [
              { x: 495, y: 248, w: 0.8, o: 0.12, h: 0.3 },
              { x: 500, y: 215, w: 1.2, o: 0.09, h: 0.3 },
              { x: 490, y: 180, w: 1.5, o: 0.06, h: 0.3 },
              { x: 505, y: 140, w: 1.8, o: 0.04, h: 0.3 },
            ],
          },
        ],
      },
      {
        name: 'trees-fg',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'tree-left-trunk',
            type: 'stroke',
            layer: 6,
            tension: 0.3,
            brush: b({ color: '#4a3525', size: 3, opacity: 0.7 }),
            points: [
              { x: 280, y: 380, w: 1, o: 0.8, h: 0.9 },
              { x: 280, y: 310, w: 0.8, o: 0.75, h: 0.9 },
              { x: 279, y: 250, w: 0.5, o: 0.6, h: 0.9 },
            ],
          },
          {
            name: 'tree-left-foliage',
            type: 'stroke',
            layer: 6,
            tension: 0.6,
            brush: b({ type: 'watercolor', color: '#2e6b3e', size: 10, opacity: 0.25, hardness: 0.35 }),
            points: [
              { x: 255, y: 295, w: 1, o: 0.35, h: 0.4 },
              { x: 270, y: 260, w: 1.2, o: 0.4, h: 0.4 },
              { x: 290, y: 245, w: 1.3, o: 0.42, h: 0.4 },
              { x: 305, y: 280, w: 1, o: 0.35, h: 0.4 },
            ],
          },
          {
            name: 'tree-right-trunk',
            type: 'stroke',
            layer: 6,
            tension: 0.3,
            brush: b({ color: '#4a3525', size: 3.5, opacity: 0.7 }),
            points: [
              { x: 620, y: 385, w: 1, o: 0.8, h: 0.9 },
              { x: 620, y: 310, w: 0.8, o: 0.75, h: 0.9 },
              { x: 620, y: 235, w: 0.5, o: 0.6, h: 0.9 },
            ],
          },
          {
            name: 'tree-right-foliage',
            type: 'stroke',
            layer: 6,
            tension: 0.6,
            brush: b({ type: 'watercolor', color: '#2e6b3e', size: 12, opacity: 0.25, hardness: 0.35 }),
            points: [
              { x: 590, y: 285, w: 1, o: 0.35, h: 0.4 },
              { x: 610, y: 250, w: 1.3, o: 0.42, h: 0.4 },
              { x: 635, y: 230, w: 1.4, o: 0.45, h: 0.4 },
              { x: 655, y: 275, w: 1, o: 0.35, h: 0.4 },
            ],
          },
        ],
      },
    ],
  },
}
// @site-hero-scene-end

// @site-draw-mode-scene
export const DRAW_MODE_SCENE: Scene = {
  name: 'vintage bicycle',
  version: '1.0',
  mode: 'draw',
  canvas: { width: 380, height: 280 },
  root: {
    name: 'scene',
    type: 'component',
    transform: t(),
    children: [
      {
        name: 'ground',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'ground-line',
            type: 'stroke',
            layer: 0,
            tension: 0.5,
            brush: b({ size: 2, opacity: 0.2 }),
            points: [
              { x: 10, y: 230, w: 1, o: 0.3, h: 0.6 },
              { x: 190, y: 227, w: 1, o: 0.3, h: 0.6 },
              { x: 370, y: 230, w: 1, o: 0.3, h: 0.6 },
            ],
          },
        ],
      },
      {
        name: 'rear-wheel',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'rear-rim',
            type: 'stroke',
            layer: 1,
            tension: 0.3,
            brush: b({ size: 2.5, opacity: 0.75 }),
            points: [
              { x: 120, y: 190, w: 1, o: 0.8, h: 0.9 },
              { x: 155, y: 160, w: 1, o: 0.8, h: 0.9 },
              { x: 190, y: 170, w: 1, o: 0.8, h: 0.9 },
              { x: 195, y: 205, w: 1, o: 0.8, h: 0.9 },
              { x: 170, y: 228, w: 1, o: 0.8, h: 0.9 },
              { x: 135, y: 225, w: 1, o: 0.8, h: 0.9 },
              { x: 115, y: 200, w: 1, o: 0.8, h: 0.9 },
              { x: 120, y: 190, w: 1, o: 0.8, h: 0.9 },
            ],
          },
        ],
      },
      {
        name: 'front-wheel',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'front-rim',
            type: 'stroke',
            layer: 1,
            tension: 0.3,
            brush: b({ size: 2.5, opacity: 0.75 }),
            points: [
              { x: 240, y: 190, w: 1, o: 0.8, h: 0.9 },
              { x: 275, y: 160, w: 1, o: 0.8, h: 0.9 },
              { x: 310, y: 170, w: 1, o: 0.8, h: 0.9 },
              { x: 315, y: 205, w: 1, o: 0.8, h: 0.9 },
              { x: 290, y: 228, w: 1, o: 0.8, h: 0.9 },
              { x: 255, y: 225, w: 1, o: 0.8, h: 0.9 },
              { x: 235, y: 200, w: 1, o: 0.8, h: 0.9 },
              { x: 240, y: 190, w: 1, o: 0.8, h: 0.9 },
            ],
          },
        ],
      },
      {
        name: 'frame',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'top-tube',
            type: 'stroke',
            layer: 2,
            tension: 0.2,
            brush: b({ size: 3, opacity: 0.8 }),
            points: [
              { x: 155, y: 160, w: 1, o: 0.9, h: 0.9 },
              { x: 200, y: 145, w: 1, o: 0.9, h: 0.9 },
              { x: 260, y: 148, w: 1, o: 0.9, h: 0.9 },
            ],
          },
          {
            name: 'seat-tube',
            type: 'stroke',
            layer: 2,
            tension: 0.15,
            brush: b({ size: 2.5, opacity: 0.75 }),
            points: [
              { x: 175, y: 155, w: 1, o: 0.8, h: 0.9 },
              { x: 165, y: 195, w: 1, o: 0.8, h: 0.9 },
            ],
          },
          {
            name: 'down-tube',
            type: 'stroke',
            layer: 2,
            tension: 0.2,
            brush: b({ size: 2.5, opacity: 0.75 }),
            points: [
              { x: 260, y: 150, w: 1, o: 0.8, h: 0.9 },
              { x: 270, y: 195, w: 1, o: 0.8, h: 0.9 },
            ],
          },
          {
            name: 'handlebar',
            type: 'stroke',
            layer: 3,
            tension: 0.5,
            brush: b({ size: 2.5, opacity: 0.8 }),
            points: [
              { x: 255, y: 130, w: 0.8, o: 0.7, h: 0.9 },
              { x: 262, y: 140, w: 1, o: 0.8, h: 0.9 },
              { x: 268, y: 148, w: 1, o: 0.8, h: 0.9 },
            ],
          },
          {
            name: 'seat',
            type: 'stroke',
            layer: 3,
            tension: 0.4,
            brush: b({ size: 3, opacity: 0.7 }),
            points: [
              { x: 160, y: 145, w: 1, o: 0.8, h: 0.9 },
              { x: 175, y: 140, w: 1.2, o: 0.8, h: 0.9 },
              { x: 190, y: 143, w: 0.8, o: 0.7, h: 0.9 },
            ],
          },
        ],
      },
      {
        name: 'basket',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'basket-outline',
            type: 'stroke',
            layer: 4,
            tension: 0.3,
            brush: b({ size: 2, opacity: 0.6 }),
            points: [
              { x: 275, y: 120, w: 1, o: 0.7, h: 0.9 },
              { x: 275, y: 140, w: 1, o: 0.7, h: 0.9 },
              { x: 330, y: 140, w: 1, o: 0.7, h: 0.9 },
              { x: 330, y: 120, w: 1, o: 0.7, h: 0.9 },
            ],
          },
          {
            name: 'flowers',
            type: 'stroke',
            layer: 5,
            tension: 0.7,
            brush: b({ size: 4, opacity: 0.4, hardness: 0.4 }),
            points: [
              { x: 285, y: 115, w: 1, o: 0.5, h: 0.4 },
              { x: 295, y: 103, w: 1.3, o: 0.6, h: 0.4 },
              { x: 310, y: 106, w: 1.2, o: 0.55, h: 0.4 },
              { x: 320, y: 110, w: 1, o: 0.5, h: 0.4 },
            ],
          },
        ],
      },
    ],
  },
}
// @site-draw-mode-scene-end

// @site-design-mode-scene
export const DESIGN_MODE_SCENE: Scene = {
  name: 'one bedroom apartment',
  version: '1.0',
  mode: 'design',
  canvas: { width: 380, height: 280 },
  root: {
    name: 'scene',
    type: 'component',
    transform: t(),
    children: [
      {
        name: 'outer-walls',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'wall-outer',
            type: 'stroke',
            layer: 0,
            tension: 0.05,
            brush: b({ size: 3, opacity: 0.85 }),
            points: [
              { x: 40, y: 30, w: 1, o: 1, h: 1 },
              { x: 340, y: 30, w: 1, o: 1, h: 1 },
              { x: 340, y: 250, w: 1, o: 1, h: 1 },
              { x: 40, y: 250, w: 1, o: 1, h: 1 },
              { x: 40, y: 30, w: 1, o: 1, h: 1 },
            ],
          },
        ],
      },
      {
        name: 'interior-walls',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'bedroom-wall',
            type: 'stroke',
            layer: 1,
            tension: 0.05,
            brush: b({ size: 2.5, opacity: 0.75 }),
            points: [
              { x: 200, y: 30, w: 1, o: 0.9, h: 1 },
              { x: 200, y: 160, w: 1, o: 0.9, h: 1 },
            ],
          },
          {
            name: 'kitchen-wall',
            type: 'stroke',
            layer: 1,
            tension: 0.05,
            brush: b({ size: 2.5, opacity: 0.75 }),
            points: [
              { x: 200, y: 190, w: 1, o: 0.9, h: 1 },
              { x: 200, y: 250, w: 1, o: 0.9, h: 1 },
            ],
          },
          {
            name: 'bathroom-wall',
            type: 'stroke',
            layer: 1,
            tension: 0.05,
            brush: b({ size: 2, opacity: 0.7 }),
            points: [
              { x: 40, y: 170, w: 1, o: 0.9, h: 1 },
              { x: 130, y: 170, w: 1, o: 0.9, h: 1 },
              { x: 130, y: 250, w: 1, o: 0.9, h: 1 },
            ],
          },
        ],
      },
      {
        name: 'furniture',
        type: 'component',
        transform: t(),
        children: [
          {
            name: 'bed',
            type: 'stroke',
            layer: 2,
            tension: 0.1,
            brush: b({ size: 2, opacity: 0.5 }),
            points: [
              { x: 230, y: 50, w: 1, o: 0.6, h: 0.9 },
              { x: 320, y: 50, w: 1, o: 0.6, h: 0.9 },
              { x: 320, y: 120, w: 1, o: 0.6, h: 0.9 },
              { x: 230, y: 120, w: 1, o: 0.6, h: 0.9 },
              { x: 230, y: 50, w: 1, o: 0.6, h: 0.9 },
            ],
          },
          {
            name: 'sofa',
            type: 'stroke',
            layer: 2,
            tension: 0.15,
            brush: b({ size: 2, opacity: 0.5 }),
            points: [
              { x: 55, y: 50, w: 1, o: 0.6, h: 0.9 },
              { x: 160, y: 50, w: 1, o: 0.6, h: 0.9 },
              { x: 160, y: 80, w: 1, o: 0.6, h: 0.9 },
              { x: 55, y: 80, w: 1, o: 0.6, h: 0.9 },
              { x: 55, y: 50, w: 1, o: 0.6, h: 0.9 },
            ],
          },
          {
            name: 'coffee-table',
            type: 'stroke',
            layer: 2,
            tension: 0.1,
            brush: b({ size: 1.5, opacity: 0.4 }),
            points: [
              { x: 80, y: 95, w: 1, o: 0.5, h: 0.9 },
              { x: 135, y: 95, w: 1, o: 0.5, h: 0.9 },
              { x: 135, y: 110, w: 1, o: 0.5, h: 0.9 },
              { x: 80, y: 110, w: 1, o: 0.5, h: 0.9 },
              { x: 80, y: 95, w: 1, o: 0.5, h: 0.9 },
            ],
          },
          {
            name: 'counter',
            type: 'stroke',
            layer: 2,
            tension: 0.05,
            brush: b({ size: 2, opacity: 0.5 }),
            points: [
              { x: 210, y: 195, w: 1, o: 0.6, h: 0.9 },
              { x: 210, y: 240, w: 1, o: 0.6, h: 0.9 },
              { x: 320, y: 240, w: 1, o: 0.6, h: 0.9 },
              { x: 320, y: 220, w: 1, o: 0.6, h: 0.9 },
              { x: 250, y: 220, w: 1, o: 0.6, h: 0.9 },
              { x: 250, y: 195, w: 1, o: 0.6, h: 0.9 },
            ],
          },
          {
            name: 'tub',
            type: 'stroke',
            layer: 2,
            tension: 0.2,
            brush: b({ size: 1.5, opacity: 0.4 }),
            points: [
              { x: 50, y: 200, w: 1, o: 0.5, h: 0.9 },
              { x: 120, y: 200, w: 1, o: 0.5, h: 0.9 },
              { x: 120, y: 240, w: 1, o: 0.5, h: 0.9 },
              { x: 50, y: 240, w: 1, o: 0.5, h: 0.9 },
              { x: 50, y: 200, w: 1, o: 0.5, h: 0.9 },
            ],
          },
          {
            name: 'balcony',
            type: 'stroke',
            layer: 1,
            tension: 0.05,
            brush: b({ size: 2, opacity: 0.5 }),
            points: [
              { x: 240, y: 130, w: 1, o: 0.6, h: 0.9 },
              { x: 340, y: 130, w: 1, o: 0.6, h: 0.9 },
              { x: 340, y: 170, w: 1, o: 0.6, h: 0.9 },
              { x: 240, y: 170, w: 1, o: 0.6, h: 0.9 },
            ],
          },
        ],
      },
    ],
  },
}
// @site-design-mode-scene-end

// @site-demo-scenes
export const DEMO_SCENES: Record<string, Scene> = {
  'a lighthouse on a rocky cliff at sunset': {
    name: 'lighthouse cliff',
    version: '1.0',
    mode: 'draw',
    canvas: { width: 800, height: 500 },
    root: {
      name: 'scene',
      type: 'component',
      transform: t(),
      children: [
        {
          name: 'sea',
          type: 'component',
          transform: t(),
          children: [
            {
              name: 'wave-1',
              type: 'stroke',
              layer: 0,
              tension: 0.6,
              brush: b({ size: 2, opacity: 0.2, hardness: 0.5 }),
              points: [
                { x: 0, y: 350, w: 1, o: 0.25, h: 0.5 },
                { x: 200, y: 343, w: 1, o: 0.25, h: 0.5 },
                { x: 450, y: 338, w: 1, o: 0.25, h: 0.5 },
              ],
            },
            {
              name: 'wave-2',
              type: 'stroke',
              layer: 0,
              tension: 0.7,
              brush: b({ size: 1.5, opacity: 0.15, hardness: 0.5 }),
              points: [
                { x: 100, y: 370, w: 1, o: 0.2, h: 0.5 },
                { x: 300, y: 362, w: 1, o: 0.2, h: 0.5 },
                { x: 500, y: 365, w: 1, o: 0.2, h: 0.5 },
              ],
            },
          ],
        },
        {
          name: 'cliff',
          type: 'component',
          transform: t(),
          children: [
            {
              name: 'cliff-face',
              type: 'stroke',
              layer: 1,
              tension: 0.3,
              brush: b({ size: 4, opacity: 0.35 }),
              points: [
                { x: 350, y: 500, w: 1.5, o: 0.45, h: 0.6 },
                { x: 400, y: 320, w: 1.2, o: 0.5, h: 0.6 },
                { x: 550, y: 295, w: 1, o: 0.5, h: 0.6 },
                { x: 750, y: 360, w: 1.5, o: 0.4, h: 0.6 },
              ],
            },
          ],
        },
        {
          name: 'lighthouse',
          type: 'component',
          transform: t(),
          children: [
            {
              name: 'tower-left',
              type: 'stroke',
              layer: 2,
              tension: 0.15,
              brush: b({ size: 3.5, opacity: 0.8 }),
              points: [
                { x: 480, y: 295, w: 1, o: 0.9, h: 0.9 },
                { x: 474, y: 200, w: 0.9, o: 0.9, h: 0.9 },
                { x: 470, y: 145, w: 0.8, o: 0.9, h: 0.9 },
              ],
            },
            {
              name: 'tower-right',
              type: 'stroke',
              layer: 2,
              tension: 0.15,
              brush: b({ size: 3.5, opacity: 0.8 }),
              points: [
                { x: 540, y: 295, w: 1, o: 0.9, h: 0.9 },
                { x: 535, y: 200, w: 0.9, o: 0.9, h: 0.9 },
                { x: 530, y: 145, w: 0.8, o: 0.9, h: 0.9 },
              ],
            },
            {
              name: 'lantern',
              type: 'stroke',
              layer: 3,
              tension: 0.2,
              brush: b({ size: 3, opacity: 0.75 }),
              points: [
                { x: 466, y: 145, w: 1, o: 0.85, h: 0.9 },
                { x: 466, y: 122, w: 1, o: 0.85, h: 0.9 },
                { x: 534, y: 122, w: 1, o: 0.85, h: 0.9 },
                { x: 534, y: 145, w: 1, o: 0.85, h: 0.9 },
              ],
            },
            {
              name: 'dome',
              type: 'stroke',
              layer: 3,
              tension: 0.4,
              brush: b({ size: 2.5, opacity: 0.7 }),
              points: [
                { x: 470, y: 125, w: 1, o: 0.8, h: 0.9 },
                { x: 500, y: 108, w: 1, o: 0.8, h: 0.9 },
                { x: 530, y: 125, w: 1, o: 0.8, h: 0.9 },
              ],
            },
            {
              name: 'light-beam',
              type: 'stroke',
              layer: 4,
              tension: 0.8,
              brush: b({ size: 6, opacity: 0.08, hardness: 0.3, spacing: 0.35 }),
              points: [
                { x: 500, y: 115, w: 1, o: 0.12, h: 0.3 },
                { x: 350, y: 80, w: 2, o: 0.08, h: 0.3 },
                { x: 150, y: 45, w: 3, o: 0.04, h: 0.3 },
              ],
            },
            {
              name: 'stripe',
              type: 'stroke',
              layer: 2,
              tension: 0.1,
              brush: b({ size: 2, opacity: 0.3 }),
              points: [
                { x: 478, y: 220, w: 1, o: 0.4, h: 0.9 },
                { x: 533, y: 220, w: 1, o: 0.4, h: 0.9 },
              ],
            },
          ],
        },
      ],
    },
  },
}
// @site-demo-scenes-end
// @site-scenes-end
