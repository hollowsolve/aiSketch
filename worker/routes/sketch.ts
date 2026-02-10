// @handle-sketch
import type { Env } from '../index'
import { deductCredit, getSession, deductAccountCredit } from './auth'

interface SketchRequest {
  prompt: string
  mode: 'draw' | 'design' | 'sketch'
  stream?: boolean
  canvas?: { width: number; height: number }
  fidelity?: number
  wobble?: number
}

// @handle-sketch-auth
async function authenticateRequest(request: Request, env: Env): Promise<{ valid: boolean; keyId: string; email?: string; viaSession?: boolean; error?: string }> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')

  if (apiKey) {
    const keyData = await env.KV_SESSIONS.get(`apikey:${apiKey}`)
    if (!keyData) {
      return { valid: false, keyId: '', error: 'Invalid API key' }
    }

    const key = JSON.parse(keyData)
    if (key.revoked) {
      return { valid: false, keyId: '', error: 'API key has been revoked' }
    }

    return { valid: true, keyId: key.id || apiKey.slice(0, 8) }
  }

  const session = await getSession(env, request)
  if (session) {
    return { valid: true, keyId: `session:${session.email}`, email: session.email, viaSession: true }
  }

  return { valid: false, keyId: '', error: 'API key required. Pass via X-API-Key header or Authorization: Bearer <key>' }
}
// @handle-sketch-auth-end

// @handle-sketch-ratelimit
async function checkRateLimit(env: Env, keyId: string): Promise<boolean> {
  const key = `ratelimit:${keyId}`
  const window = 60
  const limit = 30

  const data = await env.KV_SESSIONS.get(key, { type: 'json' }) as { count: number; start: number } | null

  const now = Math.floor(Date.now() / 1000)

  if (!data || now - data.start >= window) {
    await env.KV_SESSIONS.put(key, JSON.stringify({ count: 1, start: now }), { expirationTtl: window * 2 })
    return true
  }

  if (data.count >= limit) return false

  await env.KV_SESSIONS.put(key, JSON.stringify({ count: data.count + 1, start: data.start }), { expirationTtl: window * 2 })
  return true
}
// @handle-sketch-ratelimit-end

// @handle-sketch-main
export async function handleSketch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const auth = await authenticateRequest(request, env)
  if (!auth.valid) {
    return json({ error: auth.error }, 401)
  }

  if (!await checkRateLimit(env, auth.keyId)) {
    return json({ error: 'Rate limit exceeded. Max 30 requests per minute.' }, 429)
  }

  let creditResult: { ok: boolean; error?: string }
  if (auth.viaSession && auth.email) {
    creditResult = await deductAccountCredit(env, auth.email)
  } else {
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '') || ''
    creditResult = await deductCredit(env, apiKey)
  }
  if (!creditResult.ok) {
    return json({ error: creditResult.error || 'No credits remaining' }, 402)
  }

  let body: SketchRequest
  try {
    body = await request.json() as SketchRequest
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.prompt || typeof body.prompt !== 'string') {
    return json({ error: 'prompt is required' }, 400)
  }

  if (body.mode && body.mode !== 'draw' && body.mode !== 'design' && body.mode !== 'sketch') {
    return json({ error: 'mode must be "draw", "design", or "sketch"' }, 400)
  }

  const mode = body.mode || 'draw'
  const canvas = body.canvas || { width: 800, height: 600 }
  const stream = body.stream ?? false

  const systemPrompt = buildSystemPrompt(mode, canvas, body.fidelity, body.wobble)
  const userPrompt = body.prompt

  if (stream) {
    return streamResponse(env, systemPrompt, userPrompt, mode, canvas)
  }

  return batchResponse(env, systemPrompt, userPrompt, mode, canvas)
}
// @handle-sketch-main-end

