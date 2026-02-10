# Project Intent

aiSketch is an API that converts natural language prompts into fully editable, semantically structured, hand-drawn-style vector scenes — rendered stroke by stroke in real time.

> Related: [BRAIN.md](./BRAIN.md) (rules) | [PROJECT_SPECIFICS.md](./PROJECT_SPECIFICS.md) (lookup) | [BACKLOG.md](./BACKLOG.md) (todo)
>
> **@tags** point to implementation details. Grep PROJECT_SPECIFICS.md for the tag to find files, APIs, and sub-tags.

---

## Core Systems

### Client Rendering Engine (@engine)
TypeScript Canvas 2D library (~8KB minified). Takes a scene graph JSON, renders it with hand-drawn brush strokes. Supports animated playback (stroke-by-stroke) and static rendering.

Sub-systems:
- Catmull-Rom spline interpolation (@spline)
- Brush stamp system with 8 brush types (@brush)
- Hand tremor, taper, overshoot effects (@wobble)
- Scene graph traversal and rendering (@renderer)
- Layer-ordered animation sequencer (@animator)

### Generation API (@handle-sketch)
Cloudflare Worker at `POST /v1/sketch`. Takes a prompt + mode, calls Claude with a scene-graph system prompt, returns structured JSON. Supports batch (full JSON) and streaming (SSE) responses.

### Two Modes
- **Draw** — Artist mode: composition, mood, visual storytelling. Full brush palette.
- **Design** — Designer mode: spatial logic, proportion, function. Restrained brushes, dimension labels.

Both produce the same .aisketch scene graph format.

---

## API Surface

```
POST /v1/sketch    — Generate a scene graph from a prompt
GET  /v1/health    — Health check
```

---

## Data Flow

```
User prompt + mode
      ↓
POST /v1/sketch (Cloudflare Worker)
      ↓
Claude API (system prompt encodes scene graph format)
      ↓
Scene graph JSON (.aisketch format)
      ↓
Client rendering engine (Canvas 2D)
      ↓
Animated playback → Editable document
```

---

## File Structure Overview

```
aiSketch/
├── src/
│   ├── engine/
│   │   ├── types.ts        — Scene graph interfaces
│   │   ├── spline.ts       — Catmull-Rom interpolation
│   │   ├── brush.ts        — Brush stamp system (8 types)
│   │   ├── wobble.ts       — Hand tremor, taper, overshoot
│   │   ├── renderer.ts     — Canvas 2D scene graph renderer
│   │   ├── animator.ts     — Animation sequencer
│   │   └── index.ts        — Engine barrel export
│   └── index.ts            — Main library entry
├── worker/
│   ├── index.ts            — Worker entry, routing
│   └── routes/
│       └── sketch.ts       — /v1/sketch handler + LLM prompt
├── app/
│   ├── src/
│   │   ├── main.ts          — App entry point
│   │   ├── types.ts         — App type definitions
│   │   ├── state.ts         — Centralized state store
│   │   ├── viewport.ts      — Canvas viewport, pan/zoom, input
│   │   ├── design.ts        — Design mode overlays
│   │   ├── generate.ts      — AI generation flow
│   │   ├── panels.ts        — Side panels (tools, brush, color, layers)
│   │   ├── fileops.ts       — File ops + keyboard shortcuts
│   │   └── style.css        — App styles
│   ├── index.html           — App HTML shell
│   └── vite.config.ts       — Vite config
├── dist/                   — Built client library
├── wrangler.toml           — Cloudflare Worker config
├── package.json
└── tsconfig.json
```
