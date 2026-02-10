// @app-fileops
import { store, createEmptyScene } from './state'
import { renderScene } from '@engine/renderer'
import { DEFAULT_RENDER_OPTIONS } from '@engine/types'
import type { Scene } from '@engine/types'

// @app-fileops-new
export function newFile() {
  const { mode } = store.get()
  store.set({ scene: createEmptyScene(mode), undoStack: [], redoStack: [] })
}
// @app-fileops-new-end

// @app-fileops-open
export function openFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.aisketch,.json'
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const scene = JSON.parse(text) as Scene
      if (!scene.root || !scene.version) throw new Error('Invalid .aisketch file')
      store.set({
        scene,
        mode: scene.mode === 'design' ? 'design' : 'sketch',
        undoStack: [],
        redoStack: [],
      })
    } catch (err) {
      console.error('Open failed:', err)
    }
  })
  input.click()
}
// @app-fileops-open-end

// @app-fileops-save
export function saveFile() {
  const { scene } = store.get()
  const json = JSON.stringify(scene, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = (scene.name || 'untitled') + '.aisketch'
  a.click()
  URL.revokeObjectURL(url)
}
// @app-fileops-save-end

// @app-fileops-export-png
export function exportPNG() {
  const { scene } = store.get()
  const offscreen = document.createElement('canvas')
  offscreen.width = scene.canvas.width * 2
  offscreen.height = scene.canvas.height * 2
  const ctx = offscreen.getContext('2d')!
  ctx.scale(2, 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, scene.canvas.width, scene.canvas.height)
  renderScene(ctx, scene, DEFAULT_RENDER_OPTIONS)

  offscreen.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (scene.name || 'untitled') + '.png'
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
// @app-fileops-export-png-end

// @app-fileops-menu
let menuVisible = false

export function initFileMenu() {
  const btn = document.getElementById('btn-file')!
  const menu = document.getElementById('file-menu')!

  const items = [
    { label: 'New', action: newFile, shortcut: '⌘N' },
    { label: 'Open...', action: openFile, shortcut: '⌘O' },
    { label: 'Save', action: saveFile, shortcut: '⌘S' },
    { label: '—', action: () => {}, shortcut: '' },
    { label: 'Export PNG', action: exportPNG, shortcut: '⌘⇧E' },
  ]

  menu.innerHTML = ''
  for (const item of items) {
    if (item.label === '—') {
      const sep = document.createElement('div')
      sep.className = 'menu-separator'
      menu.appendChild(sep)
      continue
    }
    const row = document.createElement('button')
    row.className = 'menu-item'
    row.innerHTML = `<span>${item.label}</span><span class="menu-shortcut">${item.shortcut}</span>`
    row.addEventListener('click', () => {
      hideMenu()
      item.action()
    })
    menu.appendChild(row)
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    if (menuVisible) {
      hideMenu()
    } else {
      const rect = btn.getBoundingClientRect()
      menu.style.top = rect.bottom + 4 + 'px'
      menu.style.left = rect.left + 'px'
      menu.classList.remove('hidden')
      menuVisible = true
    }
  })

  document.addEventListener('click', () => {
    if (menuVisible) hideMenu()
  })
}

function hideMenu() {
  document.getElementById('file-menu')?.classList.add('hidden')
  menuVisible = false
}
// @app-fileops-menu-end

// @app-fileops-keyboard
export function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    const meta = e.metaKey || e.ctrlKey

    if (meta && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      store.undo()
    } else if (meta && e.key === 'z' && e.shiftKey) {
      e.preventDefault()
      store.redo()
    } else if (meta && e.key === 's') {
      e.preventDefault()
      saveFile()
    } else if (meta && e.key === 'o') {
      e.preventDefault()
      openFile()
    } else if (meta && e.key === 'n') {
      e.preventDefault()
      newFile()
    } else if (meta && e.shiftKey && e.key === 'e') {
      e.preventDefault()
      exportPNG()
    } else if (e.key === 'v' && !meta) {
      store.setTool('select')
    } else if (e.key === 'b' && !meta) {
      store.setTool('draw')
    } else if (e.key === 'e' && !meta) {
      store.setTool('eraser')
    } else if (e.key === 'h' && !meta) {
      store.setTool('pan')
    } else if (e.key === 'l' && !meta) {
      store.setTool('line')
    } else if (e.key === 'r' && !meta) {
      store.setTool('rect')
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelected()
    }
  })
}

function deleteSelected() {
  const { scene, selection } = store.get()
  if (selection.selectedIds.size === 0) return
  store.pushUndo()

  const newScene = structuredClone(scene)
  removeNodes(newScene.root, selection.selectedIds)
  store.set({
    scene: newScene,
    selection: { selectedIds: new Set(), selectionBox: null },
  })
}

function removeNodes(parent: import('@engine/types').Component, ids: Set<string>) {
  parent.children = parent.children.filter((c) => {
    if (ids.has(c.name)) return false
    if (c.type === 'component') removeNodes(c, ids)
    return true
  })
}
// @app-fileops-keyboard-end
// @app-fileops-end
