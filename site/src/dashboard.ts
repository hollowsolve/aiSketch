// @site-dashboard
import { animateScene } from '@engine/index'
import type { AnimationHandle } from '@engine/animator'
import type { Scene } from '@engine/types'
import './dashboard.css'

// @site-dashboard-types
interface DashboardUser {
  email: string
  credits: number
}

interface DashboardApiKey {
  id: string
  name: string
  prefix: string
  credits: number
  createdAt: string
  revoked: boolean
}

interface SavedScene {
  id: string
  prompt: string
  mode: 'draw' | 'design' | 'sketch'
  scene: Scene
  createdAt: number
}

interface DashboardCallbacks {
  onLogout: () => void
  onRefreshSession: () => Promise<{ user: DashboardUser; apiKeys: DashboardApiKey[] } | null>
}
// @site-dashboard-types-end

// @site-dashboard-state
let user: DashboardUser
let apiKeys: DashboardApiKey[] = []
let callbacks: DashboardCallbacks
let scenes: SavedScene[] = []
let activeSceneId: string | null = null
let mode: 'draw' | 'design' | 'sketch' = 'draw'
let generating = false
let animHandle: AnimationHandle | null = null
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
const CANVAS_W = 800
const CANVAS_H = 500
const STORAGE_KEY = 'aisketch_scenes'
// @site-dashboard-state-end

// @site-dashboard-init
export function showDashboard(u: DashboardUser, keys: DashboardApiKey[], cbs: DashboardCallbacks) {
  user = u
  apiKeys = keys
  callbacks = cbs
  scenes = loadHistory()

  document.querySelectorAll('.nav, .hero, .features, .demo, .modes, .api, .pricing, .footer').forEach(el => {
    ;(el as HTMLElement).style.display = 'none'
  })

  let root = document.getElementById('dashboard-root')
  if (!root) {
    root = document.createElement('div')
    root.id = 'dashboard-root'
    document.body.appendChild(root)
  }
  root.classList.remove('hidden')
  document.body.classList.add('dashboard-active')

  render()
  initCanvas()
  bindEvents()

  if (scenes.length > 0) {
    loadScene(scenes[0].id)
  }
}

export function hideDashboard() {
  if (animHandle) animHandle.cancel()
  const root = document.getElementById('dashboard-root')
  if (root) {
    root.classList.add('hidden')
    root.innerHTML = ''
  }
  document.body.classList.remove('dashboard-active')
  document.querySelectorAll('.nav, .hero, .features, .demo, .modes, .api, .pricing, .footer').forEach(el => {
    ;(el as HTMLElement).style.display = ''
  })
  canvas = null
  ctx = null
}
// @site-dashboard-init-end

// @site-dashboard-render
function render() {
  const root = document.getElementById('dashboard-root')!
  root.innerHTML = `
    <div class="db">
      <header class="db-header">
        <a class="db-logo" href="#">
          <span class="db-logo-icon">✏️</span>
          <span class="db-logo-text">aiSketch</span>
        </a>
        <div class="db-header-right">
          <div class="db-credits" id="db-credits">
            <span class="db-credits-num">${user.credits ?? 0}</span> credits
          </div>
          <button class="db-header-btn" id="db-keys-btn">API Keys</button>
          <button class="db-header-btn db-signout" id="db-signout">Sign Out</button>
        </div>
      </header>

      <aside class="db-sidebar">
        <button class="db-new-btn" id="db-new">+ New Scene</button>
        <div class="db-history" id="db-history">
          ${renderHistory()}
        </div>
      </aside>

      <main class="db-main">
        <div class="db-canvas-wrap">
          <div class="db-canvas-container" id="db-canvas-container">
            <canvas id="db-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
            <div class="db-generating hidden" id="db-generating">
              <div class="db-generating-spinner"></div>
              <span>Generating scene...</span>
            </div>
            ${scenes.length === 0 && !activeSceneId ? renderEmptyState() : ''}
          </div>
          <div class="db-canvas-actions" id="db-canvas-actions">
            <button class="db-action-btn" id="db-export-png" title="Export PNG">PNG</button>
            <button class="db-action-btn" id="db-export-json" title="Download .aisketch">JSON</button>
            <div class="db-progress-wrap">
              <div class="db-progress" id="db-progress"></div>
            </div>
          </div>
        </div>

        <div class="db-prompt-bar">
          <div class="db-mode-toggle">
            <button class="db-mode-btn ${mode === 'draw' ? 'active' : ''}" data-mode="draw">Draw</button>
            <button class="db-mode-btn ${mode === 'sketch' ? 'active' : ''}" data-mode="sketch">Sketch</button>
            <button class="db-mode-btn ${mode === 'design' ? 'active' : ''}" data-mode="design">Design</button>
          </div>
          <div class="db-prompt-input-wrap">
            <input type="text" class="db-prompt-input" id="db-prompt" placeholder="Describe a scene..." autofocus />
            <button class="db-send-btn" id="db-send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </main>
    </div>

    <div class="db-keys-overlay hidden" id="db-keys-overlay">
      <div class="db-keys-panel">
        <div class="db-keys-header">
          <h3>API Keys</h3>
          <button class="db-keys-close" id="db-keys-close">&times;</button>
        </div>
        <div class="db-keys-content" id="db-keys-content">
          ${renderKeysPanel()}
        </div>
      </div>
    </div>
  `
}

