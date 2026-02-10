// @app-main
import './style.css'
import { store } from './state'
import { initViewport, zoomIn, zoomOut, zoomFit } from './viewport'
import { initGenerate } from './generate'
import { initPanels } from './panels'
import { initFileMenu, initKeyboard } from './fileops'
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
}

function initZoomControls() {
  document.getElementById('btn-zoom-in')!.addEventListener('click', zoomIn)
  document.getElementById('btn-zoom-out')!.addEventListener('click', zoomOut)
  document.getElementById('btn-zoom-fit')!.addEventListener('click', zoomFit)
}

function initUndoRedoButtons() {
  document.getElementById('btn-undo')!.addEventListener('click', () => store.undo())
  document.getElementById('btn-redo')!.addEventListener('click', () => store.redo())
}
// @app-main-init-end

document.addEventListener('DOMContentLoaded', init)
// @app-main-end
