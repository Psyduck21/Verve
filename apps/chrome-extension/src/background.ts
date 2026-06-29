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
  let cookies: chrome.cookies.Cookie[] = []

  try {
    console.log(`Checking all cookies in the browser...`)
    cookies = await chrome.cookies.getAll({})
    console.log(`Found ${cookies.length} total cookies in browser`)

    // Only get cookies for this specific Supabase project to avoid mixing tokens from other localhost projects
    const baseName = 'sb-mrmvoxqqvwltigwsruyl-auth-token'

    const chunkCookies = cookies.filter(c => c.name.startsWith(baseName + '.'))
    const mainCookies = cookies.filter(c => c.name === baseName)

    console.log("Found chunk cookies:", chunkCookies.map(c => ({ domain: c.domain, name: c.name, path: c.path })))
    if (mainCookies.length) console.log("Found main cookies:", mainCookies.map(c => ({ domain: c.domain, name: c.name, path: c.path })))

    // Group chunks by domain to prevent mixing chunks from localhost and production
    const domainGroups: Record<string, chrome.cookies.Cookie[]> = {}
    for (const c of chunkCookies) {
      if (!domainGroups[c.domain]) domainGroups[c.domain] = []
      domainGroups[c.domain].push(c)
    }

    let valsToTry: { domain: string, value: string }[] = []

    // Add grouped chunks
    for (const domain in domainGroups) {
      const group = domainGroups[domain]
      group.sort((a, b) => {
        const idxA = parseInt(a.name.split('.').pop() || '0')
        const idxB = parseInt(b.name.split('.').pop() || '0')
        return idxA - idxB
      })
      valsToTry.push({ domain, value: group.map(c => c.value).join('') })
    }

    // Add main cookies
    for (const mc of mainCookies) {
      valsToTry.push({ domain: mc.domain, value: mc.value })
    }

    console.log(`Found ${valsToTry.length} potential tokens across different domains`)

    for (const item of valsToTry) {
      let val = item.value
      if (!val) continue
      try {
        val = decodeURIComponent(val)

        if (val.startsWith('base64-')) {
          let b64 = val.slice(7).replace(/-/g, '+').replace(/_/g, '/')
          // Strip any accidental whitespace/newlines
          b64 = b64.replace(/\s/g, '')
          while (b64.length % 4) {
            b64 += '='
          }
          val = decodeURIComponent(escape(atob(b64)))
        }

        const parsed = JSON.parse(val)
        const tokenStr = Array.isArray(parsed) ? parsed[0] : parsed?.access_token
        if (tokenStr) {
          // Check if the token is expired by decoding the JWT payload
          try {
            let jwtB64 = tokenStr.split('.')[1]
            jwtB64 = jwtB64.replace(/-/g, '+').replace(/_/g, '/')
            while (jwtB64.length % 4) {
              jwtB64 += '='
            }
            const jwtPayload = JSON.parse(decodeURIComponent(escape(atob(jwtB64))))
            if (jwtPayload.exp && jwtPayload.exp * 1000 > Date.now()) {
              console.log(`Successfully extracted a valid, unexpired token from domain: ${item.domain}`)
              return tokenStr
            } else {
              console.log("Token extracted, but it is already expired. Trying next...")
            }
          } catch (jwtErr) {
            console.log("Could not decode JWT, returning anyway...")
            return tokenStr
          }
        }
      } catch (err) {
        console.error('Failed to parse a cookie group', err)
      }
    }
  } catch (err) {
    console.error(`Failed to get cookies:`, err)
  }

  console.log('No auth token found in any of the cookies!')
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