function renderHistory(): string {
  if (scenes.length === 0) {
    return '<div class="db-history-empty">No scenes yet</div>'
  }
  return scenes.map(s => `
    <div class="db-history-item ${s.id === activeSceneId ? 'active' : ''}" data-id="${s.id}">
      <div class="db-history-prompt">${escapeHtml(truncate(s.prompt, 50))}</div>
      <div class="db-history-meta">
        <span class="db-history-mode db-mode-${s.mode}">${s.mode}</span>
        <span class="db-history-date">${timeAgo(s.createdAt)}</span>
      </div>
      <button class="db-history-delete" data-delete="${s.id}">&times;</button>
    </div>
  `).join('')
}

function renderEmptyState(): string {
  return `
    <div class="db-empty" id="db-empty">
      <div class="db-empty-icon">✏️</div>
      <div class="db-empty-title">Start creating</div>
      <div class="db-empty-desc">Type a prompt below to generate your first hand-drawn scene.</div>
    </div>
  `
}

function renderKeysPanel(): string {
  const activeKeys = apiKeys.filter(k => !k.revoked)
  const keyRows = activeKeys.map(k => `
    <div class="db-key-row">
      <div class="db-key-info">
        <span class="db-key-name">${escapeHtml(k.name)}</span>
        <span class="db-key-prefix">${k.prefix}</span>
      </div>
      <div class="db-key-actions">
        <span class="db-key-credits">${k.credits ?? 0} cr</span>
        <button class="db-key-action" data-fund="${k.id}">+ Fund</button>
        <button class="db-key-action danger" data-revoke="${k.id}">Revoke</button>
      </div>
    </div>
  `).join('')

  return `
    <button class="btn-primary db-create-key" id="db-create-key">+ New Key</button>
    <div id="db-new-key-notice"></div>
    <div class="db-key-list">
      ${keyRows || '<div class="db-history-empty">No API keys yet</div>'}
    </div>
  `
}
// @site-dashboard-render-end

// @site-dashboard-canvas
function initCanvas() {
  canvas = document.getElementById('db-canvas') as HTMLCanvasElement
  if (!canvas) return
  ctx = canvas.getContext('2d')
  if (!ctx) return
  scaleCanvas(canvas, ctx, CANVAS_W, CANVAS_H)
}

function scaleCanvas(c: HTMLCanvasElement, context: CanvasRenderingContext2D, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  c.width = w * dpr
  c.height = h * dpr
  c.style.width = `${w}px`
  c.style.height = `${h}px`
  context.scale(dpr, dpr)
}

function renderSceneOnCanvas(scene: Scene) {
  if (!ctx || !canvas) return
  if (animHandle) animHandle.cancel()
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  const empty = document.getElementById('db-empty')
  if (empty) empty.remove()

  const progress = document.getElementById('db-progress')

  animHandle = animateScene(ctx, scene, {
    wobble: mode === 'design' ? 0.15 : 0.5,
    fidelity: mode === 'design' ? 0.9 : 0.7,
    seed: Math.floor(Math.random() * 10000),
    strokeDuration: 350,
    layerPause: 180,
    onProgress: (p) => {
      if (progress) progress.style.width = `${(p * 100).toFixed(0)}%`
    },
    onComplete: () => {
      if (progress) {
        progress.style.width = '100%'
        setTimeout(() => { progress.style.width = '0%' }, 800)
      }
    },
  })
}
// @site-dashboard-canvas-end

