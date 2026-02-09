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

## Design Mode Extensions (Phase 4)

- [ ] Constraint-aware editing (walls connected, doors on walls)
- [ ] Dimension stroke type
- [ ] Label stroke type
- [ ] Zone-fill stroke type

## Docs

- [ ] API reference docs
- [ ] .aisketch format spec
- [ ] Client library usage guide
- [ ] Docs site at volcanic.dev/docs/aisketch
