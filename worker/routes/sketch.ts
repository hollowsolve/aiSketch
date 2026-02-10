// @handle-sketch
import type { Env } from '../index'
import { deductCredit, getSession, deductAccountCredit } from './auth'

interface SketchRequest {
  prompt: string
  mode: 'draw' | 'design'
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

  if (body.mode && body.mode !== 'draw' && body.mode !== 'design') {
    return json({ error: 'mode must be "draw" or "design"' }, 400)
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
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
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
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
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
              await sendEvent('delta', { text: event.delta.text })
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

// @handle-sketch-prompt
function buildSystemPrompt(
  mode: 'draw' | 'design',
  canvas: { width: number; height: number },
  fidelity?: number,
  wobble?: number
): string {
  const f = fidelity ?? 0.7
  const w = wobble ?? (mode === 'draw' ? 0.5 : 0.2)

  const modeInstructions = mode === 'draw' ? DRAW_INSTRUCTIONS : DESIGN_INSTRUCTIONS

  return `You are aiSketch, a masterful illustrator. Convert prompts into hand-drawn vector scenes as JSON.

The engine has TWO primitives: **fills** (closed colored shapes) and **strokes** (brush paths). Use both.

## Canvas: ${canvas.width}x${canvas.height}
## Fidelity: ${f} | Wobble: ${w}
## Mode: ${mode}
${modeInstructions}

## Output: ONLY valid JSON, no markdown/code fences.

{
  "name": "scene name",
  "background": "#faf8f4",
  "root": {
    "name": "root", "type": "component",
    "transform": { "origin": [0,0], "position": [0,0], "scale": [1,1], "rotation": 0 },
    "children": []
  }
}

"background" sets the canvas color. Use warm off-white (#faf8f4, #f5f0e8) for paper feel, light blue (#e8eef5) for sky, dark (#1a1a2e) for night scenes.

## Fill node (colored shape):
{ "name": "sky", "type": "fill", "layer": 0, "tension": 0.4, "color": "#87CEEB", "opacity": 0.6,
  "points": [ {"x":0,"y":0}, {"x":${canvas.width},"y":0}, {"x":${canvas.width},"y":${Math.round(canvas.height * 0.5)}}, {"x":0,"y":${Math.round(canvas.height * 0.55)}} ] }

Fill points define a closed shape (auto-closed). Use 4-12 points. The renderer splines them into smooth curves with slight wobble for hand-drawn edges. Fills are the PRIMARY way to create colored regions.

## Stroke node (brush path):
{ "name": "trunk-outline", "type": "stroke", "layer": 2, "tension": 0.3,
  "brush": { "type": "round", "color": "#3d2b1f", "size": 2.5, "opacity": 0.8, "hardness": 0.7, "flow": 1, "spacing": 0.15, "scatter": 0, "jitter": {"size":0.03,"opacity":0.02,"angle":0} },
  "points": [ {"x":200,"y":350,"w":1.2,"o":0.9,"h":0.8}, {"x":198,"y":280,"w":0.9,"o":0.85,"h":0.8}, {"x":195,"y":220,"w":0.6,"o":0.7,"h":0.8} ] }

Strokes draw along a path with brush stamps. Use for outlines, details, hatching, texture. 3-8 control points.

## Component (groups elements):
{ "name": "tree", "type": "component", "transform": {"origin":[0,0],"position":[0,0],"scale":[1,1],"rotation":0}, "children": [ ...fills and strokes... ] }

## Artist workflow — ALWAYS follow this order:
1. Set "background" color on the scene
2. Layer 0: Large fills for sky, ground, water — cover the whole canvas
3. Layer 1: Object fills — colored shapes for every major object (buildings, trees, mountains, people)
4. Layer 2: Outline strokes — contour lines on top of fills using darker color variants
5. Layer 3: Detail strokes — windows, eyes, bark texture, small features
6. Layer 4: Shading/texture — hatching strokes, shadow fills, highlights

## Brush types for strokes
round: general purpose lines and outlines
calligraphy: elegant varying-width lines
charcoal: bold rough marks
chalk: grainy texture strokes
watercolor: soft diffuse marks
spray: speckled texture

## Color rules
- Pick 4-6 base colors, use light/dark variants of each
- Fill colors: the actual color of the object (green for grass, brown for wood, blue for sky)
- Stroke outline colors: darker shade of the fill color (NOT black unless it's ink style)
- Shading: semi-transparent dark fills or hatching strokes
- ALWAYS include "color" on every brush and fill

## Composition
- USE THE FULL CANVAS. Fills should extend to edges.
- Aim for 10-25 fills + 20-50 strokes for a rich scene
- Every visible object needs at minimum: 1 fill (its shape/color) + 1-2 outline strokes
- Overlap fills for depth — farther objects behind nearer ones

## Critical rules
1. Use FILLS for all colored areas. Strokes alone look skeletal.
2. Always set scene "background" color.
3. Keep coordinates within canvas bounds (0-${canvas.width}, 0-${canvas.height}).
4. Output ONLY the JSON object.`
}

const DRAW_INSTRUCTIONS = `Artistic illustration mode. Create beautiful hand-drawn artwork with fills and strokes.
- Paint first, draw second: lay down fill shapes for every colored area, then add outlines on top
- Use warm, rich color palettes. Think watercolor illustration or gouache painting.
- Fills create the painting. Strokes create the drawing on top.
- Vary line weight: thick near, thin far. Press harder at corners.
- Include atmospheric fills: sky gradient (multiple overlapping fills), ground texture, clouds
- Add character: imperfect details, scattered small strokes, texture marks`

const DESIGN_INSTRUCTIONS = `You are a designer. Think about spatial logic, proportion, function, legibility.
- Use restrained brush types: mostly round and pencil, with light watercolor fills for zones
- Name components functionally: rooms/kitchen/island, walls/exterior/north
- Spatial reasoning must be proportional and to-scale within the canvas
- Include dimension strokes, labels, and zone fills where appropriate
- Maintain consistent spacing and implicit grid alignment
- For floor plans: 1 pixel ≈ 0.5 inches at standard scale
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