// @site-dashboard-generate
async function handleGenerate() {
  const input = document.getElementById('db-prompt') as HTMLInputElement
  if (!input) return
  const prompt = input.value.trim()
  if (!prompt || generating) return

  generating = true
  const sendBtn = document.getElementById('db-send') as HTMLButtonElement
  const genOverlay = document.getElementById('db-generating')
  if (sendBtn) sendBtn.disabled = true
  if (genOverlay) genOverlay.classList.remove('hidden')

  const empty = document.getElementById('db-empty')
  if (empty) empty.remove()

  try {
    const response = await fetch('/v1/sketch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        prompt,
        mode,
        stream: true,
        canvas: { width: CANVAS_W, height: CANVAS_H },
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' })) as { error?: string }
      throw new Error(err.error || `Generation failed (${response.status})`)
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('text/event-stream') && response.body) {
      const scene = await handleSSEResponse(response)
      if (scene) {
        saveToHistory(prompt, mode, scene)
        renderSceneOnCanvas(scene)
        input.value = ''
      }
    } else {
      const scene = await response.json() as Scene
      saveToHistory(prompt, mode, scene)
      renderSceneOnCanvas(scene)
      input.value = ''
    }

    updateCredits()
  } catch (err) {
    showError((err as Error).message)
  } finally {
    generating = false
    if (sendBtn) sendBtn.disabled = false
    if (genOverlay) genOverlay.classList.add('hidden')
  }
}

async function handleSSEResponse(response: Response): Promise<Scene | null> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let scene: Scene | null = null
  let charCount = 0

  const genOverlay = document.getElementById('db-generating')
  const genLabel = genOverlay?.querySelector('span')
  const progress = document.getElementById('db-progress')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw || raw === '[DONE]') continue

      try {
        const evt = JSON.parse(raw) as Record<string, unknown>
        if (evt.error) {
          showError(evt.error as string)
          return null
        }
        if (evt.text) {
          charCount += (evt.text as string).length
          const expectedChars = mode === 'sketch' ? 20000 : 8000
          const pct = Math.min(charCount / expectedChars, 0.95)
          if (progress) progress.style.width = `${(pct * 100).toFixed(0)}%`
          if (genLabel) genLabel.textContent = `Drawing scene... ${Math.round(pct * 100)}%`
        }
        if (evt.root) {
          scene = evt as unknown as Scene
          if (progress) progress.style.width = '100%'
        }
      } catch {
        // partial JSON
      }
    }
  }

  return scene
}

async function updateCredits() {
  const result = await callbacks.onRefreshSession()
  if (result) {
    user = result.user
    apiKeys = result.apiKeys
    const el = document.getElementById('db-credits')
    if (el) el.innerHTML = `<span class="db-credits-num">${user.credits ?? 0}</span> credits`
  }
}

function showError(msg: string) {
  const bar = document.querySelector('.db-prompt-bar')
  if (!bar) return
  const el = document.createElement('div')
  el.className = 'db-error'
  el.textContent = msg
  bar.appendChild(el)
  setTimeout(() => el.remove(), 4000)
}
// @site-dashboard-generate-end

// @site-dashboard-history
function saveToHistory(prompt: string, m: 'draw' | 'design' | 'sketch', scene: Scene) {
  const saved: SavedScene = {
    id: crypto.randomUUID(),
    prompt,
    mode: m,
    scene,
    createdAt: Date.now(),
  }
  scenes.unshift(saved)
  if (scenes.length > 50) scenes = scenes.slice(0, 50)
  activeSceneId = saved.id
  persistHistory()
  refreshHistory()
}

function loadScene(id: string) {
  const s = scenes.find(x => x.id === id)
  if (!s) return
  activeSceneId = id
  mode = s.mode
  renderSceneOnCanvas(s.scene)
  refreshHistory()
  updateModeButtons()
}

function deleteScene(id: string) {
  scenes = scenes.filter(s => s.id !== id)
  if (activeSceneId === id) {
    activeSceneId = scenes.length > 0 ? scenes[0].id : null
    if (activeSceneId) {
      loadScene(activeSceneId)
    } else if (ctx) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    }
  }
  persistHistory()
  refreshHistory()
}

function refreshHistory() {
  const el = document.getElementById('db-history')
  if (el) el.innerHTML = renderHistory()
  bindHistoryEvents()
}

function updateModeButtons() {
  document.querySelectorAll('.db-mode-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === mode)
  })
}

function persistHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
  } catch { /* quota */ }
}

function loadHistory(): SavedScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as SavedScene[]
  } catch { /* corrupt */ }
  return []
}
// @site-dashboard-history-end

