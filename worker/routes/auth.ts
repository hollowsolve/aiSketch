// @handle-auth
import type { Env } from '../index'

// @handle-auth-types
interface User {
  email: string
  credits: number
  createdAt: number
}

interface Session {
  email: string
  createdAt: number
  expiresAt: number
}

interface VerificationCode {
  code: number
  expiresAt: number
}

interface ApiKeyRecord {
  id: string
  email: string
  name: string
  credits: number
  createdAt: string
  revoked: boolean
}

const ADMIN_EMAILS = [
  'noah@volcanic.dev',
  'noahedery@gmail.com',
]
// @handle-auth-types-end

// @handle-auth-utils
function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function generateId(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = prefix + '_'
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

function setSessionCookie(sessionId: string): string {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
  return `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`
}

function getSessionId(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(/session=([^\s;]+)/)
  return match ? match[1] : null
}

async function getSession(env: Env, request: Request): Promise<Session | null> {
  const sessionId = getSessionId(request)
  if (!sessionId) return null
  const data = await env.KV_SESSIONS.get(`session:${sessionId}`, { type: 'json' })
  if (!data) return null
  const session = data as Session
  if (Date.now() > session.expiresAt) {
    await env.KV_SESSIONS.delete(`session:${sessionId}`)
    return null
  }
  return session
}

async function getOrCreateUser(email: string, env: Env): Promise<User> {
  const stored = await env.KV_SESSIONS.get(`user:${email}`, { type: 'json' }) as User | null
  if (stored) return stored

  const user: User = {
    email,
    credits: 50,
    createdAt: Date.now(),
  }
  await env.KV_SESSIONS.put(`user:${email}`, JSON.stringify(user))
  return user
}

async function getUser(env: Env, email: string): Promise<User | null> {
  return await env.KV_SESSIONS.get(`user:${email}`, { type: 'json' }) as User | null
}
// @handle-auth-utils-end

// @handle-auth-verify
async function handleVerify(request: Request, env: Env): Promise<Response> {
  let body: { email?: string }
  try {
    body = await request.json() as { email?: string }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return json({ error: 'Email required' }, 400)
  }

  const code = Math.floor(100000 + Math.random() * 900000)
  const expiresAt = Date.now() + 600000

  await env.KV_SESSIONS.put(
    `code:${email}`,
    JSON.stringify({ code, expiresAt } as VerificationCode),
    { expirationTtl: 600 }
  )

  const emailResult = await sendVerificationEmail(email, code, env)
  if (!emailResult.ok) {
    return json({ error: 'Failed to send verification email' }, 500)
  }

  return json({ success: true, message: 'Verification code sent' })
}

async function sendVerificationEmail(email: string, code: number, env: Env): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'aiSketch <noreply@volcanic.dev>',
        to: [email],
        subject: 'Your aiSketch Verification Code',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 10px;">✏️</div>
              <h1 style="margin: 0; font-size: 28px; color: #1a1a1a;">Your Verification Code</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <div style="background: #18181b; border-radius: 8px; padding: 30px; margin: 20px 0;">
                <div style="font-size: 48px; font-weight: bold; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${code}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px; color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
              <p style="margin: 0 0 15px;">This code will expire in <strong>10 minutes</strong>.</p>
              <p style="margin: 0;">If you didn't request this code, please ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                Powered by <strong>aiSketch</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend error:', error)
      return { ok: false }
    }

    return { ok: true }
  } catch (err) {
    console.error('Email send error:', err)
    return { ok: false }
  }
}
// @handle-auth-verify-end

// @handle-auth-check
async function handleCheck(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; code?: string }
  try {
    body = await request.json() as { email?: string; code?: string }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const email = body.email?.trim().toLowerCase()
  const code = body.code

  if (!email || !code) {
    return json({ error: 'Email and code required' }, 400)
  }

  const stored = await env.KV_SESSIONS.get(`code:${email}`, { type: 'json' }) as VerificationCode | null

  if (!stored) {
    return json({ error: 'No verification request found' }, 404)
  }

  if (Date.now() > stored.expiresAt) {
    return json({ error: 'Verification code expired' }, 401)
  }

  if (parseInt(code) !== stored.code) {
    return json({ error: 'Invalid verification code' }, 401)
  }

  const sessionId = crypto.randomUUID()
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000

  const session: Session = { email, createdAt: Date.now(), expiresAt }

  await env.KV_SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), {
    expirationTtl: 30 * 24 * 60 * 60,
  })

  await env.KV_SESSIONS.delete(`code:${email}`)

  const user = await getOrCreateUser(email, env)

  return json(
    { success: true, user: { email: user.email, credits: user.credits } },
    200,
    { 'Set-Cookie': setSessionCookie(sessionId) }
  )
}
// @handle-auth-check-end

