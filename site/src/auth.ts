// @site-auth
import './auth.css'
import { showDashboard, hideDashboard } from './dashboard'

// @site-auth-state
interface AuthUser {
  email: string
  credits: number
}

interface ApiKey {
  id: string
  name: string
  prefix: string
  credits: number
  createdAt: string
  revoked: boolean
}

let currentUser: AuthUser | null = null
let apiKeys: ApiKey[] = []
let justCreatedKey: string | null = null
// @site-auth-state-end

// @site-auth-api
async function api(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    credentials: 'same-origin',
  })
}

async function checkSession(): Promise<boolean> {
  try {
    const res = await api('/v1/auth/me')
    if (!res.ok) return false
    const data = await res.json() as { user: AuthUser; apiKeys: ApiKey[] }
    currentUser = data.user
    apiKeys = data.apiKeys
    return true
  } catch {
    return false
  }
}
// @site-auth-api-end

// @site-auth-router
export function initAuth() {
  checkSession().then((ok) => {
    updateNavButton(ok)
    const hash = window.location.hash.slice(1)
    if (hash === 'login' || hash === 'signup' || hash === 'dashboard') {
      showAuthPage(hash)
    }
  })

  window.addEventListener('hashchange', () => {
    const h = window.location.hash.slice(1)
    if (h === 'login' || h === 'signup' || h === 'dashboard') {
      showAuthPage(h)
    } else {
      hideAuthOverlay()
      hideDashboard()
    }
  })
}

function updateNavButton(loggedIn: boolean) {
  const btn = document.getElementById('nav-auth-btn')
  if (!btn) return
  if (loggedIn) {
    btn.textContent = 'Dashboard'
    btn.setAttribute('href', '#dashboard')
  } else {
    btn.textContent = 'Sign In'
    btn.setAttribute('href', '#login')
  }
}

function showAuthPage(page: 'login' | 'signup' | 'dashboard') {
  if (page === 'dashboard') {
    checkSession().then((ok) => {
      if (ok) {
        hideAuthOverlay()
        showDashboard(currentUser!, apiKeys, {
          onLogout: async () => {
            await api('/v1/auth/logout', { method: 'POST' })
            currentUser = null
            apiKeys = []
            updateNavButton(false)
            window.location.hash = ''
          },
          onRefreshSession: async () => {
            const ok = await checkSession()
            if (!ok) return null
            return { user: currentUser!, apiKeys }
          },
        })
      } else {
        renderEmailStep()
      }
    })
    return
  }
  renderEmailStep()
}
// @site-auth-router-end

// @site-auth-overlay
function getOverlay(): HTMLElement {
  let overlay = document.getElementById('auth-overlay')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'auth-overlay'
    overlay.className = 'auth-overlay'
    document.body.appendChild(overlay)
  }
  overlay.classList.remove('hidden')
  return overlay
}

function hideAuthOverlay() {
  const overlay = document.getElementById('auth-overlay')
  if (overlay) overlay.classList.add('hidden')
}
// @site-auth-overlay-end

// @site-auth-email-step
function renderEmailStep() {
  const overlay = getOverlay()
  overlay.innerHTML = `
    <div class="auth-card">
      <div class="auth-close" id="auth-close">&times;</div>
      <h2 class="auth-title">Sign in to aiSketch</h2>
      <p class="auth-subtitle">Enter your email to receive a verification code.</p>
      <form id="email-form" class="auth-form">
        <div class="auth-field">
          <label>Email</label>
          <input type="email" id="auth-email" placeholder="you@example.com" required autofocus />
        </div>
        <div class="auth-error hidden" id="auth-error"></div>
        <button type="submit" class="auth-submit" id="auth-submit-btn">Continue</button>
      </form>
    </div>
  `

  document.getElementById('auth-close')!.addEventListener('click', () => {
    window.location.hash = ''
    hideAuthOverlay()
  })

  document.getElementById('email-form')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = (document.getElementById('auth-email') as HTMLInputElement).value.trim()
    const errEl = document.getElementById('auth-error')!
    const btn = document.getElementById('auth-submit-btn') as HTMLButtonElement

    errEl.classList.add('hidden')
    btn.textContent = 'Sending...'
    btn.disabled = true

    try {
      const res = await api('/v1/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        errEl.textContent = data.error || 'Failed to send code'
        errEl.classList.remove('hidden')
        btn.textContent = 'Continue'
        btn.disabled = false
        return
      }
      renderCodeStep(email)
    } catch {
      errEl.textContent = 'Network error'
      errEl.classList.remove('hidden')
      btn.textContent = 'Continue'
      btn.disabled = false
    }
  })
}
// @site-auth-email-step-end

