// @app-diagram-mode
import { store } from './state'
import { generateDiagram, exportDiagramPNG } from './diagram/generate'

// @app-diagram-mode-init
export function initDiagramMode() {
  const input = document.getElementById('prompt-input') as HTMLInputElement
  const btn = document.getElementById('prompt-submit') as HTMLButtonElement

  const originalClick = btn.onclick
  btn.addEventListener('click', () => {
    if (store.get().mode === 'diagram') {
      generateDiagram(input.value)
    }
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && store.get().mode === 'diagram') {
      e.preventDefault()
      e.stopPropagation()
      generateDiagram(input.value)
    }
  })
}
// @app-diagram-mode-init-end

export { exportDiagramPNG }
// @app-diagram-mode-end