// @site-dashboard-export
function exportPNG() {
  if (!canvas) return
  const link = document.createElement('a')
  link.download = `aisketch-${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function exportJSON() {
  const scene = scenes.find(s => s.id === activeSceneId)
  if (!scene) return
  const blob = new Blob([JSON.stringify(scene.scene, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.download = `${truncate(scene.prompt, 30).replace(/\s+/g, '_')}.aisketch`
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}
// @site-dashboard-export-end

// @site-dashboard-events
function bindEvents() {
  document.getElementById('db-signout')?.addEventListener('click', () => {
    hideDashboard()
    callbacks.onLogout()
  })

  document.getElementById('db-new')?.addEventListener('click', () => {
    activeSceneId = null
    if (ctx) ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    const input = document.getElementById('db-prompt') as HTMLInputElement
    if (input) { input.value = ''; input.focus() }
    refreshHistory()
  })

  document.getElementById('db-send')?.addEventListener('click', handleGenerate)

  document.getElementById('db-prompt')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  })

  document.querySelectorAll('.db-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = ((btn as HTMLElement).dataset.mode || 'draw') as 'draw' | 'design' | 'sketch'
      updateModeButtons()
    })
  })

  document.getElementById('db-export-png')?.addEventListener('click', exportPNG)
  document.getElementById('db-export-json')?.addEventListener('click', exportJSON)

  document.getElementById('db-logo')?.addEventListener('click', (e) => {
    e.preventDefault()
    window.location.hash = ''
  })

  document.getElementById('db-keys-btn')?.addEventListener('click', () => {
    document.getElementById('db-keys-overlay')?.classList.remove('hidden')
    bindKeysEvents()
  })

  document.getElementById('db-keys-close')?.addEventListener('click', () => {
    document.getElementById('db-keys-overlay')?.classList.add('hidden')
  })

  document.getElementById('db-keys-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('db-keys-overlay')) {
      document.getElementById('db-keys-overlay')?.classList.add('hidden')
    }
  })

  bindHistoryEvents()
}

function bindHistoryEvents() {
  document.querySelectorAll('.db-history-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('db-history-delete')) return
      const id = (el as HTMLElement).dataset.id
      if (id) loadScene(id)
    })
  })

  document.querySelectorAll('.db-history-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = (btn as HTMLElement).dataset.delete
      if (id) deleteScene(id)
    })
  })
}

function bindKeysEvents() {
  document.getElementById('db-create-key')?.addEventListener('click', async () => {
    const name = prompt('Key name:') || 'Untitled Key'
    const res = await fetch('/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const data = await res.json() as { key: string }
      const notice = document.getElementById('db-new-key-notice')
      if (notice) {
        notice.innerHTML = `
          <div class="db-new-key-box">
            <span>Copy your key now — it won't be shown again:</span>
            <code>${data.key}</code>
            <button class="db-key-action" id="db-copy-new-key">Copy</button>
          </div>
        `
        document.getElementById('db-copy-new-key')?.addEventListener('click', () => {
          navigator.clipboard.writeText(data.key)
          const btn = document.getElementById('db-copy-new-key')!
          btn.textContent = 'Copied!'
          setTimeout(() => { btn.textContent = 'Copy' }, 2000)
        })
      }
      await updateCredits()
      const content = document.getElementById('db-keys-content')
      if (content) content.innerHTML = renderKeysPanel()
      bindKeysEvents()
    }
  })

  document.querySelectorAll('[data-fund]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const keyId = (btn as HTMLElement).dataset.fund
      const amountStr = prompt('Credits to transfer from account:')
      if (!amountStr) return
      const amount = parseInt(amountStr)
      if (!amount || amount <= 0) return

      const res = await fetch('/v1/auth/keys/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ keyId, amount }),
      })
      if (res.ok) {
        await updateCredits()
        const content = document.getElementById('db-keys-content')
        if (content) content.innerHTML = renderKeysPanel()
        bindKeysEvents()
      } else {
        const data = await res.json() as { error: string }
        alert(data.error)
      }
    })
  })

  document.querySelectorAll('[data-revoke]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const keyId = (btn as HTMLElement).dataset.revoke
      if (!confirm('Revoke this key? This cannot be undone.')) return
      await fetch('/v1/auth/keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ keyId }),
      })
      await updateCredits()
      const content = document.getElementById('db-keys-content')
      if (content) content.innerHTML = renderKeysPanel()
      bindKeysEvents()
    })
  })
}
// @site-dashboard-events-end

// @site-dashboard-utils
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function truncate(s: string, len: number): string {
  return s.length > len ? s.slice(0, len) + '...' : s
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
// @site-dashboard-utils-end
// @site-dashboard-end
