// @site-main
import { animateScene } from '@engine/index'
import type { AnimationHandle } from '@engine/animator'
import type { Scene } from '@engine/types'
import { HERO_SCENE, DRAW_MODE_SCENE, DESIGN_MODE_SCENE, DEMO_SCENES } from './scenes'
import { initAuth } from './auth'
import './style.css'

// @site-hero-animation
function initHero() {
  const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  scaleCanvas(canvas, ctx, 900, 500)

  let handle: AnimationHandle | null = null

  function play() {
    if (handle) handle.cancel()
    ctx!.clearRect(0, 0, 900, 500)
    handle = animateScene(ctx!, HERO_SCENE, {
      wobble: 0.5,
      fidelity: 0.7,
      seed: 42,
      strokeDuration: 350,
      layerPause: 180,
      onComplete: () => {
        setTimeout(play, 6000)
      },
    })
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        play()
        observer.disconnect()
      }
    },
    { threshold: 0.3 }
  )
  observer.observe(canvas)
}
// @site-hero-animation-end

// @site-mode-canvases
function initModeCanvases() {
  const drawCanvas = document.getElementById('mode-draw-canvas') as HTMLCanvasElement | null
  const designCanvas = document.getElementById('mode-design-canvas') as HTMLCanvasElement | null

  if (drawCanvas) {
    const ctx = drawCanvas.getContext('2d')
    if (ctx) {
      scaleCanvas(drawCanvas, ctx, 380, 280)
      let animated = false
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !animated) {
            animated = true
            animateScene(ctx, DRAW_MODE_SCENE, {
              wobble: 0.5,
              fidelity: 0.7,
              seed: 17,
              strokeDuration: 300,
              layerPause: 150,
            })
            observer.disconnect()
          }
        },
        { threshold: 0.3 }
      )
      observer.observe(drawCanvas)
    }
  }

  if (designCanvas) {
    const ctx = designCanvas.getContext('2d')
    if (ctx) {
      scaleCanvas(designCanvas, ctx, 380, 280)
      let animated = false
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !animated) {
            animated = true
            animateScene(ctx, DESIGN_MODE_SCENE, {
              wobble: 0.15,
              fidelity: 0.9,
              seed: 33,
              strokeDuration: 250,
              layerPause: 120,
            })
            observer.disconnect()
          }
        },
        { threshold: 0.3 }
      )
      observer.observe(designCanvas)
    }
  }
}
// @site-mode-canvases-end

// @site-demo-interaction
function initDemo() {
  const canvas = document.getElementById('demo-canvas') as HTMLCanvasElement | null
  const input = document.getElementById('demo-input') as HTMLInputElement | null
  const generateBtn = document.getElementById('demo-generate') as HTMLButtonElement | null
  const progressBar = document.getElementById('demo-progress') as HTMLElement | null
  const presetBtns = document.querySelectorAll('.demo-preset')
  const modeBtns = document.querySelectorAll('.demo-mode-btn')

  if (!canvas || !input || !generateBtn) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  scaleCanvas(canvas, ctx, 800, 500)

  let currentHandle: AnimationHandle | null = null
  let currentMode = 'draw'

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeBtns.forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
      currentMode = (btn as HTMLElement).dataset.mode || 'draw'
    })
  })

  function generateScene() {
    const prompt = input!.value.trim()
    if (!prompt) return

    if (currentHandle) currentHandle.cancel()
    ctx!.clearRect(0, 0, 800, 500)

    const scene = findDemoScene(prompt, currentMode)
    if (!scene) {
      drawPlaceholder(ctx!, prompt)
      return
    }

    if (progressBar) progressBar.style.width = '0%'

    currentHandle = animateScene(ctx!, scene, {
      wobble: currentMode === 'draw' ? 0.5 : 0.15,
      fidelity: currentMode === 'draw' ? 0.7 : 0.9,
      seed: Math.floor(Math.random() * 10000),
      strokeDuration: 350,
      layerPause: 180,
      onProgress: (p) => {
        if (progressBar) progressBar.style.width = `${(p * 100).toFixed(0)}%`
      },
      onComplete: () => {
        if (progressBar) progressBar.style.width = '100%'
        setTimeout(() => {
          if (progressBar) progressBar.style.width = '0%'
        }, 1000)
      },
    })
  }

  generateBtn.addEventListener('click', generateScene)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') generateScene()
  })

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement
      input!.value = el.dataset.prompt || ''
      const mode = el.dataset.mode || 'draw'
      modeBtns.forEach((b) => {
        b.classList.toggle('active', (b as HTMLElement).dataset.mode === mode)
      })
      currentMode = mode
      generateScene()
    })
  })

  generateScene()
}

function findDemoScene(prompt: string, mode: string): Scene | null {
  const key = prompt.toLowerCase()
  for (const [k, v] of Object.entries(DEMO_SCENES)) {
    if (key.includes(k.slice(0, 20).toLowerCase()) || k.toLowerCase().includes(key.slice(0, 20))) {
      return { ...v, mode: mode as 'draw' | 'design' }
    }
  }
  return DEMO_SCENES[Object.keys(DEMO_SCENES)[0]]
    ? { ...DEMO_SCENES[Object.keys(DEMO_SCENES)[0]], mode: mode as 'draw' | 'design' }
    : null
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, prompt: string) {
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fillRect(0, 0, 800, 500)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = '16px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`Generating "${prompt}"...`, 400, 250)
  ctx.font = '13px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillText('(In the live product, this calls the API)', 400, 275)
}
// @site-demo-interaction-end

// @site-api-tabs
function initApiTabs() {
  const tabs = document.querySelectorAll('.api-tab')
  const panels = document.querySelectorAll('.api-panel')

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = (tab as HTMLElement).dataset.tab
      tabs.forEach((t) => t.classList.remove('active'))
      panels.forEach((p) => p.classList.remove('active'))
      tab.classList.add('active')
      document.querySelector(`.api-panel[data-panel="${target}"]`)?.classList.add('active')
    })
  })

  document.querySelectorAll('.code-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const codeBlock = btn.closest('.code-block')?.querySelector('code')
      if (codeBlock) {
        navigator.clipboard.writeText(codeBlock.textContent || '')
        btn.textContent = 'Copied!'
        setTimeout(() => { btn.textContent = 'Copy' }, 2000)
      }
    })
  })
}
// @site-api-tabs-end

// @site-nav-scroll
function initNav() {
  const nav = document.querySelector('.nav')
  if (!nav) return

  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav-scrolled', window.scrollY > 50)
  }, { passive: true })

  const toggle = document.querySelector('.nav-mobile-toggle')
  const links = document.querySelector('.nav-links')
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open')
      toggle.classList.toggle('open')
    })
  }

  document.querySelectorAll('.nav-links a').forEach((a) => {
    a.addEventListener('click', () => {
      links?.classList.remove('open')
      toggle?.classList.remove('open')
    })
  })
}
// @site-nav-scroll-end

// @site-canvas-utils
function scaleCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  logicalW: number,
  logicalH: number
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = logicalW * dpr
  canvas.height = logicalH * dpr
  canvas.style.width = `${logicalW}px`
  canvas.style.height = `${logicalH}px`
  ctx.scale(dpr, dpr)
}
// @site-canvas-utils-end

// @site-init
document.addEventListener('DOMContentLoaded', () => {
  initNav()
  initHero()
  initModeCanvases()
  initDemo()
  initApiTabs()
  initAuth()
})
// @site-init-end
// @site-main-end
