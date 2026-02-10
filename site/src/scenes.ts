// @site-scenes
import type { Scene, StyleName } from '@engine/types'

// @site-scene-utils
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
      { name: 'sky-fill', type: 'fill', layer: 0, color: '#b5cde0', opacity: 0.6, points: [[0, 0], [900, 0], [900, 330], [0, 340]] },
      { name: 'sky-glow', type: 'fill', layer: 0, color: '#e0c8a0', opacity: 0.2, points: [[300, 0], [600, 0], [650, 200], [250, 210]] },
      { name: 'distant-haze', type: 'stroke', layer: 0, style: 'scumble' as StyleName, color: '#9ab0c8', points: [[0, 280], [200, 260], [450, 255], [700, 260], [900, 275]], weight: 2 },
      { name: 'mountain-fill-far', type: 'fill', layer: 0, color: '#95a8bb', opacity: 0.25, points: [[540, 325], [700, 210], [790, 195], [930, 310]] },
      { name: 'mountain-fill-center', type: 'fill', layer: 0, color: '#7b8fa6', opacity: 0.35, points: [[240, 330], [400, 185], [450, 160], [600, 310]] },
      { name: 'mountain-fill-near', type: 'fill', layer: 0, color: '#8a9eb5', opacity: 0.3, points: [[-20, 330], [100, 205], [200, 185], [320, 320]] },
      {
        name: 'mountains', type: 'component', transform: t(),
        children: [
          { name: 'mountain-far-ridge', type: 'stroke', layer: 0, style: 'outline-fine' as StyleName, color: '#7b8faa', points: [[550, 315], [700, 210], [780, 195], [920, 305]], weight: 0.5 },
          { name: 'mountain-center-ridge', type: 'stroke', layer: 0, style: 'outline-fine' as StyleName, color: '#5a6d8a', points: [[250, 320], [400, 185], [440, 160], [580, 300]], weight: 0.7 },
          { name: 'mountain-near-ridge', type: 'stroke', layer: 0, style: 'soft' as StyleName, color: '#6b7fa3', points: [[-20, 320], [100, 205], [200, 185], [300, 310]], weight: 0.8 },
          { name: 'mountain-shadow', type: 'stroke', layer: 0, style: 'wash' as StyleName, color: '#5a6880', points: [[420, 200], [480, 230], [560, 290]], weight: 0.6 },
        ],
      },
      { name: 'ground-fill', type: 'fill', layer: 1, color: '#7a9a5e', opacity: 0.4, points: [[0, 330], [300, 360], [600, 355], [900, 340], [900, 500], [0, 500]] },
      { name: 'treeline-fill-left', type: 'fill', layer: 1, color: '#3d6b42', opacity: 0.3, points: [[0, 340], [60, 295], [140, 275], [240, 320], [240, 350], [0, 350]] },
      { name: 'treeline-fill-right', type: 'fill', layer: 1, color: '#3d6b42', opacity: 0.3, points: [[600, 340], [680, 285], [780, 278], [900, 320], [900, 350], [600, 350]] },
      {
        name: 'treelines', type: 'component', transform: t(),
        children: [
          { name: 'treeline-left', type: 'stroke', layer: 1, style: 'soft' as StyleName, color: '#2d5a3d', points: [[20, 320], [80, 280], [140, 265], [220, 310]], weight: 0.7 },
          { name: 'treeline-right', type: 'stroke', layer: 1, style: 'soft' as StyleName, color: '#2d5a3d', points: [[620, 310], [700, 270], [780, 273], [880, 308]], weight: 0.7 },
        ],
      },
      { name: 'ground-shadow-fill', type: 'fill', layer: 2, color: '#4a6741', opacity: 0.15, points: [[350, 380], [560, 380], [580, 500], [320, 500]] },
      { name: 'cabin-body-fill', type: 'fill', layer: 2, color: '#8b6140', opacity: 0.7, points: [[350, 375], [350, 310], [530, 310], [530, 375]] },
      { name: 'cabin-shadow-fill', type: 'fill', layer: 2, color: '#5c3a1e', opacity: 0.2, points: [[440, 310], [530, 310], [530, 375], [440, 375]] },
      { name: 'cabin-roof-fill', type: 'fill', layer: 2, color: '#6b3520', opacity: 0.65, points: [[335, 315], [440, 250], [545, 315]] },
      { name: 'cabin-roof-shadow', type: 'fill', layer: 2, color: '#4a2010', opacity: 0.15, points: [[440, 250], [545, 315], [440, 315]] },
      { name: 'tree-left-foliage-fill', type: 'fill', layer: 2, color: '#2e6b3e', opacity: 0.5, points: [[250, 300], [260, 260], [280, 240], [300, 250], [310, 290]] },
      { name: 'tree-right-foliage-fill', type: 'fill', layer: 2, color: '#2e6b3e', opacity: 0.5, points: [[585, 290], [600, 250], [625, 230], [650, 245], [660, 280]] },
      {
        name: 'cabin', type: 'component', transform: t(),
        children: [
          { name: 'cabin-underdraw', type: 'stroke', layer: 2, style: 'underdrawing' as StyleName, color: '#5c3a1e', points: [[345, 375], [345, 305], [535, 305], [535, 375]] },
          { name: 'cabin-body', type: 'stroke', layer: 3, style: 'outline' as StyleName, color: '#5c3a1e', points: [[350, 370], [350, 310], [530, 310], [530, 370], [350, 370]], weight: 1.2 },
          { name: 'cabin-roof', type: 'stroke', layer: 3, style: 'outline-bold' as StyleName, color: '#4a2515', points: [[335, 315], [440, 250], [545, 315]] },
          { name: 'cabin-door', type: 'stroke', layer: 4, style: 'detail' as StyleName, color: '#3a2518', points: [[420, 370], [420, 335], [460, 335], [460, 370]] },
          { name: 'cabin-window-left', type: 'stroke', layer: 4, style: 'detail' as StyleName, color: '#c9a84c', points: [[370, 325], [370, 340], [400, 340], [400, 325], [370, 325]] },
          { name: 'cabin-window-right', type: 'stroke', layer: 4, style: 'detail' as StyleName, color: '#c9a84c', points: [[480, 325], [480, 340], [510, 340], [510, 325], [480, 325]] },
          { name: 'cabin-wall-hatch-1', type: 'stroke', layer: 3, style: 'hatching' as StyleName, color: '#5c3a1e', points: [[475, 315], [475, 365]], weight: 0.8 },
          { name: 'cabin-wall-hatch-2', type: 'stroke', layer: 3, style: 'hatching' as StyleName, color: '#5c3a1e', points: [[495, 315], [495, 365]], weight: 0.8 },
          { name: 'cabin-wall-hatch-3', type: 'stroke', layer: 3, style: 'hatching' as StyleName, color: '#5c3a1e', points: [[515, 315], [515, 365]], weight: 0.8 },
          { name: 'roof-xhatch-1', type: 'stroke', layer: 3, style: 'crosshatch' as StyleName, color: '#4a2010', points: [[470, 270], [520, 300]], weight: 0.7 },
          { name: 'roof-xhatch-2', type: 'stroke', layer: 3, style: 'crosshatch' as StyleName, color: '#4a2010', points: [[485, 265], [530, 295]], weight: 0.7 },
        ],
      },
      {
        name: 'chimney', type: 'component', transform: t(),
        children: [
          { name: 'chimney-body', type: 'stroke', layer: 4, style: 'outline' as StyleName, color: '#6b4030', points: [[485, 275], [485, 248], [505, 248], [505, 285]] },
          { name: 'smoke', type: 'stroke', layer: 4, style: 'scumble' as StyleName, color: '#9ca8b8', points: [[495, 248], [500, 215], [490, 180], [505, 140]], weight: 0.8 },
        ],
      },
      {
        name: 'ground-detail', type: 'component', transform: t(),
        children: [
          { name: 'ground-line', type: 'stroke', layer: 3, style: 'outline' as StyleName, color: '#4a6741', points: [[0, 380], [300, 372], [600, 374], [900, 382]], weight: 0.8 },
          { name: 'path', type: 'stroke', layer: 3, style: 'sketch' as StyleName, color: '#8b7355', points: [[450, 500], [440, 430], [430, 375]], weight: 0.7 },
          { name: 'path-edge', type: 'stroke', layer: 3, style: 'sketch' as StyleName, color: '#8b7355', points: [[465, 500], [455, 435], [445, 378]], weight: 0.5 },
          { name: 'grass-1', type: 'stroke', layer: 3, style: 'gesture' as StyleName, color: '#4a6741', points: [[200, 390], [205, 378], [198, 370]], weight: 0.4 },
          { name: 'grass-2', type: 'stroke', layer: 3, style: 'gesture' as StyleName, color: '#4a6741', points: [[700, 385], [705, 373], [698, 365]], weight: 0.4 },
        ],
      },
      {
        name: 'trees-fg', type: 'component', transform: t(),
        children: [
          { name: 'tree-l-underdraw', type: 'stroke', layer: 5, style: 'underdrawing' as StyleName, color: '#4a3525', points: [[278, 385], [279, 310], [280, 245]] },
          { name: 'tree-l-trunk', type: 'stroke', layer: 6, style: 'outline-bold' as StyleName, color: '#3a2518', points: [[280, 380], [280, 310], [279, 255]], weight: 1.5 },
          { name: 'tree-l-foliage', type: 'stroke', layer: 6, style: 'gesture' as StyleName, color: '#1e5530', points: [[255, 295], [270, 260], [290, 245], [305, 280]], weight: 1.8 },
          { name: 'tree-l-shadow', type: 'stroke', layer: 6, style: 'crosshatch' as StyleName, color: '#14402a', points: [[275, 280], [295, 265], [305, 280]], weight: 0.8 },
          { name: 'tree-l-highlight', type: 'stroke', layer: 7, style: 'highlight' as StyleName, color: '#5a9a50', points: [[258, 268], [270, 252], [282, 248]], weight: 1 },
          { name: 'tree-r-underdraw', type: 'stroke', layer: 5, style: 'underdrawing' as StyleName, color: '#4a3525', points: [[618, 388], [619, 310], [620, 230]] },
          { name: 'tree-r-trunk', type: 'stroke', layer: 6, style: 'outline-bold' as StyleName, color: '#3a2518', points: [[620, 385], [620, 310], [620, 238]], weight: 1.8 },
          { name: 'tree-r-foliage', type: 'stroke', layer: 6, style: 'gesture' as StyleName, color: '#1e5530', points: [[590, 285], [610, 250], [635, 230], [655, 275]], weight: 2 },
          { name: 'tree-r-shadow', type: 'stroke', layer: 6, style: 'crosshatch' as StyleName, color: '#14402a', points: [[635, 248], [650, 260], [655, 278]], weight: 0.8 },
          { name: 'tree-r-highlight', type: 'stroke', layer: 7, style: 'highlight' as StyleName, color: '#5a9a50', points: [[595, 260], [608, 245], [618, 238]], weight: 1 },
        ],
      },
      {
        name: 'fg-accents', type: 'component', transform: t(),
        children: [
          { name: 'fg-grass-1', type: 'stroke', layer: 7, style: 'gesture' as StyleName, color: '#2d5a3d', points: [[80, 480], [90, 455], [85, 440]], weight: 1.5 },
          { name: 'fg-grass-2', type: 'stroke', layer: 7, style: 'gesture' as StyleName, color: '#2d5a3d', points: [[800, 475], [810, 450], [805, 435]], weight: 1.5 },
          { name: 'fg-rock', type: 'stroke', layer: 7, style: 'accent' as StyleName, color: '#5a5045', points: [[140, 470], [155, 462], [170, 468]], weight: 1.2 },
          { name: 'win-glow-l', type: 'stroke', layer: 7, style: 'highlight' as StyleName, color: '#e8c860', points: [[375, 328], [385, 335], [395, 328]], weight: 0.8 },
          { name: 'win-glow-r', type: 'stroke', layer: 7, style: 'highlight' as StyleName, color: '#e8c860', points: [[485, 328], [495, 335], [505, 328]], weight: 0.8 },
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
  background: '#f5f0e8',
  canvas: { width: 380, height: 280 },
  root: {
    name: 'scene', type: 'component', transform: t(),
    children: [
      { name: 'shadow-fill', type: 'fill', layer: 0, color: '#1a1a1a', opacity: 0.04, points: [[100, 230], [320, 230], [330, 260], [90, 260]] },
      { name: 'ground-line', type: 'stroke', layer: 0, style: 'sketch' as StyleName, color: '#555555', points: [[10, 230], [190, 227], [370, 230]], weight: 0.7 },
      {
        name: 'rear-wheel', type: 'component', transform: t(),
        children: [
          { name: 'rear-underdraw', type: 'stroke', layer: 1, style: 'underdrawing' as StyleName, color: '#333333', points: [[118, 192], [153, 158], [192, 168], [197, 207], [168, 230], [133, 227], [113, 202], [118, 192]] },
          { name: 'rear-rim', type: 'stroke', layer: 2, style: 'outline' as StyleName, color: '#1a1a1a', points: [[120, 190], [155, 160], [190, 170], [195, 205], [170, 228], [135, 225], [115, 200], [120, 190]] },
          { name: 'rear-spoke-1', type: 'stroke', layer: 2, style: 'outline-fine' as StyleName, color: '#555555', points: [[155, 195], [155, 170]], weight: 0.5 },
          { name: 'rear-spoke-2', type: 'stroke', layer: 2, style: 'outline-fine' as StyleName, color: '#555555', points: [[140, 195], [170, 175]], weight: 0.5 },
        ],
      },
      {
        name: 'front-wheel', type: 'component', transform: t(),
        children: [
          { name: 'front-underdraw', type: 'stroke', layer: 1, style: 'underdrawing' as StyleName, color: '#333333', points: [[238, 192], [273, 158], [312, 168], [317, 207], [288, 230], [253, 227], [233, 202], [238, 192]] },
          { name: 'front-rim', type: 'stroke', layer: 2, style: 'outline' as StyleName, color: '#1a1a1a', points: [[240, 190], [275, 160], [310, 170], [315, 205], [290, 228], [255, 225], [235, 200], [240, 190]] },
          { name: 'front-spoke', type: 'stroke', layer: 2, style: 'outline-fine' as StyleName, color: '#555555', points: [[275, 195], [275, 170]], weight: 0.5 },
        ],
      },
      {
        name: 'frame', type: 'component', transform: t(),
        children: [
          { name: 'frame-underdraw', type: 'stroke', layer: 1, style: 'underdrawing' as StyleName, color: '#333333', points: [[153, 162], [198, 143], [262, 146]] },
          { name: 'top-tube', type: 'stroke', layer: 3, style: 'outline' as StyleName, color: '#1a1a1a', points: [[155, 160], [200, 145], [260, 148]], weight: 1.2 },
          { name: 'seat-tube', type: 'stroke', layer: 3, style: 'outline' as StyleName, color: '#1a1a1a', points: [[175, 155], [165, 195]] },
          { name: 'down-tube', type: 'stroke', layer: 3, style: 'outline' as StyleName, color: '#1a1a1a', points: [[260, 150], [270, 195]] },
          { name: 'handlebar', type: 'stroke', layer: 4, style: 'accent' as StyleName, color: '#1a1a1a', points: [[255, 130], [262, 140], [268, 148]], weight: 1.2 },
          { name: 'seat', type: 'stroke', layer: 4, style: 'outline-bold' as StyleName, color: '#1a1a1a', points: [[160, 145], [175, 140], [190, 143]] },
        ],
      },
      {
        name: 'basket', type: 'component', transform: t(),
        children: [
          { name: 'basket-outline', type: 'stroke', layer: 4, style: 'sketch' as StyleName, color: '#5a4a3a', points: [[275, 120], [275, 140], [330, 140], [330, 120]] },
          { name: 'basket-hatch-1', type: 'stroke', layer: 4, style: 'hatching' as StyleName, color: '#5a4a3a', points: [[285, 122], [285, 138]], weight: 0.6 },
          { name: 'basket-hatch-2', type: 'stroke', layer: 4, style: 'hatching' as StyleName, color: '#5a4a3a', points: [[300, 122], [300, 138]], weight: 0.6 },
          { name: 'basket-hatch-3', type: 'stroke', layer: 4, style: 'hatching' as StyleName, color: '#5a4a3a', points: [[315, 122], [315, 138]], weight: 0.6 },
          { name: 'flowers', type: 'stroke', layer: 5, style: 'gesture' as StyleName, color: '#c44040', points: [[290, 115], [295, 105], [305, 108]], weight: 0.8 },
          { name: 'flowers-2', type: 'stroke', layer: 5, style: 'gesture' as StyleName, color: '#d4a040', points: [[305, 112], [315, 103], [322, 108]], weight: 0.7 },
          { name: 'flower-leaves', type: 'stroke', layer: 5, style: 'soft' as StyleName, color: '#3a6a3a', points: [[288, 118], [300, 113], [318, 115]], weight: 0.5 },
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
    name: 'scene', type: 'component', transform: t(),
    children: [
      {
        name: 'outer-walls', type: 'component', transform: t(),
        children: [
          { name: 'wall-outer', type: 'stroke', layer: 0, style: 'construction' as StyleName, color: '#1a1a1a', points: [[40, 30], [340, 30], [340, 250], [40, 250], [40, 30]], weight: 1.2 },
        ],
      },
      {
        name: 'interior-walls', type: 'component', transform: t(),
        children: [
          { name: 'bedroom-wall', type: 'stroke', layer: 1, style: 'construction' as StyleName, color: '#1a1a1a', points: [[200, 30], [200, 160]] },
          { name: 'kitchen-wall', type: 'stroke', layer: 1, style: 'construction' as StyleName, color: '#1a1a1a', points: [[200, 190], [200, 250]] },
          { name: 'bathroom-wall', type: 'stroke', layer: 1, style: 'construction' as StyleName, color: '#1a1a1a', points: [[40, 170], [130, 170], [130, 250]], weight: 0.8 },
        ],
      },
      {
        name: 'furniture', type: 'component', transform: t(),
        children: [
          { name: 'bed', type: 'stroke', layer: 2, style: 'detail' as StyleName, color: '#1a1a1a', points: [[230, 50], [320, 50], [320, 120], [230, 120], [230, 50]], weight: 0.7 },
          { name: 'sofa', type: 'stroke', layer: 2, style: 'detail' as StyleName, color: '#1a1a1a', points: [[55, 50], [160, 50], [160, 80], [55, 80], [55, 50]], weight: 0.7 },
          { name: 'coffee-table', type: 'stroke', layer: 2, style: 'outline-fine' as StyleName, color: '#1a1a1a', points: [[80, 95], [135, 95], [135, 110], [80, 110], [80, 95]] },
          { name: 'counter', type: 'stroke', layer: 2, style: 'detail' as StyleName, color: '#1a1a1a', points: [[210, 195], [210, 240], [320, 240], [320, 220], [250, 220], [250, 195]], weight: 0.7 },
          { name: 'tub', type: 'stroke', layer: 2, style: 'outline-fine' as StyleName, color: '#1a1a1a', points: [[50, 200], [120, 200], [120, 240], [50, 240], [50, 200]] },
          { name: 'balcony', type: 'stroke', layer: 1, style: 'detail' as StyleName, color: '#1a1a1a', points: [[240, 130], [340, 130], [340, 170], [240, 170]], weight: 0.7 },
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
    background: '#e8c8a0',
    canvas: { width: 800, height: 500 },
    root: {
      name: 'scene', type: 'component', transform: t(),
      children: [
        { name: 'sunset-sky', type: 'fill', layer: 0, color: '#d4885a', opacity: 0.4, points: [[0, 0], [800, 0], [800, 350], [0, 360]] },
        { name: 'sky-glow', type: 'fill', layer: 0, color: '#e8a050', opacity: 0.25, points: [[350, 50], [550, 40], [600, 200], [300, 210]] },
        { name: 'sea-fill', type: 'fill', layer: 0, color: '#3a5a7a', opacity: 0.35, points: [[0, 340], [800, 330], [800, 500], [0, 500]] },
        { name: 'sea-haze', type: 'stroke', layer: 0, style: 'scumble' as StyleName, color: '#d4885a', points: [[0, 330], [300, 325], [600, 328], [800, 332]], weight: 1.5 },
        {
          name: 'sea', type: 'component', transform: t(),
          children: [
            { name: 'wave-1', type: 'stroke', layer: 1, style: 'sketch' as StyleName, color: '#2a4a6a', points: [[0, 370], [200, 363], [450, 358]], weight: 0.7 },
            { name: 'wave-2', type: 'stroke', layer: 1, style: 'sketch' as StyleName, color: '#2a4a6a', points: [[100, 390], [300, 382], [500, 385]], weight: 0.5 },
            { name: 'wave-3', type: 'stroke', layer: 1, style: 'gesture' as StyleName, color: '#3a5a7a', points: [[200, 420], [400, 410], [650, 418]], weight: 0.4 },
            { name: 'wave-highlight', type: 'stroke', layer: 1, style: 'highlight' as StyleName, color: '#e8c8a0', points: [[150, 365], [300, 358], [450, 355]], weight: 0.6 },
          ],
        },
        { name: 'cliff-fill', type: 'fill', layer: 2, color: '#5a4535', opacity: 0.6, points: [[350, 500], [380, 380], [420, 320], [550, 300], [700, 340], [750, 360], [800, 500]] },
        { name: 'cliff-shadow', type: 'fill', layer: 2, color: '#3a2a1a', opacity: 0.2, points: [[350, 500], [380, 380], [420, 340], [450, 400], [400, 500]] },
        {
          name: 'cliff', type: 'component', transform: t(),
          children: [
            { name: 'cliff-face', type: 'stroke', layer: 3, style: 'outline-bold' as StyleName, color: '#3a2a1a', points: [[350, 500], [400, 330], [550, 300], [750, 360]], weight: 1.5 },
            { name: 'cliff-texture', type: 'stroke', layer: 3, style: 'texture' as StyleName, color: '#4a3525', points: [[420, 350], [480, 330], [550, 340]], weight: 0.8 },
            { name: 'cliff-xhatch', type: 'stroke', layer: 3, style: 'crosshatch' as StyleName, color: '#3a2a1a', points: [[380, 400], [410, 360], [430, 380]], weight: 0.6 },
          ],
        },
        {
          name: 'lighthouse', type: 'component', transform: t(),
          children: [
            { name: 'tower-underdraw', type: 'stroke', layer: 2, style: 'underdrawing' as StyleName, color: '#5a5050', points: [[478, 298], [472, 200], [468, 142], [532, 142], [538, 200], [542, 298]] },
            { name: 'tower-left', type: 'stroke', layer: 4, style: 'outline' as StyleName, color: '#2a2a2a', points: [[480, 295], [474, 200], [470, 145]], weight: 1.3 },
            { name: 'tower-right', type: 'stroke', layer: 4, style: 'outline' as StyleName, color: '#2a2a2a', points: [[540, 295], [535, 200], [530, 145]], weight: 1.3 },
            { name: 'tower-shadow-1', type: 'stroke', layer: 3, style: 'hatching' as StyleName, color: '#5a5050', points: [[520, 160], [525, 220], [530, 285]], weight: 0.8 },
            { name: 'tower-shadow-2', type: 'stroke', layer: 3, style: 'hatching' as StyleName, color: '#5a5050', points: [[525, 170], [530, 230], [535, 280]], weight: 0.6 },
            { name: 'lantern', type: 'stroke', layer: 4, style: 'outline' as StyleName, color: '#2a2a2a', points: [[466, 145], [466, 122], [534, 122], [534, 145]] },
            { name: 'dome', type: 'stroke', layer: 4, style: 'accent' as StyleName, color: '#2a2a2a', points: [[470, 125], [500, 108], [530, 125]] },
            { name: 'stripe-1', type: 'stroke', layer: 4, style: 'detail' as StyleName, color: '#c44040', points: [[478, 215], [533, 215]] },
            { name: 'stripe-2', type: 'stroke', layer: 4, style: 'detail' as StyleName, color: '#c44040', points: [[476, 250], [535, 250]] },
            { name: 'light-beam', type: 'stroke', layer: 5, style: 'wash' as StyleName, color: '#e8c860', points: [[500, 115], [350, 80], [150, 45]], weight: 0.8 },
            { name: 'light-glow', type: 'stroke', layer: 5, style: 'highlight' as StyleName, color: '#e8d080', points: [[490, 128], [500, 118], [510, 128]], weight: 1.5 },
          ],
        },
        {
          name: 'fg-rocks', type: 'component', transform: t(),
          children: [
            { name: 'fg-rock-1', type: 'stroke', layer: 6, style: 'outline-bold' as StyleName, color: '#2a1a10', points: [[0, 480], [40, 450], [80, 460], [100, 500]], weight: 2 },
            { name: 'fg-rock-2', type: 'stroke', layer: 6, style: 'gesture' as StyleName, color: '#3a2a1a', points: [[750, 470], [780, 440], [800, 460]], weight: 1.8 },
            { name: 'fg-spray', type: 'stroke', layer: 7, style: 'scumble' as StyleName, color: '#c8c0b0', points: [[60, 465], [80, 450], [100, 458]], weight: 0.6 },
          ],
        },
      ],
    },
  },
}
// @site-demo-scenes-end
// @site-scenes-end