// @handle-auth-logout
async function handleLogout(request: Request, env: Env): Promise<Response> {
  const sessionId = getSessionId(request)
  if (sessionId) {
    await env.KV_SESSIONS.delete(`session:${sessionId}`)
  }
  return json(
    { ok: true },
    200,
    { 'Set-Cookie': 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' }
  )
}
// @handle-auth-logout-end

// @handle-auth-me
async function handleMe(request: Request, env: Env): Promise<Response> {
  const session = await getSession(env, request)
  if (!session) {
    return json({ error: 'Not authenticated' }, 401)
  }

  const user = await getUser(env, session.email)
  if (!user) {
    return json({ error: 'User not found' }, 404)
  }

  const keysRaw = await env.KV_SESSIONS.list({ prefix: `userkeys:${session.email}:` })
  const keys: Array<{ id: string; name: string; prefix: string; credits: number; createdAt: string; revoked: boolean }> = []

  for (const key of keysRaw.keys) {
    const keyId = key.name.replace(`userkeys:${session.email}:`, '')
    const record = await env.KV_SESSIONS.get(`apikey:${keyId}`, { type: 'json' }) as ApiKeyRecord | null
    if (record) {
      keys.push({
        id: record.id,
        name: record.name,
        prefix: keyId.slice(0, 7) + '...',
        credits: record.credits,
        createdAt: record.createdAt,
        revoked: record.revoked,
      })
    }
  }

  return json({
    user: { email: user.email, credits: user.credits },
    apiKeys: keys,
  })
}
// @handle-auth-me-end

// @handle-auth-apikeys
async function handleCreateKey(request: Request, env: Env): Promise<Response> {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'Not authenticated' }, 401)

  let body: { name?: string }
  try {
    body = await request.json() as { name?: string }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const name = body.name?.trim() || 'Untitled Key'
  const keyId = 'sk_' + generateId('').slice(1)

  const record: ApiKeyRecord = {
    id: keyId,
    email: session.email,
    name,
    credits: 0,
    createdAt: new Date().toISOString(),
    revoked: false,
  }

  await env.KV_SESSIONS.put(`apikey:${keyId}`, JSON.stringify(record))
  await env.KV_SESSIONS.put(`userkeys:${session.email}:${keyId}`, '1')

  return json({ key: keyId, name, credits: 0 }, 201)
}

async function handleRevokeKey(request: Request, env: Env): Promise<Response> {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'Not authenticated' }, 401)

  let body: { keyId?: string }
  try {
    body = await request.json() as { keyId?: string }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  if (!body.keyId) return json({ error: 'keyId required' }, 400)

  const record = await env.KV_SESSIONS.get(`apikey:${body.keyId}`, { type: 'json' }) as ApiKeyRecord | null
  if (!record || record.email !== session.email) {
    return json({ error: 'Key not found' }, 404)
  }

  record.revoked = true
  await env.KV_SESSIONS.put(`apikey:${body.keyId}`, JSON.stringify(record))

  return json({ ok: true })
}

async function handleAddKeyCredits(request: Request, env: Env): Promise<Response> {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'Not authenticated' }, 401)

  let body: { keyId?: string; amount?: number }
  try {
    body = await request.json() as { keyId?: string; amount?: number }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  if (!body.keyId || !body.amount || body.amount <= 0) {
    return json({ error: 'keyId and positive amount required' }, 400)
  }

  const user = await getUser(env, session.email)
  if (!user) return json({ error: 'User not found' }, 404)

  if (user.credits < body.amount) {
    return json({ error: 'Insufficient account credits' }, 400)
  }

  const record = await env.KV_SESSIONS.get(`apikey:${body.keyId}`, { type: 'json' }) as ApiKeyRecord | null
  if (!record || record.email !== session.email) {
    return json({ error: 'Key not found' }, 404)
  }

  user.credits -= body.amount
  record.credits += body.amount

  await env.KV_SESSIONS.put(`user:${session.email}`, JSON.stringify(user))
  await env.KV_SESSIONS.put(`apikey:${body.keyId}`, JSON.stringify(record))

  return json({ userCredits: user.credits, keyCredits: record.credits })
}
// @handle-auth-apikeys-end

// @handle-auth-credits
async function handleAddCredits(request: Request, env: Env): Promise<Response> {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'Not authenticated' }, 401)

  let body: { amount?: number }
  try {
    body = await request.json() as { amount?: number }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  if (!body.amount || body.amount <= 0) {
    return json({ error: 'Positive amount required' }, 400)
  }

  const user = await getUser(env, session.email)
  if (!user) return json({ error: 'User not found' }, 404)

  user.credits += body.amount
  await env.KV_SESSIONS.put(`user:${session.email}`, JSON.stringify(user))

  return json({ credits: user.credits })
}
// @handle-auth-credits-end

// @handle-auth-deduct
export async function deductCredit(env: Env, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const record = await env.KV_SESSIONS.get(`apikey:${apiKey}`, { type: 'json' }) as ApiKeyRecord | null
  if (!record) return { ok: false, error: 'Invalid API key' }
  if (record.revoked) return { ok: false, error: 'API key revoked' }

  if (record.credits > 0) {
    record.credits -= 1
    await env.KV_SESSIONS.put(`apikey:${apiKey}`, JSON.stringify(record))
    return { ok: true }
  }

  const user = await env.KV_SESSIONS.get(`user:${record.email}`, { type: 'json' }) as User | null
  if (!user || user.credits <= 0) {
    return { ok: false, error: 'No credits remaining' }
  }

  user.credits -= 1
  await env.KV_SESSIONS.put(`user:${record.email}`, JSON.stringify(user))
  return { ok: true }
}
// @handle-auth-deduct-end

// @handle-auth-router
export async function handleAuth(
  path: string,
  method: string,
  request: Request,
  env: Env,
): Promise<Response | null> {
  if (path === '/v1/auth/verify' && method === 'POST') return handleVerify(request, env)
  if (path === '/v1/auth/check' && method === 'POST') return handleCheck(request, env)
  if (path === '/v1/auth/logout' && method === 'POST') return handleLogout(request, env)
  if (path === '/v1/auth/me' && method === 'GET') return handleMe(request, env)
  if (path === '/v1/auth/keys' && method === 'POST') return handleCreateKey(request, env)
  if (path === '/v1/auth/keys/revoke' && method === 'POST') return handleRevokeKey(request, env)
  if (path === '/v1/auth/keys/credits' && method === 'POST') return handleAddKeyCredits(request, env)
  if (path === '/v1/auth/credits' && method === 'POST') return handleAddCredits(request, env)
  return null
}
// @handle-auth-router-end
// @handle-auth-end
