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
  const maxTokens = 32000
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
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
  const maxTokens = 32000
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
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
      },
      (vision) => { sendEvent('vision', vision) }
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
  onMeta: (meta: { name?: string; background?: string }) => void,
  onVision?: (vision: Record<string, unknown>) => void
) {
  let text = ''
  let inChildren = false
  let childDepth = 0
  let childStart = -1
  let inString = false
  let escaped = false
  let scanPos = 0
  let metaExtracted = false
  let visionExtracted = false

  function tryExtractMeta() {
    if (metaExtracted) return
    const bgMatch = text.match(/"background"\s*:\s*"([^"]*)"/)
    const nameMatch = text.match(/"name"\s*:\s*"([^"]*)"/)
    if (bgMatch) {
      metaExtracted = true
      onMeta({ name: nameMatch?.[1], background: bgMatch[1] })
    }
  }

  function tryExtractVision() {
    if (visionExtracted || !onVision) return
    const marker = '"vision"'
    const idx = text.indexOf(marker)
    if (idx === -1) return
    const braceStart = text.indexOf('{', idx + marker.length)
    if (braceStart === -1) return
    let depth = 0
    let inStr = false
    let esc = false
    for (let i = braceStart; i < text.length; i++) {
      const ch = text[i]
      if (esc) { esc = false; continue }
      if (ch === '\\' && inStr) { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          try {
            const vision = JSON.parse(text.slice(braceStart, i + 1)) as Record<string, unknown>
            visionExtracted = true
            onVision(vision)
          } catch { /* incomplete */ }
          return
        }
      }
    }
  }

  return {
    feed(chunk: string) {
      text += chunk

      tryExtractMeta()
      tryExtractVision()

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

## Scene structure — ALWAYS include "vision" then "plan" before "root"
{
  "name": "scene name",
  "background": "#faf8f4",
  "vision": {
    "feeling": "This should evoke the intimacy of a Wyeth tempera — warm late-afternoon light raking across weathered surfaces, quiet rural solitude",
    "references": "Andrew Wyeth's 'Christina's World' palette, Edward Hopper's architectural light, Constable's cloud studies for the sky",
    "keyChallenge": "The barn must feel three-dimensional and sun-baked — the shadow side needs 4-5 value steps from reflected light to core shadow. The receding fence must sell the depth with consistent diminishing scale.",
    "successCriteria": [
      "Eye path: foreground wildflowers → barn door (focal) → roofline → distant mountains → sky",
      "Value range: paper-white sky to near-black under eaves, with 5 distinct tonal steps between",
      "The barn reads as a solid 3D form, not a flat facade — visible side planes, cast shadow on ground",
      "Atmospheric perspective: background mountains are 40% lighter and cooler than midground",
      "Foreground has tactile energy — bold marks, heavy weight, warm saturated color"
    ],
    "avoidPitfalls": [
      "Don't draw the barn as a flat rectangle with a triangle roof — show perspective, overlapping planes",
      "Don't space fence posts equally — they should diminish and cluster with distance",
      "Don't make the sky a single flat fill — layer 3-4 gradient fills with atmospheric wash strokes",
      "Don't outline everything with the same weight — reserve bold lines for focal edges only"
    ]
  },
  "plan": [
    "section:sky — 2-3 gradient fills spanning full width, warm-to-cool transition. wash stroke for haze at horizon.",
    "section:mountains — 2 desaturated blue-gray fills at different depths. 1-2 outline-fine ridgeline strokes.",
    "section:hills — 2-3 overlapping green fills with light/shadow variants. 2 contour strokes for rolling edges.",
    "section:barn [FOCAL] — body fill, roof fill, shadow-side fill. outline walls (1 stroke each), outline-bold roof edge, detail windows + door, 4-5 hatching strokes on shadow side, crosshatch under eaves.",
    "section:fence — outline-fine posts diminishing into distance, wire strokes between.",
    "section:foreground — ground fill, 3-4 bold grass gesture marks, rock outline + fill, wildflower accents.",
    "finishing — highlight on barn roof, accent at barn door, scumble dust near ground."
  ],
  "root": {
    "name": "root", "type": "component",
    "transform": {"origin":[0,0],"position":[0,0],"scale":[1,1],"rotation":0},
    "children": []
  }
}

## The "vision" block — WRITE THIS FIRST
Before planning or drawing, articulate what artistic SUCCESS looks like for THIS specific scene. Think like a professional artist preparing to work:
- **feeling**: What emotional/aesthetic quality should the finished piece have? Name specific artists, movements, or real-world moments that capture the mood.
- **references**: 2-3 specific artist names or artworks whose techniques are relevant. These guide your mark-making and color choices.
- **keyChallenge**: The ONE hardest thing about this scene. What would separate a student's version from a master's? Be specific about the technical challenge.
- **successCriteria**: 4-6 concrete, checkable statements. After drawing, you should be able to verify each one. Include: eye path through the composition, value range, spatial depth reads, and focal point clarity.
- **avoidPitfalls**: 3-5 specific mistakes that would make this scene look amateur. These are the clichés and shortcuts that kill quality.

The vision MUST be specific to the prompt — generic advice is useless. If the prompt is "a cat on a windowsill", your vision should address cat anatomy challenges, the light-through-window effect, the specific spatial relationship of cat-to-sill-to-glass.

The "plan" array is ALSO CRITICAL. Organize by SECTION — each section is one object or area of the scene (e.g. "section:cat", "section:books", "section:background"). For each section, list ALL its fills and strokes together. This keeps each object coherent — you finish drawing one thing before moving to the next.

**EVERY STROKE MUST EARN ITS PLACE.** No duplicate strokes at the same position. Quality beats count.

Then create ALL planned items in "root" as components — one component per section, rendered back-to-front. The plan should EXECUTE ON the vision.

## Fill node — colored closed shape:
{"name":"sky","type":"fill","layer":0,"color":"#87CEEB","opacity":0.6,"points":[[0,0],[${canvas.width},0],[${canvas.width},${Math.round(canvas.height * 0.5)}],[0,${Math.round(canvas.height * 0.55)}]]}
{"name":"cat-body","type":"fill","layer":3,"color":"#d4a574","opacity":0.85,"points":[[280,200],[350,180],[420,200],[440,280],[400,340],[320,340],[280,280]]}

Points are [x,y] pairs. 4-20 points. More points = more organic shape. Engine auto-closes and splines into hand-drawn curves.

**OCCLUSION**: Fills at layer > 0 automatically ERASE whatever is behind them before drawing. This means foreground fills cleanly cover background strokes — just like real painting where opaque objects hide what's behind. Use this! Place a fill for every solid object (cat body, building wall, tree canopy) so background lines don't show through. Set "occlude": false on fills that should be transparent overlays (like sky glow, shadows, atmospheric haze).

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

## SECTION-BY-SECTION COMPOSITION

Draw one section at a time. Finish each object COMPLETELY before moving to the next. Render back-to-front (background sections first, foreground last).

Each section becomes a **component** in the scene tree. Inside each component, include ALL that section's fills AND strokes together:
1. Mass fills first (the object's color/shape)
2. Then contour strokes (edges)
3. Then detail/hatching strokes (shading, features, texture)

This keeps each object structurally coherent — the cat looks like a cat, the books look like books, because you're focused on one thing at a time.

### Section ordering (back to front):
- Background/environment sections (sky, walls, floor) — layers 0-1
- Supporting objects (furniture, props) — layers 2-3
- Main subject — layers 4-5
- Foreground overlaps — layers 6-7
- Finishing pass (atmosphere wash, accent marks, highlights) — SPARSE, only for mood

### Per-section budget:
- Background section: 2-4 fills, 1-3 strokes
- Supporting object: 1-3 fills, 3-8 strokes
- Main subject [FOCAL]: 2-5 fills, 8-20 strokes (most detail here)
- Finishing: 3-6 strokes total

### Depth cues:
- Overlapping forms (front covers back via occlusion)
- Weight: bold near (2-3), fine far (0.5-0.7)
- Color: saturated/warm near, desaturated/cool far
- Detail density decreases with distance

## Color rules
- 5-8 colors with warm/cool and light/dark variants
- Near objects: saturated, warm-shifted
- Far objects: desaturated, cool-shifted, higher opacity (more transparent)
- Shadows: darker, cooler versions of local color (NOT black)
- Highlights: lighter, warmer versions (NOT white)
- ALWAYS set "color" on every fill and stroke

## Composition and spatial layout
- USE THE FULL CANVAS (0 to ${canvas.width}, 0 to ${canvas.height}). Background fills span edge to edge.
- SCALE SUBJECTS TO THE CANVAS. Main subject = 40-60% of canvas dimensions.
- Target: 10-20 fills + 30-60 strokes across all sections. Every mark must add new information.
- EVERY solid object needs a fill (with occlusion) to cover background behind it.
- Focal section gets the most strokes. Background sections stay minimal.

## Rules
1. ALWAYS write "vision" then "plan" before "root". Vision criteria MUST be addressed by plan items.
2. FILLS for all colored areas. Strokes alone look skeletal.
3. Always set "background" on the scene.
4. Coordinates within bounds (0-${canvas.width}, 0-${canvas.height}).
5. Points are [x,y] tuples: [[100,200],[150,180]]
6. Output ONLY the JSON object.
7. THINK IN 3D, DRAW IN 2D. Every scene has depth.
8. After completing the scene, verify each successCriteria from your vision is satisfied.`
}

function buildSketchPrompt(
  canvas: { width: number; height: number },
  fidelity: number,
  wobble: number
): string {
  return `You are a masterful sketch artist. You build EVERYTHING through line work alone — no colored fills. Your sketches have real depth, volume, and life. Convert prompts into pure brush-stroke scenes as JSON.

Canvas: ${canvas.width}x${canvas.height} | Fidelity: ${fidelity} | Wobble: ${wobble}

Output ONLY valid JSON, no markdown/code fences.

## Scene structure — ALWAYS include "vision" then "plan" before "root"
{
  "name": "scene name",
  "background": "#f5f0e8",
  "vision": {
    "feeling": "A Giacometti-like search for form — the subject emerging from a cloud of tentative marks, never fully resolved, alive with uncertainty",
    "references": "Giacometti's drawn portraits for searching contour, Käthe Kollwitz for emotional weight in value, Da Vinci's anatomical studies for cross-contour precision",
    "keyChallenge": "The head must feel three-dimensional through hatching direction alone — no color, no fills. The turn from lit cheek to shadow cheek needs 4 distinct value steps built from overlapping hatching banks.",
    "successCriteria": [
      "The form reads as 3D volume, not a flat outline with shading inside",
      "You can tell exactly where the light source is from the hatching patterns alone",
      "At least 5 value steps from paper-white to near-black accent marks",
      "The focal area (face/eyes) has 3x the mark density of peripheral areas",
      "Visible construction: underdrawing and gesture marks show the artist's process"
    ],
    "avoidPitfalls": [
      "Don't outline the form with one clean contour line — use 2-3 searching, overlapping marks",
      "Don't scatter hatching randomly — each bank must follow the surface direction of the form",
      "Don't shade uniformly — leave bold paper-white areas where light hits strongest",
      "Don't over-detail the background — keep it loose and atmospheric to push the subject forward"
    ]
  },
  "plan": [
    "section:background — 2-3 loose outline-fine strokes suggesting environment (wall edge, floor line). Minimal.",
    "section:torso — gesture line for spine curve + shoulder line. Contour strokes for torso edges, ribcage cross-contour, hatching on shadow side.",
    "section:head [FOCAL] — gesture line for head tilt. Jaw contour, cheekbone, eye sockets, nose bridge, ear. Shadow hatching (4-5 strokes following cheek surface). Eye detail.",
    "section:arms — gesture line per arm. 1 contour per edge, cross-contour on cylinder forms, hatching on shadow side.",
    "section:legs — gesture lines for leg thrust. Contour strokes, minimal hatching.",
    "finishing — 3-4 accent marks at strongest shadow transitions, 2 highlights on lit edges."
  ],
  "root": {
    "name": "root", "type": "component",
    "transform": {"origin":[0,0],"position":[0,0],"scale":[1,1],"rotation":0},
    "children": []
  }
}

## The "vision" block — WRITE THIS FIRST
Before planning or drawing, articulate what artistic SUCCESS looks like for THIS specific scene. Think like a master draftsman preparing to work:
- **feeling**: What quality should the finished sketch have? Name specific artists or drawings that capture the feeling.
- **references**: 2-3 specific draftsmen, drawings, or printmakers whose LINE WORK is relevant. These guide your mark-making.
- **keyChallenge**: The ONE hardest thing about rendering this subject in pure line work. What separates a student's sketch from a master's?
- **successCriteria**: 4-6 concrete, checkable statements about the finished sketch. Include: value range, form reads, focal hierarchy, and visible process.
- **avoidPitfalls**: 3-5 specific mistakes. The clichés and shortcuts that make a sketch look like a diagram instead of art.

The vision MUST be specific to the prompt — not generic drawing advice.

The "plan" is ALSO CRITICAL. Organize by SECTION — each section is one object or body part (e.g. "section:head", "section:torso", "section:background"). For each section, list ALL its strokes together. This keeps each part coherent — you finish drawing one thing before moving to the next.

**EVERY STROKE MUST EARN ITS PLACE.** No duplicate strokes at the same position. Quality beats count.

Every plan item MUST appear in the scene. The plan should EXECUTE ON the vision.

## NO FILLS. Strokes only.
The paper background IS your lightest value. ALL tone, shadow, and form come from accumulated line work. Never use fill nodes.

## Stroke node:
{"name":"trunk-contour-1","type":"stroke","layer":3,"style":"outline","color":"#2a2420","points":[[200,350],[198,280],[195,220]],"weight":1.2}

Points are [x,y] pairs. 3-15 points per stroke (more points = smoother, more detailed curves). "weight" scales thickness (default 1).

## Mark-making styles — your vocabulary:

### Contour marks (define edges)
outline — standard contour. Use 1-2 strokes per edge. A second stroke should be visibly offset to show a "searching" quality, NOT stacked on top.
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

## SECTION-BY-SECTION COMPOSITION

Draw one section at a time. Finish each object/body part COMPLETELY before moving to the next. Render back-to-front.

Each section becomes a **component** in the scene tree. Inside each component, include ALL that section's strokes together:
1. Gesture line first (the section's line of motion/energy)
2. Then contour strokes (edges)
3. Then hatching/cross-contour (form and shadow)
4. Then detail strokes (features, texture)

This keeps each part structurally coherent — the head looks like a head, the hands look like hands, because you're focused on one thing at a time.

### Section ordering (back to front):
- Background/environment — layers 0-1 (2-4 strokes, minimal)
- Supporting objects — layers 2-3
- Main subject parts — layers 4-5
- Finishing (accents + highlights) — SPARSE, 3-6 strokes total

### Per-section stroke budget:
- Background: 2-4 strokes
- Supporting object: 4-10 strokes
- Focal section (e.g. face): 10-18 strokes
- Other subject sections: 5-12 strokes each
- Finishing: 3-6 strokes total

### Depth cues:
- Weight: bold near (2-3), fine far (0.5-0.7)
- Break contours where forms turn into light
- Hatching follows surface direction (curves around cylinders, straight on flat planes)
- Leave large areas of paper EMPTY — the paper is your lightest value

## Composition and spatial layout
- USE THE FULL CANVAS (0 to ${canvas.width}, 0 to ${canvas.height}). Spread the composition across the ENTIRE area. Don't cram everything into the center.
- SCALE SUBJECTS TO THE CANVAS. A main subject should occupy 40-60% of the canvas. On an 800x500 canvas, a portrait head is 300px tall, a building is 400px tall, a cat is 250-350px.
- Target: 40-80 purposeful strokes across all sections. Every mark adds new information.
- 25-35% of the canvas should be EMPTY (lit areas, sky, negative space)
- Focal section gets the most strokes. Background sections stay minimal.

## Rules
1. ALWAYS write "vision" then "plan" before "root". Vision criteria MUST be addressed by plan items.
2. NO FILLS. Zero. Everything is strokes.
3. Always set "background" to a paper tone (#f5f0e8, #faf8f4, #ede8e0).
4. Coordinates within bounds (0-${canvas.width}, 0-${canvas.height}).
5. Points are [x,y] tuples: [[100,200],[150,180]]
6. Output ONLY the JSON object.
7. One confident stroke per edge. No stacking duplicate contours.
8. Shadow hatching: banks of parallel strokes at DISTINCT positions.
9. Draw SECTION BY SECTION. Finish each object completely before starting the next.
10. After completing the scene, verify each successCriteria from your vision is satisfied.`
}

const DRAW_INSTRUCTIONS = `Artistic illustration mode. Draw SECTION BY SECTION — finish each object completely before starting the next.

THINK BEFORE DRAWING: What are the distinct sections? What order (back to front)? Which section is the focal point?

- Each section = one component containing that object's fills + strokes together.
- Within each section: mass fills first, then contour strokes, then detail/hatching.
- Render back-to-front: background sections first, main subject in the middle, foreground last.
- Focal section gets the most detail. Background sections stay minimal.
- Weight varies with distance: heavy near (2-3), light far (0.5-0.7)
- Warm rich palettes. Desaturate and cool as distance increases.
- NOT everything needs a hard outline — if a fill edge reads clearly, skip the contour.
- NEVER place two strokes at the same position. Every mark adds new information or it doesn't exist.`

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
