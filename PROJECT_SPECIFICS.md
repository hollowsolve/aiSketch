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
Cloudflare Worker entry. Routes /v1/auth/*, /v1/sketch, /v1/health, and static site assets.
File: worker/index.ts
Env: ANTHROPIC_API_KEY, KV_SESSIONS, ENVIRONMENT, __STATIC_CONTENT
Sub-tags:
  @handle-static-assets — serves site/dist via @cloudflare/kv-asset-handler, SPA fallback to index.html

---

@handle-sketch
POST /v1/sketch handler. Validates request, authenticates API key, rate limits, deducts credits, calls Claude, returns scene graph.
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

---

@handle-auth
Auth system: signup, login, logout, session management, API key CRUD, credit management.
File: worker/routes/auth.ts
Sub-tags:
  @handle-auth-types — User, Session, ApiKeyRecord interfaces
  @handle-auth-utils — json(), generateId(), hashPassword(), session cookie helpers, getSession(), getUser()
  @handle-auth-signup — POST /v1/auth/signup, creates user with 50 free credits
  @handle-auth-login — POST /v1/auth/login, password verification, session creation
  @handle-auth-logout — POST /v1/auth/logout, clears session cookie
  @handle-auth-me — GET /v1/auth/me, returns user + API keys
  @handle-auth-apikeys — POST /v1/auth/keys (create), /keys/revoke, /keys/credits (transfer from account)
  @handle-auth-credits — POST /v1/auth/credits, add credits to account
  @handle-auth-deduct — deductCredit(), checks key credits then user credits, used by /v1/sketch
  @handle-auth-router — handleAuth() route dispatcher

---

@site-auth
Auth UI: login, signup, dashboard overlay pages on the landing site.
File: site/src/auth.ts
Sub-tags:
  @site-auth-state — AuthUser, ApiKey interfaces, currentUser state
  @site-auth-api — api() fetch wrapper, checkSession()
  @site-auth-router — initAuth(), hash-based routing, updateNavButton()
  @site-auth-overlay — getOverlay(), hideAuthOverlay()
  @site-auth-login — renderLogin() form
  @site-auth-signup — renderSignup() form
  @site-auth-dashboard — renderDashboard(): credits card, API keys list, create/revoke/fund keys

---

@site-auth-css
Auth + dashboard styles. Dark theme consistent with landing page.
File: site/src/auth.css
Sub-tags:
  @site-auth-css-overlay — fixed overlay with backdrop blur
  @site-auth-css-card — auth card, close button, title, subtitle
  @site-auth-css-form — form fields, inputs, error, submit button, switch link
  @site-auth-css-dashboard — credits card, API key rows, actions, new key notice

---

@app-vite-config
Vite config for web app. Aliases @engine to ../src/engine.
File: app/vite.config.ts

---

@app-types
App-level type definitions: AppMode, ToolType, ViewportState, SelectionState, DrawState, DesignConfig, LayerInfo, AppState.
File: app/src/types.ts

---

@app-state
Centralized app state store with subscribe/notify pattern.
File: app/src/state.ts
Sub-tags:
  @app-state-defaults — DEFAULT_DESIGN_CONFIG, createEmptyScene(), DEFAULT_LAYERS
  @app-state-store — Store class: get/set/subscribe, setMode, setTool, setViewport, pushUndo, undo, redo

---

@app-viewport
Canvas viewport: rendering, pan/zoom, pointer input routing, drawing, selection, line/rect tools.
File: app/src/viewport.ts
Sub-tags:
  @app-viewport-init — canvas setup, resize, event listeners, DPR handling
  @app-viewport-render — render loop: background grid, scene rendering, selection box overlay
  @app-viewport-input — pointer event routing: pan, draw, select, line, rect
  @app-viewport-draw-stroke — freehand stroke capture: start/continue/finish, screenToScene conversion
  @app-viewport-selection — click hit test + drag box selection, collectHitsInBox
  @app-viewport-line-tool — line tool: snap-to-grid, commit as 2-point stroke
  @app-viewport-rect-tool — rectangle tool: 4 stroke sides as component
  @app-viewport-snap — snapToGrid() for design mode
  @app-viewport-zoom-controls — zoomIn, zoomOut, zoomFit, updateZoomDisplay

---

@app-design
Design mode overlays: sheet border, title block, scale bar, dimensions, annotations, zone labels.
File: app/src/design.ts
Sub-tags:
  @app-design-overlays — renderDesignOverlays() entry point
  @app-design-sheet-border — double-line sheet border with margins
  @app-design-title-block — title block with project name, scale, sheet, date, revision
  @app-design-scale-bar — alternating fill scale bar with real-unit labels
  @app-design-dimensions — auto dimension lines on components with designMeta.area
  @app-design-annotations — annotation labels from annotation-* named components
  @app-design-zone-labels — room type + area labels with translucent zone fills
  @app-design-utils — computeBBox() for component bounding boxes

---

@app-generate
AI generation flow: prompt submission, SSE streaming, scene merging with animation.
File: app/src/generate.ts
Sub-tags:
  @app-generate-flow — generateFromPrompt(), handleSSEResponse(), applyGeneratedScene()
  @app-generate-ui — updatePromptUI(), showError()

---

@app-panels
Side panel UI: tool grid, brush picker, color picker, layer list, properties panel.
File: app/src/panels.ts
Sub-tags:
  @app-panels-tools — SKETCH_TOOLS, DESIGN_TOOLS, renderToolGrid()
  @app-panels-brush — brush type selector, size/opacity/hardness sliders
  @app-panels-color — 15-color palette grid + custom color input
  @app-panels-layers — layer list with visibility/lock toggles, addLayer()
  @app-panels-properties — design config (scale, grid, snap) + selection info
  @app-panels-init — initPanels() wires store subscriptions

---

@app-fileops
File operations and keyboard shortcuts.
File: app/src/fileops.ts
Sub-tags:
  @app-fileops-new — newFile()
  @app-fileops-open — openFile() via file input, parses .aisketch JSON
  @app-fileops-save — saveFile() as .aisketch JSON download
  @app-fileops-export-png — exportPNG() via offscreen canvas at 2x
  @app-fileops-menu — file dropdown menu with keyboard shortcut labels
  @app-fileops-keyboard — keyboard shortcuts: undo/redo, save/open/new, tool hotkeys, delete selected

---

@app-main
App entry point. Initializes all modules, mode switcher, zoom controls, undo/redo buttons.
File: app/src/main.ts
Sub-tags:
  @app-main-init — init(), initModeSwitcher(), updateModeUI(), initZoomControls(), initUndoRedoButtons()

---

@app-css
App styles. Light theme, Inter font.
File: app/src/style.css
Sub-tags:
  @app-css-reset — box-sizing, body defaults, font smoothing
  @app-css-layout — app flex column, workspace flex row, canvas area
  @app-css-toolbar — top toolbar: logo, mode switcher, icon buttons, divider
  @app-css-panels — side panels: width, sections, headers, buttons
  @app-css-tools — tool grid: 4-column grid, active/hover states
  @app-css-brush — brush type row, slider rows (label + range + value)
  @app-css-color — color palette grid, custom color input, hex label
  @app-css-layers — layer rows: visibility, lock, name
  @app-css-properties — property rows: label + select/checkbox
  @app-css-prompt — floating prompt bar: input + submit, error toast
  @app-css-zoom — zoom controls: +/−/fit buttons, zoom level label
  @app-css-menu — dropdown menu: items, shortcuts, separators
