// @app-panels
import { store } from './state'
import type { ToolType, AppMode, StyleName } from './types'

// @app-panels-tools
const SKETCH_TOOLS: { id: ToolType; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '⊹' },
  { id: 'draw', label: 'Draw', icon: '✎' },
  { id: 'eraser', label: 'Eraser', icon: '◻' },
  { id: 'pan', label: 'Pan', icon: '✋' },
]

const DESIGN_TOOLS: { id: ToolType; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '⊹' },
  { id: 'line', label: 'Line', icon: '╱' },
  { id: 'rect', label: 'Rectangle', icon: '▭' },
  { id: 'draw', label: 'Freehand', icon: '✎' },
  { id: 'dimension', label: 'Dimension', icon: '↔' },
  { id: 'annotation', label: 'Annotate', icon: 'A' },
  { id: 'zone', label: 'Zone', icon: '▨' },
  { id: 'pan', label: 'Pan', icon: '✋' },
]

function renderToolGrid() {
  const grid = document.getElementById('tool-grid')
  if (!grid) return
  const { mode, tool } = store.get()
  const tools = mode === 'sketch' ? SKETCH_TOOLS : DESIGN_TOOLS

  grid.innerHTML = ''
  for (const t of tools) {
    const btn = document.createElement('button')
    btn.className = 'tool-btn' + (t.id === tool ? ' active' : '')
    btn.title = t.label
    btn.textContent = t.icon
    btn.addEventListener('click', () => store.setTool(t.id))
    grid.appendChild(btn)
  }
}
// @app-panels-tools-end

// @app-panels-brush
const STYLE_OPTIONS: { id: StyleName; label: string }[] = [
  { id: 'outline', label: 'Outline' },
  { id: 'outline-bold', label: 'Bold' },
  { id: 'outline-fine', label: 'Fine' },
  { id: 'detail', label: 'Detail' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'gesture', label: 'Gesture' },
  { id: 'underdrawing', label: 'Under' },
  { id: 'soft', label: 'Soft' },
  { id: 'wash', label: 'Wash' },
  { id: 'scumble', label: 'Scumbl' },
  { id: 'hatching', label: 'Hatch' },
  { id: 'crosshatch', label: 'XHatch' },
  { id: 'shading', label: 'Shade' },
  { id: 'highlight', label: 'Hilite' },
  { id: 'texture', label: 'Texture' },
  { id: 'accent', label: 'Accent' },
  { id: 'construction', label: 'Constr' },
]

function renderBrushPicker() {
  const container = document.getElementById('brush-picker')
  if (!container) return
  const { draw } = store.get()

  container.innerHTML = ''

  const typeRow = document.createElement('div')
  typeRow.className = 'brush-type-row'
  for (const opt of STYLE_OPTIONS) {
    const btn = document.createElement('button')
    btn.className = 'brush-type-btn' + (draw.style === opt.id ? ' active' : '')
    btn.textContent = opt.label.slice(0, 4)
    btn.title = opt.label
    btn.addEventListener('click', () => {
      const { draw: d } = store.get()
      store.set({ draw: { ...d, style: opt.id } })
    })
    typeRow.appendChild(btn)
  }
  container.appendChild(typeRow)

  container.appendChild(createSlider('Weight', draw.weight, 0.5, 5, 0.5, (v) => {
    const { draw: d } = store.get()
    store.set({ draw: { ...d, weight: v } })
  }))
}

function createSlider(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (v: number) => void
): HTMLElement {
  const row = document.createElement('div')
  row.className = 'slider-row'

  const lbl = document.createElement('label')
  lbl.className = 'slider-label'
  lbl.textContent = label

  const input = document.createElement('input')
  input.type = 'range'
  input.className = 'slider-input'
  input.min = String(min)
  input.max = String(max)
  input.step = String(step)
  input.value = String(value)

  const val = document.createElement('span')
  val.className = 'slider-value'
  val.textContent = value <= 1 && max <= 1 ? Math.round(value * 100) + '%' : String(value)

  input.addEventListener('input', () => {
    const v = parseFloat(input.value)
    val.textContent = v <= 1 && max <= 1 ? Math.round(v * 100) + '%' : String(v)
    onChange(v)
  })

  row.appendChild(lbl)
  row.appendChild(input)
  row.appendChild(val)
  return row
}
// @app-panels-brush-end

// @app-panels-color
const PALETTE = [
  '#1a1a1a', '#333333', '#666666', '#999999', '#cccccc',
  '#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#1976d2',
  '#7b1fa2', '#c2185b', '#00838f', '#4e342e', '#37474f',
]

function renderColorPicker() {
  const container = document.getElementById('color-picker')
  if (!container) return
  const { draw } = store.get()

  container.innerHTML = ''

  const grid = document.createElement('div')
  grid.className = 'color-grid'

  for (const c of PALETTE) {
    const swatch = document.createElement('button')
    swatch.className = 'color-swatch' + (draw.color === c ? ' active' : '')
    swatch.style.backgroundColor = c
    swatch.addEventListener('click', () => {
      store.set({ draw: { ...store.get().draw, color: c } })
    })
    grid.appendChild(swatch)
  }
  container.appendChild(grid)

  const customRow = document.createElement('div')
  customRow.className = 'color-custom-row'
  const colorInput = document.createElement('input')
  colorInput.type = 'color'
  colorInput.value = draw.color
  colorInput.className = 'color-input'
  colorInput.addEventListener('input', () => {
    store.set({ draw: { ...store.get().draw, color: colorInput.value } })
  })
  customRow.appendChild(colorInput)

  const hexLabel = document.createElement('span')
  hexLabel.className = 'color-hex'
  hexLabel.textContent = draw.color
  customRow.appendChild(hexLabel)
  container.appendChild(customRow)
}
// @app-panels-color-end

