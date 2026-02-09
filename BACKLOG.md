# Backlog

Pending work. Check off when done. Add context as you discover it.

> Related: [BRAIN.md](./BRAIN.md) (rules) | [PROJECT_INTENT.md](./PROJECT_INTENT.md) (what)

---

## Infrastructure

- [x] Project setup (TypeScript, esbuild, wrangler) — Session 001
- [x] Knowledge architecture (BRAIN, PROJECT_INTENT, PROJECT_SPECIFICS, BACKLOG, PROCEDURES) — Session 001
- [ ] Deploy worker to Cloudflare (needs ANTHROPIC_API_KEY secret)
- [ ] Set up API key provisioning system
- [ ] Set up domain routing (e.g., api.aisketch.dev or aisketch.volcanic.dev)
- [x] Landing page / website at aisketch.app — Session 002
- [x] Static site serving via @cloudflare/kv-asset-handler — Session 002
- [x] Animator perf fix: OffscreenCanvas caching for completed strokes — Session 002

## Rendering Engine

- [x] types.ts — Scene graph type definitions — Session 001
- [x] spline.ts — Catmull-Rom interpolation — Session 001
- [x] brush.ts — Brush stamp system (8 types) — Session 001
- [x] wobble.ts — Hand tremor, taper, overshoot — Session 001
- [x] renderer.ts — Canvas 2D scene graph renderer — Session 001
- [x] animator.ts — Layer-ordered animation sequencer — Session 001

## Generation API

- [x] worker/index.ts — Worker entry, routing — Session 001
- [x] worker/routes/sketch.ts — /v1/sketch handler + LLM prompt + SSE — Session 001
- [ ] Tune system prompt for higher quality scene graphs
- [ ] Add retry logic for malformed LLM JSON responses
- [ ] Token usage tracking / cost estimation per generation

## Web App (next priority)

Build as web app first (app/ directory, Vite + vanilla TS), wrap native later (Tauri/Electron).

### Sketch Mode (freehand creative)
- [ ] App shell — mode switcher (Sketch/Design), canvas viewport, toolbar, panels
- [ ] Canvas viewport — pan, zoom, infinite canvas with engine rendering
- [ ] AI generation flow — prompt bar, API call, streaming, animation onto canvas
- [ ] Freehand drawing — pointer input → stroke capture → live preview → commit to scene graph
- [ ] Selection + transforms — hit testing, selection box, move/scale/rotate handles
- [ ] Undo/redo — command pattern on scene graph mutations
- [ ] File operations — new, open, save (.aisketch JSON), export PNG
- [ ] Layer panel, brush picker, color picker

### Design Mode (professional design sheets)
- [ ] Dimension lines with auto-calculated real measurements
- [ ] Scale system (1:50, 1:100, etc.) with scale bar
- [ ] Grid/snap system with configurable spacing
- [ ] Zone fills (rooms, areas) with labels and area calculations
- [ ] Constraint system (walls connect, doors snap to walls)
- [ ] Annotation system (callouts, notes, specifications)
- [ ] Sheet border with title block (project name, scale, date, revision)
- [ ] Layer system: structure, dimensions, annotations, furniture, zones

## Editor (Phase 2)

- [ ] Hit testing (point-in-stroke, point-in-component-bbox)
- [ ] Selection system (single stroke, component, multi-select)
- [ ] Transform handles (move, scale, rotate)
- [ ] Reparenting / tree manipulation

## Exports (Phase 3)

- [ ] Static SVG export
- [ ] PNG export (canvas toBlob)
- [ ] Animated SVG export
- [ ] Flat stroke JSON export
- [ ] Lottie export

## Docs

- [ ] API reference docs
- [ ] .aisketch format spec
- [ ] Client library usage guide
- [ ] Docs site at volcanic.dev/docs/aisketch
