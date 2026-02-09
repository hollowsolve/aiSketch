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
Cloudflare Worker entry. Routes /v1/sketch and /v1/health.
File: worker/index.ts
Env: ANTHROPIC_API_KEY, KV_SESSIONS, ENVIRONMENT

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