// @site-auth-code-step
function renderCodeStep(email: string) {
  const overlay = getOverlay()
  overlay.innerHTML = `
    <div class="auth-card">
      <div class="auth-close" id="auth-close">&times;</div>
      <h2 class="auth-title">Check your email</h2>
      <p class="auth-subtitle">We sent a 6-digit code to <strong>${email}</strong></p>
      <form id="code-form" class="auth-form">
        <div class="auth-field">
          <label>Verification Code</label>
          <input type="text" id="auth-code" placeholder="000000" required maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autofocus class="auth-code-input" />
        </div>
        <div class="auth-error hidden" id="auth-error"></div>
        <button type="submit" class="auth-submit" id="auth-submit-btn">Verify</button>
      </form>
      <p class="auth-switch"><a href="#" id="auth-back">Use a different email</a></p>
    </div>
  `

  document.getElementById('auth-close')!.addEventListener('click', () => {
    window.location.hash = ''
    hideAuthOverlay()
  })

  document.getElementById('auth-back')!.addEventListener('click', (e) => {
    e.preventDefault()
    renderEmailStep()
  })

  const codeInput = document.getElementById('auth-code') as HTMLInputElement
  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6)
    if (codeInput.value.length === 6) {
      submitCode(email)
    }
  })

  document.getElementById('code-form')!.addEventListener('submit', (e) => {
    e.preventDefault()
    submitCode(email)
  })
}

async function submitCode(email: string) {
  const code = (document.getElementById('auth-code') as HTMLInputElement).value
  const errEl = document.getElementById('auth-error')!
  const btn = document.getElementById('auth-submit-btn') as HTMLButtonElement

  if (code.length !== 6) return

  errEl.classList.add('hidden')
  btn.textContent = 'Verifying...'
  btn.disabled = true

  try {
    const res = await api('/v1/auth/check', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    })
    const data = await res.json() as { success?: boolean; user?: AuthUser; error?: string }
    if (!res.ok || !data.success) {
      errEl.textContent = data.error || 'Verification failed'
      errEl.classList.remove('hidden')
      btn.textContent = 'Verify'
      btn.disabled = false
      return
    }
    currentUser = data.user!
    updateNavButton(true)
    window.location.hash = 'dashboard'
  } catch {
    errEl.textContent = 'Network error'
    errEl.classList.remove('hidden')
    btn.textContent = 'Verify'
    btn.disabled = false
  }
}
// @site-auth-code-step-end

