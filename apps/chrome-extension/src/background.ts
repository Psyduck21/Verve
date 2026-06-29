import { ExternalTaskRequestSchema } from '@verve/shared'

const INTEGRATIONS_BASE = 'https://verve-backend-4o63.onrender.com/v1/integrations' // Dev endpoint
const AI_BASE = 'https://verve-backend-4o63.onrender.com/v1/ai' // Dev endpoint

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_TO_verve') {
    handleSaveToFocal(message.payload)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }))
    return true // Keep message channel open for async response
  }

  if (message.type === 'EXTRACT_EMAIL_INTENT') {
    handleExtractIntent(message.payload)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }))
    return true
  }
})

async function handleExtractIntent(payload: { raw_content: string, current_date_time: string }) {
  const response = await fetchWithCsrf(`${AI_BASE}/extract-email`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Failed to extract intent: ${response.statusText}`)
  }

  return response.json()
}

// Helper to get the auth token from the web app's cookies
async function getAuthToken(): Promise<string | null> {
  // We'll check both localhost and production domains for the cookie
  const urls = ['http://localhost:3000', 'https://verve-ai-native.vercel.app']

  for (const url of urls) {
    const cookies = await chrome.cookies.getAll({ url })
    const authCookie = cookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

    if (authCookie) {
      try {
        let val = authCookie.value
        if (val.startsWith('base64-')) {
          val = atob(val.slice(7))
        } else {
          val = decodeURIComponent(val)
        }
        const parsed = JSON.parse(val)
        if (Array.isArray(parsed)) return parsed[0]
        if (parsed?.access_token) return parsed.access_token
      } catch (err) {
        console.error('Failed to parse auth cookie', err)
      }
    }
  }
  return null
}

async function fetchWithCsrf(url: string, options: RequestInit) {
  // 1. Get the auth token from cookies
  const token = await getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // 2. Fetch the CSRF token
  const csrfRes = await fetch('https://verve-backend-4o63.onrender.com/v1/csrf-token', {
    headers,
    credentials: 'include'
  })

  if (csrfRes.ok) {
    const data = await csrfRes.json()
    if (data.csrfToken) {
      headers['x-csrf-token'] = data.csrfToken
    }
  }

  // 3. Make the actual request with both tokens attached
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  })
}

async function handleSaveToFocal(payload: unknown) {
  // We can validate using the shared schema if needed
  const data = ExternalTaskRequestSchema.parse(payload)

  // Needs auth - for extension MVP we'll just send it, assuming session cookies 
  // or a token stored in extension storage are used. For now, assuming localhost 
  // has a session cookie or we mock auth for local dev.
  const response = await fetchWithCsrf(`${INTEGRATIONS_BASE}/external-tasks`, {
    method: 'POST',
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error(`Failed to save task: ${response.statusText}`)
  }

  return response.json()
}
