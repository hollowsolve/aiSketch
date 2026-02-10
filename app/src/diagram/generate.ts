// @diagram-generate
import { store } from '../state'
import { computeLayout } from './layout'
import { renderDiagram } from './renderer'
import { applyAndRelayout, clearPositionOverrides, clearDiagramHistory } from './editing'
import type { DiagramGraph, DeltaOp } from './types'

// @diagram-generate-flow
export async function generateDiagram(prompt: string) {
  if (!prompt.trim()) return

  const { diagram } = store.get()
  const isRefine = diagram.graph !== null

  store.set({ generating: true })
  updateDiagramPromptUI(true)

  try {
    const body: Record<string, unknown> = { prompt: prompt.trim(), stream: true }
    if (isRefine && diagram.graph) {
      body.mode = 'refine'
      body.graph = diagram.graph
    }

    const response = await fetch('/v1/diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error((err as { error: string }).error || 'Generation failed')
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('text/event-stream')) {
      await handleDiagramSSE(response, isRefine)
    } else {
      const data = await response.json()
      if (isRefine) {
        applyDeltaOps(data as DeltaOp[])
      } else {
        applyDiagramGraph(data as DiagramGraph)
      }
    }
  } catch (err) {
    console.error('Diagram generation error:', err)
    showDiagramError((err as Error).message)
  } finally {
    store.set({ generating: false })
    updateDiagramPromptUI(false)
  }
}

async function handleDiagramSSE(response: Response, isRefine: boolean) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let pendingEventType = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        pendingEventType = line.slice(7).trim()
        continue
      }
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw || raw === '[DONE]') continue

      const eventType = pendingEventType
      pendingEventType = ''

      try {
        const evt = JSON.parse(raw)

        if (eventType === 'graph') {
          if (isRefine) {
            applyDeltaOps(evt as DeltaOp[])
          } else {
            applyDiagramGraph(evt as DiagramGraph)
          }
        }

        if (eventType === 'error') {
          showDiagramError((evt as { error: string }).error)
          return
        }
      } catch { /* partial JSON */ }
    }
  }
}

function applyDiagramGraph(graph: DiagramGraph) {
  clearPositionOverrides()
  clearDiagramHistory()
  const layout = computeLayout(graph)
  store.setDiagram({ graph, layout })
}

function applyDeltaOps(ops: DeltaOp[]) {
  if (!Array.isArray(ops) || ops.length === 0) return
  applyAndRelayout(ops)
}
// @diagram-generate-flow-end

// @diagram-generate-ui
function updateDiagramPromptUI(generating: boolean) {
  const btn = document.getElementById('prompt-submit')
  const input = document.getElementById('prompt-input') as HTMLInputElement
  if (btn) {
    btn.textContent = generating ? 'Generating...' : 'Generate'
    ;(btn as HTMLButtonElement).disabled = generating
  }
  if (input) input.disabled = generating
}

function showDiagramError(msg: string) {
  const bar = document.getElementById('prompt-bar')
  if (!bar) return
  const errEl = document.createElement('div')
  errEl.className = 'prompt-error'
  errEl.textContent = msg
  bar.appendChild(errEl)
  setTimeout(() => errEl.remove(), 4000)
}
// @diagram-generate-ui-end

// @diagram-generate-export
export function exportDiagramPNG() {
  const { diagram } = store.get()
  if (!diagram.layout) return

  const scale = 2
  const offscreen = document.createElement('canvas')
  offscreen.width = diagram.layout.width * scale
  offscreen.height = diagram.layout.height * scale
  const ctx = offscreen.getContext('2d')!
  ctx.scale(scale, scale)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, diagram.layout.width, diagram.layout.height)

  renderDiagram(ctx, diagram.layout)

  offscreen.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${diagram.graph?.name || 'diagram'}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
// @diagram-generate-export-end
// @diagram-generate-end