// @site-auth-dashboard
function renderDashboard() {
  if (!currentUser) return
  const overlay = getOverlay()

  const keyRows = apiKeys.filter(k => !k.revoked).map(k => `
    <div class="dash-key-row">
      <div class="dash-key-info">
        <span class="dash-key-name">${k.name}</span>
        <span class="dash-key-prefix">${k.prefix}</span>
      </div>
      <div class="dash-key-credits">
        <span class="dash-key-credit-count">${k.credits ?? 0}</span> credits
        <button class="dash-key-action" data-action="fund" data-key="${k.id}">+ Add</button>
        <button class="dash-key-action danger" data-action="revoke" data-key="${k.id}">Revoke</button>
      </div>
    </div>
  `).join('')

  overlay.innerHTML = `
    <div class="auth-card dash-card">
      <div class="auth-close" id="auth-close">&times;</div>
      <div class="dash-header">
        <div>
          <h2 class="auth-title">Dashboard</h2>
          <p class="auth-subtitle">${currentUser.email}</p>
        </div>
        <button class="dash-logout" id="dash-logout">Sign Out</button>
      </div>

      <div class="dash-credits-card">
        <div class="dash-credits-label">Account Credits</div>
        <div class="dash-credits-value" id="dash-credits">${currentUser.credits ?? 0}</div>
        <div class="dash-credits-actions">
          <button class="btn-primary dash-buy-btn" data-amount="100">Buy 100</button>
          <button class="btn-primary dash-buy-btn" data-amount="500">Buy 500</button>
          <button class="btn-primary dash-buy-btn" data-amount="2000">Buy 2,000</button>
        </div>
      </div>

      <div class="dash-section">
        <div class="dash-section-header">
          <h3>API Keys</h3>
          <button class="btn-primary dash-create-key" id="dash-create-key">+ New Key</button>
        </div>
        ${justCreatedKey ? `
          <div class="dash-new-key-notice">
            <span>New key created — copy it now, it won't be shown again:</span>
            <code class="dash-new-key-value">${justCreatedKey}</code>
            <button class="dash-key-copy" id="dash-copy-key">Copy</button>
          </div>
        ` : ''}
        <div class="dash-key-list" id="dash-key-list">
          ${keyRows || '<p class="dash-empty">No API keys yet. Create one to get started.</p>'}
        </div>
      </div>
    </div>
  `

  justCreatedKey = null

  document.getElementById('auth-close')!.addEventListener('click', () => {
    window.location.hash = ''
    hideAuthOverlay()
  })

  document.getElementById('dash-logout')!.addEventListener('click', async () => {
    await api('/v1/auth/logout', { method: 'POST' })
    currentUser = null
    apiKeys = []
    updateNavButton(false)
    window.location.hash = ''
    hideAuthOverlay()
  })

  document.getElementById('dash-create-key')?.addEventListener('click', async () => {
    const name = prompt('Key name:') || 'Untitled Key'
    const res = await api('/v1/auth/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const data = await res.json() as { key: string }
      justCreatedKey = data.key
      await checkSession()
      renderDashboard()
    }
  })

  document.getElementById('dash-copy-key')?.addEventListener('click', () => {
    const val = document.querySelector('.dash-new-key-value')?.textContent
    if (val) navigator.clipboard.writeText(val)
    const btn = document.getElementById('dash-copy-key')!
    btn.textContent = 'Copied!'
    setTimeout(() => { btn.textContent = 'Copy' }, 2000)
  })

  document.querySelectorAll('.dash-buy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const amount = parseInt((btn as HTMLElement).dataset.amount || '0')
      const res = await api('/v1/auth/credits', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      })
      if (res.ok) {
        const data = await res.json() as { credits: number }
        currentUser!.credits = data.credits
        document.getElementById('dash-credits')!.textContent = String(data.credits)
      }
    })
  })

  document.querySelectorAll('[data-action="revoke"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const keyId = (btn as HTMLElement).dataset.key
      if (!confirm('Revoke this key? This cannot be undone.')) return
      await api('/v1/auth/keys/revoke', {
        method: 'POST',
        body: JSON.stringify({ keyId }),
      })
      await checkSession()
      renderDashboard()
    })
  })

  document.querySelectorAll('[data-action="fund"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const keyId = (btn as HTMLElement).dataset.key
      const amountStr = prompt('Credits to transfer from account:')
      if (!amountStr) return
      const amount = parseInt(amountStr)
      if (!amount || amount <= 0) return

      const res = await api('/v1/auth/keys/credits', {
        method: 'POST',
        body: JSON.stringify({ keyId, amount }),
      })
      if (res.ok) {
        await checkSession()
        renderDashboard()
      } else {
        const data = await res.json() as { error: string }
        alert(data.error)
      }
    })
  })
}
// @site-auth-dashboard-end
// @site-auth-end
