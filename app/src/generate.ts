// @app-generate
import { store } from './state'
import { animateScene, DEFAULT_ANIMATION_OPTIONS } from '@engine/animator'
import { renderSingleStroke, renderSingleFill } from '@engine/renderer'
import { DEFAULT_RENDER_OPTIONS } from '@engine/types'
import { getCtx } from './viewport'
import type { Scene, SceneNode, StrokeNode, FillNode, Component } from '@engine/types'

// @app-generate-flow
export async function generateFromPrompt(prompt: string) {
  if (!prompt.trim()) return
  const { mode } = store.get()
  store.set({ generating: true })
  updatePromptUI(true)

  try {
    const response = await fetch('/v1/sketch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.trim(),
        mode: mode === 'sketch' ? 'draw' : mode,
        stream: true,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error((err as { error: string }).error || 'Generation failed')
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('text/event-stream')) {
      await handleSSEResponse(response)
    } else {
      const scene = await response.json() as Scene
      applyGeneratedScene(scene)
    }
  } catch (err) {
    console.error('Generation error:', err)
    showError((err as Error).message)
  } finally {
    store.set({ generating: false })
    updatePromptUI(false)
  }
}

async function handleSSEResponse(response: Response) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let pendingEventType = ''
  let finalScene: Scene | null = null
  let background: string | undefined
  const ctx = getCtx()
  const opts = { ...DEFAULT_RENDER_OPTIONS }

  store.pushUndo()

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
        const evt = JSON.parse(raw) as Record<string, unknown>

        if (eventType === 'meta') {
          background = evt.background as string | undefined
        }

        if (eventType === 'node') {
          const node = evt as unknown as SceneNode
          const current = store.get().scene
          const updated = structuredClone(current)
          updated.root.children.push(structuredClone(node))
          store.set({ scene: updated })
          renderIncrementalNode(ctx, node, opts, background)
        }

        if (eventType === 'scene') {
          finalScene = evt as unknown as Scene
        }

        if (eventType === 'error') {
          showError(evt.error as string)
          return
        }
      } catch {
        // partial JSON
      }
    }
  }

  if (finalScene) {
    const current = store.get().scene
    const merged = structuredClone(current)
    merged.root.children = [...finalScene.root.children]
    if (finalScene.background) merged.background = finalScene.background
    store.set({ scene: merged })
  }
}

function renderIncrementalNode(ctx: CanvasRenderingContext2D, node: SceneNode, opts: { wobble: number; fidelity: number; seed: number }, bg?: string) {
  if (node.type === 'stroke') {
    const flat = { node: node as StrokeNode, transforms: [] as Component['transform'][], depth: 0 }
    renderSingleStroke(ctx, flat as Parameters<typeof renderSingleStroke>[1], opts)
  } else if (node.type === 'fill') {
    const flat = { node: node as FillNode, transforms: [] as Component['transform'][], depth: 0 }
    renderSingleFill(ctx, flat as Parameters<typeof renderSingleFill>[1], opts, bg)
  } else if (node.type === 'component') {
    const walk = (n: SceneNode) => {
      if (n.type === 'stroke') {
        const flat = { node: n, transforms: [] as Component['transform'][], depth: 0 }
        renderSingleStroke(ctx, flat as Parameters<typeof renderSingleStroke>[1], opts)
      } else if (n.type === 'fill') {
        const flat = { node: n, transforms: [] as Component['transform'][], depth: 0 }
        renderSingleFill(ctx, flat as Parameters<typeof renderSingleFill>[1], opts, bg)
      } else if (n.type === 'component') {
        for (const child of n.children) walk(child)
      }
    }
    walk(node)
  }
}

function applyGeneratedScene(scene: Scene) {
  store.pushUndo()

  const current = store.get().scene
  const merged = structuredClone(current)
  for (const child of scene.root.children) {
    merged.root.children.push(structuredClone(child))
  }
  store.set({ scene: merged })

  const ctx = getCtx()
  animateScene(ctx, merged, {
    ...DEFAULT_RENDER_OPTIONS,
    ...DEFAULT_ANIMATION_OPTIONS,
  })
}
// @app-generate-flow-end

// @app-generate-ui
function updatePromptUI(generating: boolean) {
  const btn = document.getElementById('prompt-submit')
  const input = document.getElementById('prompt-input') as HTMLInputElement
  if (btn) {
    btn.textContent = generating ? 'Generating...' : 'Generate'
    ;(btn as HTMLButtonElement).disabled = generating
  }
  if (input) input.disabled = generating
}

function showError(msg: string) {
  const bar = document.getElementById('prompt-bar')
  if (!bar) return
  const errEl = document.createElement('div')
  errEl.className = 'prompt-error'
  errEl.textContent = msg
  bar.appendChild(errEl)
  setTimeout(() => errEl.remove(), 4000)
}
// @app-generate-ui-end

export function initGenerate() {
  const input = document.getElementById('prompt-input') as HTMLInputElement
  const btn = document.getElementById('prompt-submit') as HTMLButtonElement

  btn.addEventListener('click', () => generateFromPrompt(input.value))
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      generateFromPrompt(input.value)
    }
  })
}
// @app-generate-end
