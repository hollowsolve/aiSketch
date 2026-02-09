# Project Specifics

Grep for `@tags` to find implementation details.

> Related: [BRAIN.md](./BRAIN.md) (rules) | [PROJECT_INTENT.md](./PROJECT_INTENT.md) (what) | [BACKLOG.md](./BACKLOG.md) (todo)

---

@types
Scene graph type definitions: Scene, Component, StrokeNode, Brush, StrokePoint, InterpolatedPoint, RenderOptions
File: src/engine/types.ts

---

@spline
Catmull-Rom spline interpolation with tension control. Converts control points to dense interpolated paths with normals.
File: src/engine/spline.ts
Sub-tags:
  interpolateSpline() — main function, returns InterpolatedPoint[]

---

@brush
Brush stamp rendering system. 8 brush types: round, square, pixel, spray, calligraphy, chalk, charcoal, watercolor.
File: src/engine/brush.ts
Sub-tags:
  @brush-render-stroke — renderBrushStroke(), places stamps along interpolated path
  @brush-stamps — individual stamp renderers (drawRoundStamp, drawCharcoalStamp, etc.)
  @brush-utils — path length, distance, color parsing, seeded random

---

@wobble
Hand-drawn effects: tremor, taper, overshoot.
File: src/engine/wobble.ts
Sub-tags:
  applyWobble() — seeded sine-sum noise displacement
  applyTaper() — entry/exit width reduction
  applyOvershoot() — extends past endpoints at low fidelity

---

@renderer
Canvas 2D scene graph renderer. Walks tree, applies transforms, draws strokes.
File: src/engine/renderer.ts
Sub-tags:
  @renderer-collect-strokes — collectStrokes(), flattens tree to sorted stroke list
  @renderer-draw — renderScene(), renderSingleStroke()
  @renderer-utils — hashString()

---

@animator
Layer-ordered animation sequencer. Draws strokes progressively with inter-layer pauses.
File: src/engine/animator.ts
Sub-tags:
  @animator-partial — renderPartialStroke(), progressive stroke reveal
  animateScene() — returns AnimationHandle with cancel/pause/resume

---

@engine-index
Barrel export for all engine modules.
File: src/engine/index.ts

---

@aisketch-entry
Main library entry point. Re-exports engine.
File: src/index.ts

---

@worker-entry
Cloudflare Worker entry. Routes /v1/sketch, /v1/health, and static site assets.
File: worker/index.ts
Env: ANTHROPIC_API_KEY, KV_SESSIONS, ENVIRONMENT, __STATIC_CONTENT
Sub-tags:
  @handle-static-assets — serves site/dist via @cloudflare/kv-asset-handler, SPA fallback to index.html

---

@handle-sketch
POST /v1/sketch handler. Validates request, authenticates API key, rate limits, calls Claude, returns scene graph.
File: worker/routes/sketch.ts
Sub-tags:
  @handle-sketch-auth — API key validation via KV
  @handle-sketch-ratelimit — 30 req/min per key
  @handle-sketch-main — request validation, mode dispatch
  @handle-sketch-batch — non-streaming Claude call, JSON response
  @handle-sketch-stream — SSE streaming via Anthropic stream API
  @handle-sketch-prompt — buildSystemPrompt(), DRAW_INSTRUCTIONS, DESIGN_INSTRUCTIONS
  @handle-sketch-utils — json(), extractJSON()

---

@site-vite-config
Vite config for landing page site.
File: site/vite.config.ts

---

@site-main
Landing page entry point. Initializes hero animation, demo, mode canvases, API tabs, nav scroll.
File: site/src/main.ts
Sub-tags:
  @site-hero-animation — animateScene on hero canvas, loops with IntersectionObserver
  @site-mode-canvases — animates Draw & Design mode comparison canvases
  @site-demo-interaction — demo section: prompt input, mode toggle, preset buttons, scene generation
  @site-api-tabs — API code tab switching and copy button
  @site-nav-scroll — nav background on scroll, mobile menu toggle
  @site-canvas-utils — scaleCanvas() for DPR-aware canvas sizing

---

@site-scenes
Hardcoded demo scenes for the landing page (hero, draw mode, design mode, demo).
File: site/src/scenes.ts
Sub-tags:
  @site-scene-utils — brush/transform helper constructors
  @site-hero-scene — HERO_SCENE: cozy cabin in woods
  @site-draw-mode-scene — DRAW_MODE_SCENE: vintage bicycle with flowers
  @site-design-mode-scene — DESIGN_MODE_SCENE: one bedroom apartment floor plan
  @site-demo-scenes — DEMO_SCENES: lighthouse on cliff (keyed by prompt)

---

@site-css
Landing page styles. Dark theme, Inter + JetBrains Mono fonts.
File: site/src/style.css
Sub-tags:
  @site-css-reset — box-sizing, body defaults
  @site-css-nav — fixed nav, scroll effect, mobile toggle
  @site-css-hero — hero section, gradient text, canvas wrapper
  @site-css-features — feature cards grid
  @site-css-sections — shared section inner, label, title, subtitle
  @site-css-demo — demo container, mode toggle, prompt input, presets
  @site-css-modes — Draw vs Design comparison cards
  @site-css-api — API tab switcher, code blocks, syntax highlighting
  @site-css-pricing — pricing cards grid, featured card glow
  @site-css-footer — footer brand, links, bottom bar

---

@site-nav
Landing page navigation bar.
File: site/index.html (HTML)

---

@site-hero
Landing page hero section with live canvas.
File: site/index.html (HTML)

---

@site-features
Feature cards section.
File: site/index.html (HTML)

---

@site-demo
Interactive demo section.
File: site/index.html (HTML)

---

@site-modes
Draw vs Design comparison section.
File: site/index.html (HTML)

---

@site-api
API code snippets section.
File: site/index.html (HTML)

---

@site-pricing
Pricing section.
File: site/index.html (HTML)

---

@site-footer
Footer section.
File: site/index.html (HTML)
