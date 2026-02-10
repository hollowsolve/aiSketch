// @handle-diagram
import type { Env } from '../index'
import { deductCredit, getSession, deductAccountCredit } from './auth'

interface DiagramRequest {
  prompt: string
  stream?: boolean
  mode?: 'generate' | 'refine'
  graph?: Record<string, unknown>
}

// @handle-diagram-auth
async function authenticateRequest(request: Request, env: Env): Promise<{ valid: boolean; keyId: string; email?: string; viaSession?: boolean; error?: string }> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')

  if (apiKey) {
    const keyData = await env.KV_SESSIONS.get(`apikey:${apiKey}`)
    if (!keyData) return { valid: false, keyId: '', error: 'Invalid API key' }
    const key = JSON.parse(keyData)
    if (key.revoked) return { valid: false, keyId: '', error: 'API key has been revoked' }
    return { valid: true, keyId: key.id || apiKey.slice(0, 8) }
  }

  const session = await getSession(env, request)
  if (session) return { valid: true, keyId: `session:${session.email}`, email: session.email, viaSession: true }
  return { valid: false, keyId: '', error: 'API key required' }
}
// @handle-diagram-auth-end

// @handle-diagram-ratelimit
async function checkRateLimit(env: Env, keyId: string): Promise<boolean> {
  const key = `ratelimit:diagram:${keyId}`
  const window = 60
  const limit = 20
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
// @handle-diagram-ratelimit-end

// @handle-diagram-main
export async function handleDiagram(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const auth = await authenticateRequest(request, env)
  if (!auth.valid) return json({ error: auth.error }, 401)
  if (!await checkRateLimit(env, auth.keyId)) return json({ error: 'Rate limit exceeded' }, 429)

  let creditResult: { ok: boolean; error?: string }
  if (auth.viaSession && auth.email) {
    creditResult = await deductAccountCredit(env, auth.email)
  } else {
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '') || ''
    creditResult = await deductCredit(env, apiKey)
  }
  if (!creditResult.ok) return json({ error: creditResult.error || 'No credits remaining' }, 402)

  let body: DiagramRequest
  try {
    body = await request.json() as DiagramRequest
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.prompt || typeof body.prompt !== 'string') return json({ error: 'prompt is required' }, 400)

  const reqMode = body.mode ?? 'generate'
  const stream = body.stream ?? false

  if (reqMode === 'refine') {
    if (!body.graph) return json({ error: 'graph is required for refine mode' }, 400)
    const systemPrompt = buildRefinePrompt()
    const userPrompt = buildRefineUserPrompt(body.graph, body.prompt)
    if (stream) return streamDiagramResponse(env, systemPrompt, userPrompt)
    return batchDiagramResponse(env, systemPrompt, userPrompt)
  }

  const systemPrompt = buildDiagramPrompt()
  if (stream) return streamDiagramResponse(env, systemPrompt, body.prompt)
  return batchDiagramResponse(env, systemPrompt, body.prompt)
}
// @handle-diagram-main-end

// @handle-diagram-batch
async function batchDiagramResponse(env: Env, systemPrompt: string, userPrompt: string): Promise<Response> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    console.error('Anthropic error:', await response.text())
    return json({ error: 'Generation failed' }, 502)
  }

  const data = await response.json() as { content?: Array<{ text?: string }> }
  const text = data.content?.[0]?.text || ''

  try {
    const graph = extractJSON(text)
    return json(graph)
  } catch {
    console.error('Failed to parse diagram graph:', text.slice(0, 500))
    return json({ error: 'Failed to parse diagram from LLM response' }, 500)
  }
}
// @handle-diagram-batch-end

