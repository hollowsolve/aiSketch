# aiSketch - Brain

> The system's identity. Read once to understand how to behave. Rarely updated.
>
> Related docs: [PROJECT_INTENT.md](./PROJECT_INTENT.md) (what) | [PROJECT_SPECIFICS.md](./PROJECT_SPECIFICS.md) (where) | [BACKLOG.md](./BACKLOG.md) (todo)

---

## Project Context

aiSketch is an API that converts natural language prompts into fully editable, semantically structured, hand-drawn-style vector scenes. It outputs hierarchical scene graphs (not images) — trees of named components containing brush-configured vector strokes. Two modes: Draw (expressive/artistic) and Design (structural/spatial). Client-side rendering engine (Canvas 2D, ~8KB minified). Generation API via Cloudflare Workers calling Anthropic Claude. Part of the Volcanic/Architectonic product suite.

Source: `/Users/noahedery/Desktop/aiSketch/`

---

## Session Scope

When work is outside current scope, add to BACKLOG.md with any context discovered.

---

## Between Tasks

When current task is complete and user hasn't assigned next:
1. Show BACKLOG.md items, mark 1-2 as recommended based on recent work

---

## Rules

These rules govern all code written in this project. Follow them strictly.

### 1. Modularization

- Extract early: If code is logically independent, modularize on first write.
- Engine modules go in `src/engine/`.
- Worker routes go in `worker/routes/`.
- Shared utilities stay co-located or in `src/engine/` / `worker/`.

### 2. File Organization

- Group by feature, not by type.
- Every directory with multiple exports should have an `index.ts` barrel file.

### 3. Naming Conventions

- Components: PascalCase (`AnimationPreview.tsx`)
- Hooks: camelCase with `use` prefix (`useAnimation.ts`)
- Constants: SCREAMING_SNAKE_CASE for arrays/objects, PascalCase for types
- Worker handlers: `handle{Feature}` pattern

### 4. Code Style

- No `any` types. Define proper interfaces in types.ts or co-located.
- Destructure props in function signatures.
- Client library: zero dependencies, Canvas 2D only, target ~20KB gzipped.

### 5. Code Tags

Mark ALL code sections with `// @tag-name` comments. Every component, hook, handler, utility function, and CSS block should be tagged.

Conventions:
- Components: `// @component-name`
- Hooks: `// @use-hook-name`
- Handlers: `// @handle-feature`
- Utility functions: `// @util-name`
- Engine modules: `// @module-name`

Tag everything. No exceptions.

### 6. Finding Code

See [PROCEDURES/FIND_CODE.md](./PROCEDURES/FIND_CODE.md)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Client Library | TypeScript, Canvas 2D API, esbuild |
| API Worker | Cloudflare Workers |
| LLM | Anthropic Claude (claude-sonnet-4-20250514) |
| Sessions/Keys | Cloudflare KV (shared SESSIONS namespace) |
| Auth | API key via X-API-Key header |

---

## Procedures

Read and follow these exactly when triggered:

- Finding code — Before searching, read [FIND_CODE.md](./PROCEDURES/FIND_CODE.md). Use @tags, never search blindly.
- Writing code — When writing/editing, read [WRITE_CODE.md](./PROCEDURES/WRITE_CODE.md). Tag every section, update PROJECT_SPECIFICS immediately.
- Finishing a task — After implementation complete, read [FINISH_TASK.md](./PROCEDURES/FINISH_TASK.md). Build, deploy, commit.
- /audit — User requests cleanup, or session is audit session. Read [AUDIT.md](./PROCEDURES/AUDIT.md).
- /transfer — User ending session. Read [TRANSFER.md](./PROCEDURES/TRANSFER.md).
- /boot — Detected mid-session recovery. Read [BOOT.md](./PROCEDURES/BOOT.md).
