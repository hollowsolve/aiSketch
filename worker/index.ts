// @worker-entry
import { handleSketch } from './routes/sketch'

export interface Env {
  ANTHROPIC_API_KEY: string
  KV_SESSIONS: KVNamespace
  ENVIRONMENT: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    }

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    let response: Response

    if (path === '/v1/sketch' && method === 'POST') {
      response = await handleSketch(request, env, ctx)
    } else if (path === '/v1/health' && method === 'GET') {
      response = new Response(JSON.stringify({
        status: 'healthy',
        service: 'aiSketch API',
        version: '0.1.0',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      response = new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    for (const [k, v] of Object.entries(corsHeaders)) {
      response.headers.set(k, v)
    }

    return response
  }
}
// @worker-entry-end
