// @worker-entry
import { handleSketch } from './routes/sketch'
import { handleDiagram } from './routes/diagram'
import { handleAuth } from './routes/auth'
import { getAssetFromKV, NotFoundError } from '@cloudflare/kv-asset-handler'
// @ts-expect-error — injected by wrangler at build time for [site] config
import manifestJSON from '__STATIC_CONTENT_MANIFEST'

const assetManifest = JSON.parse(manifestJSON)

export interface Env {
  ANTHROPIC_API_KEY: string
  RESEND_API_KEY: string
  KV_SESSIONS: KVNamespace
  ENVIRONMENT: string
  __STATIC_CONTENT: KVNamespace
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

    if (path.startsWith('/v1/auth/')) {
      const authResponse = await handleAuth(path, method, request, env)
      if (authResponse) {
        response = authResponse
      } else {
        response = new Response('Not found', { status: 404 })
      }
    } else if (path === '/v1/sketch' && method === 'POST') {
      response = await handleSketch(request, env, ctx)
    } else if (path === '/v1/diagram' && method === 'POST') {
      response = await handleDiagram(request, env, ctx)
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
      // @handle-static-assets
      try {
        response = await getAssetFromKV(
          { request, waitUntil: ctx.waitUntil.bind(ctx) },
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: assetManifest,
            cacheControl: {
              browserTTL: 60 * 60 * 24,
              edgeTTL: 60 * 60 * 24 * 2,
              bypassCache: env.ENVIRONMENT !== 'production',
            },
          }
        )
      } catch (e) {
        if (e instanceof NotFoundError) {
          try {
            const notFoundRequest = new Request(new URL('/index.html', url.origin).toString(), request)
            response = await getAssetFromKV(
              { request: notFoundRequest, waitUntil: ctx.waitUntil.bind(ctx) },
              {
                ASSET_NAMESPACE: env.__STATIC_CONTENT,
                ASSET_MANIFEST: assetManifest,
              }
            )
          } catch {
            response = new Response('Not found', { status: 404 })
          }
        } else {
          response = new Response('Internal error', { status: 500 })
        }
      }
      // @handle-static-assets-end
    }

    if (path.startsWith('/v1/')) {
      for (const [k, v] of Object.entries(corsHeaders)) {
        response.headers.set(k, v)
      }
    }

    return response
  }
}
// @worker-entry-end
