# Backlog

Pending work. Check off when done. Add context as you discover it.

> Related: [BRAIN.md](./BRAIN.md) (rules) | [PROJECT_INTENT.md](./PROJECT_INTENT.md) (what)

---

## Infrastructure

- [x] Project setup (TypeScript, esbuild, wrangler) — Session 001
- [x] Knowledge architecture (BRAIN, PROJECT_INTENT, PROJECT_SPECIFICS, BACKLOG, PROCEDURES) — Session 001
- [x] Deploy worker to Cloudflare — Session 001, updated Session 004
- [x] Set up API key provisioning system — Session 003
- [x] Auth system (passwordless email codes via Resend, sessions, credits, API key CRUD) — Session 003
- [x] Dashboard UI (account credits, API keys, create/revoke/fund) — Session 003
- [x] Credit deduction on /v1/sketch (key credits → account credits fallback) — Session 003
- [ ] Set up domain routing (e.g., api.aisketch.dev or aisketch.volcanic.dev)
- [x] Set RESEND_API_KEY secret on Cloudflare Worker — Session 004
- [x] Deploy + test full auth flow (email code → dashboard → API keys) — Session 004
- [x] Full-page dashboard with prompt-to-scene generation, canvas rendering, scene history — Session 004
- [x] Session-based auth for /v1/sketch (dashboard users generate without API key) — Session 004
- [ ] Payment integration (Stripe) for credit purchases
- [x] Landing page / website at aisketch.app — Session 002
- [x] Static site serving via @cloudflare/kv-asset-handler — Session 002
- [x] Animator perf fix: OffscreenCanvas caching for completed strokes — Session 002

## Rendering Engine

- [x] types.ts — Scene graph type definitions — Session 001, FillNode + background Session 004, LLM-optimized format Session 005
- [x] styles.ts — Style preset resolver (19 named styles → brush configs) — Session 005
- [x] spline.ts — Catmull-Rom interpolation — Session 001
- [x] brush.ts — Brush stamp system (8 types) + color support — Session 001, color Session 004
- [x] wobble.ts — Hand tremor, taper, overshoot — Session 001
- [x] renderer.ts — Canvas 2D scene graph renderer + fill rendering + background — Session 001, fills Session 004, style resolution Session 005
- [x] animator.ts — Layer-ordered animation sequencer + fill fade-in — Session 001, fills Session 004, compact points Session 005

## Generation API

- [x] worker/index.ts — Worker entry, routing — Session 001
- [x] worker/routes/sketch.ts — /v1/sketch handler + LLM prompt + SSE — Session 001
- [x] Tune system prompt for higher quality scene graphs — Session 004 (fills + strokes workflow, color, background)
- [x] LLM-optimized compact format: style presets + [x,y] tuple points — Session 005 (~60% token reduction per scene)
- [x] Artist-quality depth system: 3-plane depth (bg/mid/fg), 5 new expressive styles (gesture, underdrawing, crosshatch, highlight, scumble), compositional prompt rewrite — Session 005
- [x] Sketch mode: pure brushwork, no fills, 80-130 strokes, 5-pass mark-making system (gesture→contour→value→detail→accent), 32K max tokens — Session 005
- [x] True incremental streaming: stream Claude tokens to client, incrementally parse JSON, render each stroke/fill as it completes (replaces fake progress bar) — Session 005
- [x] Occlusion system: foreground fills erase background lines behind them (destination-out composite) — Session 005
- [x] Upgraded to Opus 4.6 model for higher quality scene generation — Session 005
- [x] Increased detail: 32K tokens, richer stroke/fill counts, 3-15 points per stroke — Session 005
- [x] Spatial distribution: prompts enforce full-canvas usage, subjects scaled to 40-60% of canvas — Session 005
- [x] Artistic vision block: LLM outputs feeling, references, keyChallenge, successCriteria, avoidPitfalls before planning — forces domain expertise engagement before geometry. Draw + sketch modes. Vision SSE event for streaming. — Session 006
- [x] Section-by-section composition: each object is a self-contained component (fills+strokes together), drawn completely before moving to the next, rendered back-to-front. Per-section stroke budgets (bg 2-4, supporting 3-8, focal 8-20, finishing 3-6). Replaced interleaved pass system that caused incoherent anatomy. Draw mode: 10-20 fills + 30-60 strokes. Sketch mode: 40-80 strokes. — Session 006
- [ ] Add retry logic for malformed LLM JSON responses
- [ ] Token usage tracking / cost estimation per generation

