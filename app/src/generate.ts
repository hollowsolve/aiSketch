// @app-generate
import { store } from './state'
import { animateScene, DEFAULT_ANIMATION_OPTIONS } from '@engine/animator'
import { DEFAULT_RENDER_OPTIONS } from '@engine/types'
import { getCtx } from './viewport'
import type { Scene } from '@engine/types'

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
        mode: mode === 'sketch' ? 'draw' : 'design',
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
      const data = await response.json() as { scene: Scene }
      applyGeneratedScene(data.scene)
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

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data) as { scene?: Scene; error?: string }
        if (parsed.error) {
          showError(parsed.error)
          return
        }
        if (parsed.scene) {
          applyGeneratedScene(parsed.scene)
        }
      } catch {
        // partial JSON, continue
      }
    }
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