// @handle-sketch-batch
async function batchResponse(
  env: Env,
  systemPrompt: string,
  userPrompt: string,
  mode: string,
  canvas: { width: number; height: number }
): Promise<Response> {
  const maxTokens = mode === 'design' ? 32768 : 64000
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Anthropic error:', err)
    return json({ error: 'Generation failed' }, 502)
  }

  const data = await response.json() as { content?: Array<{ text?: string }> }
  const text = data.content?.[0]?.text || ''

  let scene
  try {
    scene = extractJSON(text)
  } catch (e) {
    console.error('Failed to parse scene graph:', text.slice(0, 500))
    return json({ error: 'Failed to parse scene graph from LLM response' }, 500)
  }

  scene.mode = mode
  scene.canvas = canvas
  scene.version = '0.1.0'

  return json(scene)
}
// @handle-sketch-batch-end

// @handle-sketch-stream
async function streamResponse(
  env: Env,
  systemPrompt: string,
  userPrompt: string,
  mode: string,
  canvas: { width: number; height: number }
): Promise<Response> {
  const maxTokens = mode === 'design' ? 32768 : 64000
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok || !response.body) {
    return json({ error: 'Generation failed' }, 502)
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const sendEvent = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const pumpStream = async () => {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    let metaSent = false

    const parser = createIncrementalParser(
      (node) => { sendEvent('node', node) },
      (meta) => {
        if (!metaSent) {
          metaSent = true
          sendEvent('meta', { ...meta, mode, canvas, version: '0.1.0' })
        }
      }
    )

    try {
      await sendEvent('start', { mode, canvas, version: '0.1.0' })

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullText += event.delta.text
              parser.feed(event.delta.text)
            }
          } catch {
            // skip unparseable lines
          }
        }
      }

      let scene
      try {
        scene = extractJSON(fullText)
        scene.mode = mode
        scene.canvas = canvas
        scene.version = '0.1.0'
        await sendEvent('scene', scene)
      } catch {
        await sendEvent('error', { error: 'Failed to parse scene graph' })
      }

      await sendEvent('done', {})
    } catch (e) {
      await sendEvent('error', { error: 'Stream interrupted' })
    } finally {
      await writer.close()
    }
  }

  pumpStream()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
// @handle-sketch-stream-end

// @handle-sketch-incremental-parser
function createIncrementalParser(
  onNode: (node: Record<string, unknown>) => void,
  onMeta: (meta: { name?: string; background?: string }) => void
) {
  let text = ''
  let inChildren = false
  let childDepth = 0
  let childStart = -1
  let inString = false
  let escaped = false
  let scanPos = 0
  let metaExtracted = false

  function tryExtractMeta() {
    if (metaExtracted) return
    const bgMatch = text.match(/"background"\s*:\s*"([^"]*)"/)
    const nameMatch = text.match(/"name"\s*:\s*"([^"]*)"/)
    if (bgMatch) {
      metaExtracted = true
      onMeta({ name: nameMatch?.[1], background: bgMatch[1] })
    }
  }

  return {
    feed(chunk: string) {
      text += chunk

      tryExtractMeta()

      if (!inChildren) {
        const marker = '"children"'
        const idx = text.indexOf(marker, Math.max(0, scanPos - marker.length))
        if (idx === -1) {
          scanPos = text.length
          return
        }
        const bracketIdx = text.indexOf('[', idx + marker.length)
        if (bracketIdx === -1) {
          scanPos = idx + marker.length
          return
        }
        inChildren = true
        scanPos = bracketIdx + 1
      }

      for (let i = scanPos; i < text.length; i++) {
        const ch = text[i]

        if (escaped) {
          escaped = false
          continue
        }

        if (ch === '\\' && inString) {
          escaped = true
          continue
        }

        if (ch === '"') {
          inString = !inString
          continue
        }

        if (inString) continue

        if (ch === '{') {
          if (childDepth === 0) {
            childStart = i
          }
          childDepth++
        } else if (ch === '}') {
          childDepth--
          if (childDepth === 0 && childStart !== -1) {
            const jsonStr = text.slice(childStart, i + 1)
            try {
              const node = JSON.parse(jsonStr) as Record<string, unknown>
              onNode(node)
            } catch {
              // incomplete or malformed child, skip
            }
            childStart = -1
          }
        } else if (ch === ']' && childDepth === 0) {
          inChildren = false
          const nextChildren = text.indexOf('"children"', i + 1)
          if (nextChildren !== -1) {
            const nextBracket = text.indexOf('[', nextChildren + 10)
            if (nextBracket !== -1) {
              inChildren = true
              scanPos = nextBracket + 1
              i = nextBracket
              continue
            }
          }
          scanPos = text.length
          return
        }
      }

      scanPos = text.length
    },
  }
}
// @handle-sketch-incremental-parser-end

