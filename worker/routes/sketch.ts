// @handle-sketch
import type { Env } from '../index'
import { deductCredit } from './auth'

interface SketchRequest {
  prompt: string
  mode: 'draw' | 'design'
  stream?: boolean
  canvas?: { width: number; height: number }
  fidelity?: number
  wobble?: number
}

// @handle-sketch-auth
async function authenticateRequest(request: Request, env: Env): Promise<{ valid: boolean; keyId: string; error?: string }> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    return { valid: false, keyId: '', error: 'API key required. Pass via X-API-Key header or Authorization: Bearer <key>' }
  }

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

  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '') || ''
  const creditResult = await deductCredit(env, apiKey)
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

  return `You are aiSketch, a system that converts natural language prompts into fully editable, semantically structured, hand-drawn-style vector scenes.

You output a JSON scene graph — a hierarchical tree of named components, each containing child components or leaf strokes with brush configurations.

## Canvas
Width: ${canvas.width}, Height: ${canvas.height}

## Render parameters
Fidelity: ${f} (0=loose sketch, 1=precise illustration)
Wobble: ${w} (0=steady, 1=very shaky hand)

## Mode: ${mode}
${modeInstructions}

## Output format
Output ONLY valid JSON. No markdown, no explanation, no code fences. The JSON must be a scene graph with this structure:

{
  "name": "scene",
  "root": {
    "name": "root",
    "type": "component",
    "transform": { "origin": [${canvas.width / 2}, ${canvas.height / 2}], "position": [0, 0], "scale": [1, 1], "rotation": 0 },
    "children": [
      {
        "name": "example_group",
        "type": "component",
        "transform": { "origin": [x, y], "position": [0, 0], "scale": [1, 1], "rotation": 0 },
        "children": [
          {
            "name": "example_stroke",
            "type": "stroke",
            "layer": 0,
            "points": [
              { "x": 100, "y": 200, "w": 1.0, "o": 0.9, "h": 0.7 },
              { "x": 150, "y": 180, "w": 1.1, "o": 0.9, "h": 0.7 }
            ],
            "brush": {
              "type": "pencil_type",
              "size": 3,
              "opacity": 0.85,
              "hardness": 0.6,
              "flow": 0.9,
              "spacing": 0.12,
              "scatter": 0.0,
              "jitter": { "size": 0.05, "opacity": 0.02, "angle": 0.0 }
            },
            "tension": 0.5
          }
        ]
      }
    ]
  }
}

## Naming conventions
- Use semantic, hierarchical names: "face/eyes/left/iris" not "stroke_47"
- Components group related elements: a face contains eyes, nose, mouth
- Leaf strokes are the actual drawn paths
- Names use forward slash in the hierarchy, dots for variants: "tree.left/trunk"

## Layers
- Layer 0: Background washes, fills
- Layer 1: Construction lines, major shapes
- Layer 2: Detail strokes, features
- Layer 3: Shading, hatching, annotations

## Brush types
Available: round, square, pixel, spray, calligraphy, chalk, charcoal, watercolor

## Stroke points
Each point has:
- x, y: position in canvas coordinates
- w: width multiplier (0.1-3.0, simulates pen pressure)
- o: opacity at this point (0-1)
- h: hardness at this point (0=soft edge, 1=hard edge)

Use 3-8 control points per stroke. The renderer interpolates smooth curves between them.

## Critical rules
1. Every element must be named semantically
2. Group related strokes into components with meaningful names
3. Use appropriate brush types for each element (charcoal for bold marks, pencil for detail, watercolor for washes)
4. Assign correct layers (background first, then structure, detail, shading)
5. Keep stroke point coordinates within the canvas bounds
6. Vary pressure (w) along strokes for natural feel — press harder at direction changes
7. Use 3-8 points per stroke, not more
8. Output ONLY the JSON object, nothing else`
}

const DRAW_INSTRUCTIONS = `You are an artist. Think about composition, mood, visual storytelling.
- Use the full range of brush types for expressive effect
- Name components anatomically/visually: face/eyes/left/iris, hair/bangs/strand.1
- Spatial reasoning is approximate and expressive — prioritize visual appeal
- Include shading and texture strokes for depth
- Consider foreground/midground/background composition
- Vary line weight dramatically for emphasis`

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
