// @app-main
import './style.css'
import { store } from './state'
import { initViewport, zoomIn, zoomOut, zoomFit } from './viewport'
import { initGenerate } from './generate'
import { initPanels } from './panels'
import { initFileMenu, initKeyboard } from './fileops'
import { initDiagramMode } from './diagram-mode'
import { diagramUndo, diagramRedo } from './diagram/editing'
import { initInspector } from './diagram/inspector'
import type { AppMode } from './types'

// @app-main-init
function init() {
  initViewport()
  initGenerate()
  initPanels()
  initFileMenu()
  initKeyboard()
  initModeSwitcher()
  initZoomControls()
  initUndoRedoButtons()
  initDiagramMode()
  initInspector()
}

function initModeSwitcher() {
  const btns = document.querySelectorAll<HTMLButtonElement>('.mode-btn')
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode as AppMode
      store.setMode(mode)
      updateModeUI(mode)
    })
  })

  store.subscribe(() => {
    updateModeUI(store.get().mode)
  })
}

function updateModeUI(mode: AppMode) {
  const btns = document.querySelectorAll<HTMLButtonElement>('.mode-btn')
  btns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode)
  })

  document.getElementById('app')!.dataset.mode = mode

  const brushSection = document.getElementById('brush-section')!
  const colorSection = document.getElementById('color-section')!
  brushSection.style.display = mode === 'sketch' ? '' : 'none'
  colorSection.style.display = mode === 'sketch' ? '' : 'none'

  const leftPanel = document.getElementById('left-panel')!
  const rightPanel = document.getElementById('right-panel')!
  leftPanel.style.display = mode === 'diagram' ? 'none' : ''
  rightPanel.style.display = mode === 'diagram' ? 'none' : ''

  const promptInput = document.getElementById('prompt-input') as HTMLInputElement
  if (promptInput) {
    promptInput.placeholder = mode === 'diagram'
      ? 'Describe your system architecture...'
      : 'Describe what to draw...'
  }
}

function initZoomControls() {
  document.getElementById('btn-zoom-in')!.addEventListener('click', zoomIn)
  document.getElementById('btn-zoom-out')!.addEventListener('click', zoomOut)
  document.getElementById('btn-zoom-fit')!.addEventListener('click', zoomFit)
}

function initUndoRedoButtons() {
  document.getElementById('btn-undo')!.addEventListener('click', () => {
    if (store.get().mode === 'diagram') diagramUndo()
    else store.undo()
  })
  document.getElementById('btn-redo')!.addEventListener('click', () => {
    if (store.get().mode === 'diagram') diagramRedo()
    else store.redo()
  })
}
// @app-main-init-end

document.addEventListener('DOMContentLoaded', init)
// @app-main-end