// @handle-sketch-prompt
function buildSystemPrompt(
  mode: 'draw' | 'design' | 'sketch',
  canvas: { width: number; height: number },
  fidelity?: number,
  wobble?: number
): string {
  const f = fidelity ?? 0.7
  const w = wobble ?? (mode === 'design' ? 0.2 : 0.5)

  if (mode === 'sketch') {
    return buildSketchPrompt(canvas, f, w)
  }

  const modeInstructions = mode === 'draw' ? DRAW_INSTRUCTIONS : DESIGN_INSTRUCTIONS

  return `You are aiSketch — a skilled artist who sketches with real depth, composition, and atmosphere. Convert prompts into hand-drawn vector scenes as JSON.

Canvas: ${canvas.width}x${canvas.height} | Mode: ${mode} | Fidelity: ${f} | Wobble: ${w}
${modeInstructions}

Output ONLY valid JSON, no markdown/code fences.

## Scene structure — ALWAYS include "plan" before "root"
{
  "name": "scene name",
  "background": "#faf8f4",
  "plan": [
    "bg: warm sunset sky gradient — 3-4 overlapping fills, layered orange-to-pink-to-purple",
    "bg: distant mountains — 3 fills (desaturated blue-gray) at different depths, outline-fine ridgelines with multiple strokes",
    "bg: atmospheric haze — 2-3 scumble/wash strokes across horizon, layered",
    "bg: distant trees — soft silhouette fill, outline-fine suggestion strokes",
    "mid: rolling hills — 4-5 green fills with overlapping contours, light/shadow variants",
    "mid: old barn — body fill, roof fill, shadow fill on right side, lit wall fill",
    "mid: barn outlines — 3-4 outline strokes per wall (overlapping, searching lines), outline-bold roof edge",
    "mid: barn details — detail windows (multiple strokes each), door, weathervane, wood grain texture strokes",
    "mid: barn shading — 8-12 hatching strokes on shadow side, crosshatch bank under eaves, shading on walls",
    "mid: barn textures — texture strokes for wood siding, chalk marks for wear",
    "mid: fence line — outline-fine posts (2-3 strokes each) receding into distance, wire strokes between",
    "mid: path/ground — fill for path, hatching for ground shadows, texture for dirt",
    "fg: tall grass — 10-15 gesture strokes at different angles, heavy weight, layered",
    "fg: wildflowers — soft marks with multiple colors, scattered clusters",
    "fg: foreground rock — accent stroke, bold outline, hatching for volume, texture for surface",
    "fg: ground detail — crosshatch shadows, fallen leaves, small stones",
    "finish: underdrawing showing through barn construction lines",
    "finish: highlight on barn roof, lit grass edges, fence post tops",
    "finish: scumble dust haze near ground, atmospheric wash over distance"
  ],
  "root": {
    "name": "root", "type": "component",
    "transform": {"origin":[0,0],"position":[0,0],"scale":[1,1],"rotation":0},
    "children": []
  }
}

The "plan" array is CRITICAL. Before drawing ANYTHING, list EVERY element you will create — organized by depth plane (bg/mid/fg/finish). Be specific: name the object, its type (fill/stroke), its style, and its purpose. Plan MANY elements — a good scene has 30-60 fills and 80-150 strokes. Each object needs multiple strokes (outline + shading + detail + texture). Then create ALL of them in "root". Nothing in the plan should be missing from the scene.

## Fill node — colored closed shape:
{"name":"sky","type":"fill","layer":0,"color":"#87CEEB","opacity":0.6,"points":[[0,0],[${canvas.width},0],[${canvas.width},${Math.round(canvas.height * 0.5)}],[0,${Math.round(canvas.height * 0.55)}]]}

Points are [x,y] pairs. 4-20 points. More points = more organic shape. Engine auto-closes and splines into hand-drawn curves.

## Stroke node — brush path:
{"name":"trunk","type":"stroke","layer":2,"style":"outline","color":"#3d2b1f","points":[[200,350],[198,280],[195,220]],"weight":1.2}

Points are [x,y] pairs. 3-15 points per stroke (more points = smoother, more detailed paths). "style" = preset name. "weight" scales thickness (default 1).

## Styles — organized by artistic purpose:

### Structure (define forms)
outline — standard contour lines, medium weight
outline-bold — thick structural lines, heavy emphasis
outline-fine — thin precise lines, far objects or delicate forms
detail — small features: windows, eyes, buttons, hardware

### Expression (energy and feeling)
sketch — loose, searching freehand lines
gesture — fast, energetic marks capturing movement and flow
underdrawing — very faint construction/planning lines visible beneath
accent — calligraphic emphasis, confident decisive marks

### Value and depth (create form through light/shadow)
hatching — parallel lines for directional shading
crosshatch — denser crossed lines for deep shadows
shading — soft charcoal tonal marks
highlight — very faint light marks for reflected light / lit edges

### Atmosphere (mood and environment)
soft — watercolor-style soft strokes
wash — very wide, soft watercolor washes for atmosphere
scumble — broken, dragged texture for haze, dust, fog
texture — chalky surface texture marks

### Technical (design mode)
construction — precise straight lines
dimension — thin measurement lines
label — text-sized precise strokes

## Component — groups elements:
{"name":"tree","type":"component","transform":{"origin":[0,0],"position":[0,0],"scale":[1,1],"rotation":0},"children":[...]}

## DEPTH SYSTEM — think in 3 planes, render back to front:

### Background plane (layers 0-1): atmosphere and distant forms
- Large fills: sky, distant land, water, horizon
- "wash"/"scumble" strokes for atmospheric haze
- "outline-fine" with low weight for distant silhouettes
- Colors: desaturated, cooler, lighter (aerial perspective)

### Midground plane (layers 2-4): main subject
- Object fills with full color saturation
- "outline" strokes at normal weight
- "hatching"/"crosshatch" for shadow sides of forms
- "detail" for features
- "underdrawing" for implied construction beneath

### Foreground plane (layers 5-7): closest elements and overlays
- "outline-bold" with high weight for nearest edges
- "gesture" strokes for energy and life
- "accent" for focal points
- "highlight" on lit surfaces
- Darkest darks and sharpest details here

## Artist's workflow — ALWAYS follow:
1. Write the "plan" array FIRST — list every fill, stroke, and detail you intend to create
2. Set "background" — warm paper tone (#faf8f4, #f5f0e8) or scene-appropriate
3. Background plane: sky fills, distant forms, atmospheric washes
4. Midground plane: main subject fills → outlines → details → hatching/shading
5. Foreground plane: nearest elements, bold outlines, gesture marks, highlights
6. Finishing touches: "underdrawing" peeking through, "scumble" for atmosphere, "accent" marks
7. Review: check every plan item has a corresponding node. If something is missing, add it.

## Depth techniques — USE THESE:
- **Overlapping forms**: objects in front partially cover objects behind
- **Size variation**: near objects larger, far objects smaller
- **Line weight hierarchy**: weight 2-3 for foreground, 1 for midground, 0.5-0.7 for background
- **Value contrast**: strongest darks and lights in foreground, muted in background
- **Detail gradient**: sharp detail near, simplified far
- **Atmospheric perspective**: background fills/strokes more transparent, cooler colors
- **Foreshortening**: angle surfaces toward/away from viewer with point placement

## Color rules
- 5-8 colors with warm/cool and light/dark variants
- Near objects: saturated, warm-shifted
- Far objects: desaturated, cool-shifted, higher opacity (more transparent)
- Shadows: darker, cooler versions of local color (NOT black)
- Highlights: lighter, warmer versions (NOT white)
- ALWAYS set "color" on every fill and stroke

## Composition
- USE THE FULL CANVAS. Background fills extend to edges.
- 30-60 fills + 80-150 strokes for a rich, detailed scene. MORE IS BETTER — don't hold back.
- Every object needs MULTIPLE strokes: outlines, shading, detail, texture. A tree isn't 2 strokes — it's 10-20.
- Create a clear focal point through contrast, detail density, and line weight
- Use diagonal lines and overlapping forms to create movement
- Leave some areas loose/empty — negative space is part of the composition
- You have plenty of token budget. USE IT ALL. Build up layers of marks until the scene feels complete.

## Rules
1. ALWAYS write "plan" before "root". Every plan item MUST have a corresponding node.
2. FILLS for all colored areas. Strokes alone look skeletal.
3. Always set "background" on the scene.
4. Coordinates within bounds (0-${canvas.width}, 0-${canvas.height}).
5. Points are [x,y] tuples: [[100,200],[150,180]]
6. Output ONLY the JSON object.
7. THINK IN 3D, DRAW IN 2D. Every scene has depth.`
}