// @app-panels-layers
function renderLayerList() {
  const container = document.getElementById('layer-list')
  if (!container) return
  const { layers } = store.get()

  container.innerHTML = ''

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]
    const row = document.createElement('div')
    row.className = 'layer-row'

    const visBtn = document.createElement('button')
    visBtn.className = 'layer-vis-btn'
    visBtn.textContent = layer.visible ? '👁' : '—'
    visBtn.addEventListener('click', () => {
      const ls = [...store.get().layers]
      ls[i] = { ...ls[i], visible: !ls[i].visible }
      store.set({ layers: ls })
    })

    const lockBtn = document.createElement('button')
    lockBtn.className = 'layer-lock-btn'
    lockBtn.textContent = layer.locked ? '🔒' : '—'
    lockBtn.addEventListener('click', () => {
      const ls = [...store.get().layers]
      ls[i] = { ...ls[i], locked: !ls[i].locked }
      store.set({ layers: ls })
    })

    const nameEl = document.createElement('span')
    nameEl.className = 'layer-name'
    nameEl.textContent = layer.name

    row.appendChild(visBtn)
    row.appendChild(lockBtn)
    row.appendChild(nameEl)
    container.appendChild(row)
  }
}

function addLayer() {
  const { layers } = store.get()
  const id = 'layer-' + layers.length
  store.set({
    layers: [...layers, { id, name: 'Layer ' + (layers.length + 1), visible: true, locked: false }],
  })
}
// @app-panels-layers-end

// @app-panels-properties
function renderProperties() {
  const container = document.getElementById('properties-panel')
  if (!container) return
  const { mode, selection, design } = store.get()

  container.innerHTML = ''

  if (mode === 'design') {
    renderDesignProperties(container, design)
  }

  if (selection.selectedIds.size > 0) {
    const info = document.createElement('div')
    info.className = 'prop-info'
    info.textContent = selection.selectedIds.size + ' selected'
    container.appendChild(info)
  }
}

function renderDesignProperties(container: HTMLElement, design: import('./types').DesignConfig) {
  const scaleRow = document.createElement('div')
  scaleRow.className = 'prop-row'
  const scaleLabel = document.createElement('label')
  scaleLabel.textContent = 'Scale'
  scaleLabel.className = 'prop-label'
  const scaleSelect = document.createElement('select')
  scaleSelect.className = 'prop-select'
  for (const s of ['1:50', '1:100', '1:200', '1:500']) {
    const opt = document.createElement('option')
    opt.value = s
    opt.textContent = s
    if (s === design.scale) opt.selected = true
    scaleSelect.appendChild(opt)
  }
  scaleSelect.addEventListener('change', () => {
    const ratio = parseInt(scaleSelect.value.split(':')[1])
    store.set({ design: { ...store.get().design, scale: scaleSelect.value, scaleRatio: ratio } })
  })
  scaleRow.appendChild(scaleLabel)
  scaleRow.appendChild(scaleSelect)
  container.appendChild(scaleRow)

  const gridRow = document.createElement('div')
  gridRow.className = 'prop-row'
  const gridCheck = document.createElement('input')
  gridCheck.type = 'checkbox'
  gridCheck.checked = design.gridVisible
  gridCheck.addEventListener('change', () => {
    store.set({ design: { ...store.get().design, gridVisible: gridCheck.checked } })
  })
  const gridLabel = document.createElement('label')
  gridLabel.textContent = 'Grid'
  gridLabel.className = 'prop-label'
  gridRow.appendChild(gridCheck)
  gridRow.appendChild(gridLabel)
  container.appendChild(gridRow)

  const snapRow = document.createElement('div')
  snapRow.className = 'prop-row'
  const snapCheck = document.createElement('input')
  snapCheck.type = 'checkbox'
  snapCheck.checked = design.snapToGrid
  snapCheck.addEventListener('change', () => {
    store.set({ design: { ...store.get().design, snapToGrid: snapCheck.checked } })
  })
  const snapLabel = document.createElement('label')
  snapLabel.textContent = 'Snap'
  snapLabel.className = 'prop-label'
  snapRow.appendChild(snapCheck)
  snapRow.appendChild(snapLabel)
  container.appendChild(snapRow)
}
// @app-panels-properties-end

// @app-panels-init
export function initPanels() {
  store.subscribe(() => {
    renderToolGrid()
    renderBrushPicker()
    renderColorPicker()
    renderLayerList()
    renderProperties()
  })

  renderToolGrid()
  renderBrushPicker()
  renderColorPicker()
  renderLayerList()
  renderProperties()

  document.getElementById('btn-add-layer')?.addEventListener('click', addLayer)
}
// @app-panels-init-end
// @app-panels-end