## Web App (next priority)

Build as web app first (app/ directory, Vite + vanilla TS), wrap native later (Tauri/Electron).

### Sketch Mode (freehand creative)
- [x] App shell — mode switcher (Sketch/Design), canvas viewport, toolbar, panels — Session 003
- [x] Canvas viewport — pan, zoom, infinite canvas with engine rendering — Session 003
- [x] AI generation flow — prompt bar, API call, streaming, animation onto canvas — Session 003
- [x] Freehand drawing — pointer input → stroke capture → live preview → commit to scene graph — Session 003
- [x] Selection + transforms — hit testing, selection box, move/scale/rotate handles — Session 003
- [x] Undo/redo — command pattern on scene graph mutations — Session 003
- [x] File operations — new, open, save (.aisketch JSON), export PNG — Session 003
- [x] Layer panel, style picker (19 presets), color picker — Session 003, style presets Session 005, depth styles Session 005

### Design Mode (professional design sheets)
- [x] Dimension lines with auto-calculated real measurements — Session 003
- [x] Scale system (1:50, 1:100, etc.) with scale bar — Session 003
- [x] Grid/snap system with configurable spacing — Session 003
- [x] Zone fills (rooms, areas) with labels and area calculations — Session 003
- [ ] Constraint system (walls connect, doors snap to walls)
- [x] Annotation system (callouts, notes, specifications) — Session 003
- [x] Sheet border with title block (project name, scale, date, revision) — Session 003
- [x] Layer system: structure, dimensions, annotations, furniture, zones — Session 003

### Diagram Mode (AI-first engineering diagrams) — specced Session 006
Build as new `'diagram'` mode, separate from sketch/design. AI-first architectural diagram editor.
- [x] Phase 1: Generate + View + Export — new mode, semantic graph AI prompt, dagre layout engine, diagram renderer (typed shapes, routed links, labels, groups — separate pipeline from sketch engine), canvas viewport, prompt bar, PNG export — Session 007
- [x] Phase 2: Edit + Refine — select/drag nodes, inspector panel, conversational refinement via delta operations (addNode/removeNode/addLink/etc., not full replacement), undo/redo command stack, type-changing in inspector — Session 007
- [ ] Phase 3: Depth + Flow — composite nodes with lazy sub-diagram generation, drill-in/breadcrumb navigation, cross-boundary port rendering, AI-generated flows from prompts, flow display (numbered badges, color overlay, animated pulse), click-to-trace manual flow creation
- [ ] Phase 4: Power — tag-based Views (semantic filtering), Kit customization, SVG export, structured JSON export
Core abstractions: Node (typed: service/database/queue/etc.), Link (typed: sync/async/data/event), Group (typed: boundary/VPC/team), Depth (lazy composite nodes + ports), Flow (ordered path traversal), Note (metadata on any element), View (tag-based semantic filter), Kit (type system + visual rules). Data model: semantic layer (AI generates, no positions) + visual layer (layout engine computes positions/routes). Delta operations for conversational refinement preserving manual edits.

## Editor (Phase 2)

- [x] Hit testing (point-in-stroke, point-in-component-bbox) — Session 003
- [x] Selection system (single stroke, component, multi-select) — Session 003
- [ ] Transform handles (move, scale, rotate) — drag handles for selected items
- [ ] Reparenting / tree manipulation

## Exports (Phase 3)

- [ ] Static SVG export
- [x] PNG export (canvas toBlob) — Session 003
- [ ] Animated SVG export
- [ ] Flat stroke JSON export
- [ ] Lottie export

## Docs

- [ ] API reference docs
- [ ] .aisketch format spec
- [ ] Client library usage guide
- [ ] Docs site at volcanic.dev/docs/aisketch