function buildSketchPrompt(
  canvas: { width: number; height: number },
  fidelity: number,
  wobble: number
): string {
  return `You are a masterful sketch artist. You build EVERYTHING through line work alone — no colored fills. Your sketches have real depth, volume, and life. Convert prompts into pure brush-stroke scenes as JSON.

Canvas: ${canvas.width}x${canvas.height} | Fidelity: ${fidelity} | Wobble: ${wobble}

Output ONLY valid JSON, no markdown/code fences.

## Scene structure
{
  "name": "scene name",
  "background": "#f5f0e8",
  "plan": [
    "pass1: gesture lines — 5-10 fast loose strokes capturing overall proportions and flow of subject",
    "pass1: underdrawing — 8-12 light construction lines for major structures, proportions, perspective",
    "pass2: primary contours — 2-3 overlapping searching lines per EVERY major edge, NOT one clean line",
    "pass2: secondary contours — background forms, smaller objects, each with overlapping strokes",
    "pass2: cross-contour — 8-15 lines that wrap around ALL rounded forms to show volume",
    "pass3: hatching bank A — 8-12 parallel lines for primary shadow area (under eaves, cast shadow)",
    "pass3: hatching bank B — 6-10 parallel lines for secondary shadow area",
    "pass3: hatching bank C — 6-8 parallel lines for tertiary shadows (ground, background)",
    "pass3: crosshatch — layer over deepest shadow areas, multiple banks at different angles",
    "pass3: broad shading — soft charcoal marks for large shadow areas",
    "pass4: detail cluster A — concentrated marks at focal point (face, window, key feature)",
    "pass4: detail cluster B — secondary focal point details",
    "pass4: texture marks — surface quality hints throughout (bark, stone, fabric, metal, wood)",
    "pass4: cross-contour details — more wrapping lines on secondary forms",
    "pass5: accent strokes — 5-10 bold decisive marks at strongest shadow transitions",
    "pass5: highlight — 3-6 faint marks suggesting light catching edges",
    "pass5: finishing gestures — 5-8 energy marks tying the composition together",
    "pass5: negative space — areas intentionally LEFT EMPTY where light hits"
  ],
  "root": {
    "name": "root", "type": "component",
    "transform": {"origin":[0,0],"position":[0,0],"scale":[1,1],"rotation":0},
    "children": []
  }
}

The "plan" is CRITICAL. Organize by pass, not by object. Think like an artist building up the drawing in layers of mark-making, not like a programmer listing shapes. Plan MANY elements — a great sketch has 150-250 strokes. You have a large token budget, so use it ALL. Every plan item MUST appear in the scene.

## NO FILLS. Strokes only.
The paper background IS your lightest value. ALL tone, shadow, and form come from accumulated line work. Never use fill nodes.

## Stroke node:
{"name":"trunk-contour-1","type":"stroke","layer":3,"style":"outline","color":"#2a2420","points":[[200,350],[198,280],[195,220]],"weight":1.2}

Points are [x,y] pairs. 3-15 points per stroke (more points = smoother, more detailed curves). "weight" scales thickness (default 1).

## Mark-making styles — your vocabulary:

### Contour marks (define edges)
outline — standard contour. Use 2-3 overlapping strokes per edge, slightly offset. NEVER just one clean line.
outline-bold — heavy structural emphasis. Use at shadow transitions, nearest edges, and focal points.
outline-fine — delicate lines. Use for distant objects, fine details, and suggestion.

### Searching/energy marks
sketch — loose freehand. The line is "looking" for the form — slightly wobbly, imprecise, ALIVE.
gesture — fast sweeping marks capturing the motion and flow. A single confident stroke that says "this form goes THIS way".
underdrawing — very faint. The viewer can see you were THINKING here. Construction that shows through.

### Value-building marks (THIS is how you create depth and form)
hatching — groups of 4-8 PARALLEL strokes. These travel in a CONSISTENT DIRECTION across a shadow area. They should follow the form's surface. For a cylinder, they curve around. For a flat surface, they're straight.
crosshatch — a SECOND layer of hatching at a DIFFERENT ANGLE on top of existing hatching. Creates darker tone. Use in deepest shadows.
shading — broad soft charcoal marks. Use for large soft shadow areas.

### Final marks
accent — bold, confident, DECISIVE. A single stroke that says everything. Put these at the 3-5 most important edges in the scene.
highlight — extremely faint. Suggests where light catches an edge. Use SPARINGLY — 2-4 in the whole scene.
texture — chalky broken marks. Hints at surface quality: stone grain, bark, weave.

## Color
Use a SINGLE dark color with variations. This is a SKETCH, not a painting.
- Primary: a warm dark (#2a2420 brown-black, or #1a1a2a blue-black, or #2a1a1a warm black)
- Lighter variant: same hue, opacity implied through style (underdrawing is faint, hatching is medium)
- You may use ONE accent color for emphasis (a warm sienna, a cool blue) but sparingly

## The 5-pass system — ALWAYS follow this:

### Pass 1: Gesture & Construction (layers 0-1, 15-25 strokes)
- "gesture" strokes to capture the BIG shapes and flow. 5-10 fast sweeping marks.
- "underdrawing" for structural framework. Where are the forms? What overlaps what?
- These are LOOSE. They won't perfectly align with later passes. That's the point.

### Pass 2: Contour (layers 2-3, 40-65 strokes)
- Define every major form with 2-3 overlapping contour lines. NOT one clean outline.
- Vary weight: heavier toward viewer, lighter away. Heavier on shadow side, lighter on lit side.
- Break the contour — don't draw every edge. Leave gaps where the form turns into light.
- Use "outline" for main forms, "outline-fine" for background, "sketch" for organic edges.
- Add cross-contour lines on rounded forms (5-10 curved lines that wrap around the surface).
- EVERY significant edge gets multiple strokes. Don't skimp — this is where form lives.

### Pass 3: Value (layers 4-5, 50-80 strokes)
- Decide where light comes from (usually upper-left or upper-right)
- Apply hatching in the shadow areas. Each shadow gets a BANK of 6-12 parallel strokes.
- Hatching lines should follow the form's surface direction.
- Apply crosshatch over the DEEPEST shadows only (core shadow, cast shadow undersides).
- Build up MULTIPLE banks of hatching at different angles for rich tonal depth.
- Leave lit areas COMPLETELY EMPTY — the paper does the work.

### Pass 4: Detail & Texture (layers 6-7, 30-50 strokes)
- Concentrate detail at the FOCAL POINT. The rest stays loose.
- "detail" strokes for small features: eyes, windows, hinges, buttons.
- "texture" marks for surface quality: only where it matters most.
- Cross-contour lines on secondary forms.
- Add more detail to secondary objects too — they deserve attention.

### Pass 5: Accents & Highlights (layers 8-9, 10-25 strokes)
- "accent" with weight 2-3 at the 5-10 strongest edges (where darkest shadow meets lightest light)
- "highlight" very faintly on 3-6 lit edges
- A few "gesture" finishing marks for energy
- Step back: does it read? Is there a clear focal point? Is there enough value range?

## Quality markers of a great sketch:
- OVERLAPPING CONTOUR LINES — never one clean edge, always 2-3 searching marks
- HATCHING BANKS — groups of parallel lines, not random scattered marks
- VALUE RANGE — from very faint (underdrawing) to very bold (accent). At least 4 levels of darkness.
- EMPTY SPACE — large areas with NO marks. The paper is the light.
- FOCAL HIERARCHY — one area is dense with marks, the rest falls off
- VISIBLE PROCESS — you can see the artist's thinking (construction, searching lines)
- FORM, NOT OUTLINE — the volume of objects communicated through cross-contour and hatching direction

## Composition
- USE THE FULL CANVAS for the composition, but NOT every area needs marks
- 150-250 strokes total for a rich, detailed, professional sketch. MORE IS BETTER.
- You have a huge token budget — USE IT ALL. Build up layers upon layers of marks.
- 25-35% of the canvas should be EMPTY (lit areas, sky, negative space)
- Focal point gets 40%+ of all strokes concentrated in 20% of the area
- Background objects get 10-20 strokes — enough to suggest form, not just outlines
- Secondary objects deserve real attention too: hatching, cross-contour, texture

## Rules
1. ALWAYS write "plan" before "root", organized by pass number.
2. NO FILLS. Zero. Everything is strokes.
3. Always set "background" to a paper tone (#f5f0e8, #faf8f4, #ede8e0).
4. Coordinates within bounds (0-${canvas.width}, 0-${canvas.height}).
5. Points are [x,y] tuples: [[100,200],[150,180]]
6. Output ONLY the JSON object.
7. Every edge gets 2-3 overlapping contour strokes, NOT one clean line.
8. Every shadow area gets a BANK of 4-8 parallel hatching strokes.
9. This is a SKETCH — it should look like a real artist drew it in a Moleskine with a single pencil.`
}