// @handle-diagram-stream
async function streamDiagramResponse(env: Env, systemPrompt: string, userPrompt: string): Promise<Response> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok || !response.body) return json({ error: 'Generation failed' }, 502)

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
      await sendEvent('start', {})

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
            }
          } catch { /* skip */ }
        }
      }

      try {
        const graph = extractJSON(fullText)
        await sendEvent('graph', graph)
      } catch {
        await sendEvent('error', { error: 'Failed to parse diagram graph' })
      }

      await sendEvent('done', {})
    } catch {
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
// @handle-diagram-stream-end

// @handle-diagram-prompt
function buildDiagramPrompt(): string {
  return `You are aiSketch Diagram — an AI that generates semantic engineering diagrams. Given a prompt describing a system architecture, produce a semantic graph as JSON.

CRITICAL: You generate ONLY the semantic model. No coordinates, no positions, no layout. A layout engine handles placement.

Output ONLY valid JSON, no markdown/code fences.

## Output format

{
  "name": "System Name",
  "nodes": [
    { "id": "api-gateway", "type": "gateway", "label": "API Gateway", "description": "Routes incoming HTTP requests", "tags": ["public"], "group": "frontend" },
    { "id": "user-service", "type": "service", "label": "User Service", "description": "Handles user CRUD", "tags": ["core"], "group": "backend" },
    { "id": "user-db", "type": "database", "label": "Users DB", "description": "PostgreSQL user store", "tags": ["core"], "group": "backend" },
    { "id": "cache", "type": "cache", "label": "Redis Cache", "description": "Session and query cache", "group": "backend" },
    { "id": "event-bus", "type": "queue", "label": "Event Bus", "description": "Kafka event stream", "group": "infra" },
    { "id": "email-service", "type": "external", "label": "SendGrid", "description": "Transactional email" }
  ],
  "links": [
    { "id": "l1", "from": "api-gateway", "to": "user-service", "type": "sync", "label": "REST/JSON" },
    { "id": "l2", "from": "user-service", "to": "user-db", "type": "data", "label": "queries" },
    { "id": "l3", "from": "user-service", "to": "cache", "type": "sync", "label": "read/write" },
    { "id": "l4", "from": "user-service", "to": "event-bus", "type": "event", "label": "user.created" },
    { "id": "l5", "from": "event-bus", "to": "email-service", "type": "async", "label": "welcome email" }
  ],
  "groups": [
    { "id": "frontend", "type": "boundary", "label": "Frontend" },
    { "id": "backend", "type": "boundary", "label": "Backend Services" },
    { "id": "infra", "type": "vpc", "label": "Infrastructure" }
  ]
}

## Node types and what they represent:
- **service** — microservice, API, backend service, application server
- **database** — any persistent data store (SQL, NoSQL, graph DB, etc.)
- **queue** — message queue, event bus, stream (Kafka, SQS, RabbitMQ)
- **cache** — in-memory cache (Redis, Memcached)
- **gateway** — API gateway, load balancer, reverse proxy, CDN
- **client** — browser, mobile app, CLI, any consumer-facing client
- **storage** — blob/file storage (S3, GCS, local filesystem)
- **function** — serverless function, lambda, cloud function, cron job
- **external** — third-party service, external API, SaaS integration
- **custom** — anything that doesn't fit above

## Link types:
- **sync** — synchronous request/response (HTTP, gRPC, direct call)
- **async** — asynchronous messaging (pub/sub, queue consumer)
- **data** — data flow / query (reads/writes to a store)
- **event** — event emission (fire-and-forget, domain events)
- **dependency** — static dependency, imports, configuration

## Group types:
- **boundary** — logical boundary (frontend, backend, domain context)
- **vpc** — network boundary (VPC, subnet, security group)
- **team** — team ownership boundary
- **zone** — availability zone, region
- **region** — geographic region

## Rules:
1. Every node MUST have a unique "id" (kebab-case), a "type", and a "label".
2. "description" is optional but helpful — a one-line explanation.
3. "tags" are optional — used for filtering/views later.
4. "group" on a node references a group "id" — the node belongs to that group.
5. Nodes without a "group" float outside any boundary.
6. Every link MUST have "id", "from" (source node id), "to" (target node id), "type".
7. "label" on a link describes the interaction (e.g. "REST/JSON", "queries", "user.created event").
8. Groups are optional. Only include them if the system has clear boundaries.
9. Generate 4-20 nodes. Don't over-model — capture the key components and their interactions.
10. Every node should participate in at least one link.
11. IDs must be valid: lowercase, kebab-case, unique across nodes/links/groups.
12. Output ONLY the JSON object. No explanation, no markdown.
13. Think about the FLOW of data through the system. Links should tell a story.
14. Name things clearly — a reader should understand each node's role from its label alone.`
}
// @handle-diagram-prompt-end

// @handle-diagram-refine-prompt
function buildRefinePrompt(): string {
  return `You are aiSketch Diagram Refine — an AI that modifies existing engineering diagrams via delta operations.

You will receive the CURRENT diagram graph and a USER REQUEST describing changes. Output ONLY a JSON array of delta operations.

CRITICAL: Do NOT regenerate the whole graph. Output only the CHANGES needed.

## Delta operation types:

{ "op": "addNode", "node": { "id": "new-id", "type": "service", "label": "New Service", "description": "...", "group": "existing-group-id" } }
{ "op": "removeNode", "id": "node-to-remove" }
{ "op": "updateNode", "id": "existing-id", "changes": { "label": "New Label", "type": "database" } }
{ "op": "addLink", "link": { "id": "new-link-id", "from": "source-id", "to": "target-id", "type": "sync", "label": "REST" } }
{ "op": "removeLink", "id": "link-to-remove" }
{ "op": "updateLink", "id": "existing-link-id", "changes": { "label": "new label", "type": "async" } }
{ "op": "addGroup", "group": { "id": "new-group", "type": "boundary", "label": "New Group" } }
{ "op": "removeGroup", "id": "group-to-remove" }
{ "op": "updateGroup", "id": "existing-group-id", "changes": { "label": "Updated Label" } }

## Node types: service, database, queue, cache, gateway, client, storage, function, external, custom
## Link types: sync, async, data, event, dependency
## Group types: boundary, vpc, team, zone, region

## Rules:
1. Output ONLY a JSON array of delta operations. No explanation, no markdown.
2. Use "addNode" for new nodes. Always include "id" (kebab-case, unique), "type", "label".
3. Use "removeNode" to delete nodes — this also removes all links to/from that node.
4. Use "updateNode" to change properties — only include changed fields in "changes".
5. When adding a node, also add relevant links connecting it to existing nodes.
6. Keep IDs consistent — reference existing node IDs exactly as given.
7. For "removeLink" / "removeNode", use the exact "id" from the current graph.
8. Minimize operations — only change what's needed to fulfill the request.
9. New IDs must be kebab-case and unique.
10. Output ONLY the JSON array. Example: [{"op": "addNode", "node": {...}}, {"op": "addLink", "link": {...}}]`
}

function buildRefineUserPrompt(graph: Record<string, unknown>, request: string): string {
  return `## Current diagram:
${JSON.stringify(graph, null, 2)}

## User request:
${request}`
}
// @handle-diagram-refine-prompt-end

// @handle-diagram-utils
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function extractJSON(text: string): unknown {
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  const objMatch = text.match(/\{[\s\S]*\}/)

  if (arrayMatch && objMatch) {
    const ai = text.indexOf(arrayMatch[0])
    const oi = text.indexOf(objMatch[0])
    const match = ai < oi ? arrayMatch[0] : objMatch[0]
    return JSON.parse(match)
  }

  if (arrayMatch) return JSON.parse(arrayMatch[0])
  if (objMatch) return JSON.parse(objMatch[0])
  throw new Error('No JSON found in response')
}
// @handle-diagram-utils-end
// @handle-diagram-end