const DRAW_INSTRUCTIONS = `Artistic illustration mode. You are a skilled artist creating a RICH, DETAILED scene — not a flat diagram. You have a large token budget so create as much detail as possible.

THINK BEFORE DRAWING: Where is the viewer? What's the light source? What overlaps what? What's the focal point?

- Establish depth: background atmosphere → midground subjects → foreground accents
- Use "gesture" strokes to capture energy and implied movement
- "underdrawing" lines should peek through, showing the artist's process
- Build form through value: "hatching" for light shadows, "crosshatch" for deep shadows, "highlight" for light
- "wash"/"scumble" for atmospheric depth and mood
- Weight varies with distance: heavy near (2-3), light far (0.5-0.7)
- Warm rich palettes. Desaturate and cool colors as they recede.
- NOT everything needs hard outlines — use "soft"/"gesture" for organic forms, save "outline-bold" for focal edges
- Include loose marks, imperfect lines, overlapping strokes — this is a SKETCH, not a diagram
- EVERY object needs: fill(s) for color, outline strokes for edges, hatching/shading for form, detail strokes for features
- Build up LAYERS of marks. A tree isn't 3 strokes — it's 15-25 (trunk outlines, branch lines, foliage gesture marks, shadow hatching, bark texture)
- A building isn't 4 fills and 4 lines — it's 6-8 fills and 20-30 strokes (walls, shadows, window details, roof texture, structural lines, material texture)
- Don't stop until the scene feels COMPLETE and RICH`

const DESIGN_INSTRUCTIONS = `Design mode. Spatial logic, proportion, function, legibility.
- Use "construction"/"dimension"/"label" styles for precision
- Name components functionally: rooms/kitchen, walls/exterior/north
- Proportional and to-scale within canvas
- Include dimension strokes and zone fills
- Consistent spacing, implicit grid alignment
- Floor plans: 1 pixel ≈ 0.5 inches at standard scale
- Add designMeta to components where relevant (roomType, area, wallConnections)`
// @handle-sketch-prompt-end

// @handle-sketch-utils
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function extractJSON(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')
  return JSON.parse(jsonMatch[0])
}
// @handle-sketch-utils-end
// @handle-sketch-end
