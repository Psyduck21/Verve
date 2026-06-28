import { ExternalTaskRequestSchema } from '@verve/shared'

const INTEGRATIONS_BASE = 'http://localhost:3001/v1/integrations' // Dev endpoint
const AI_BASE = 'http://localhost:3001/v1/ai' // Dev endpoint

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_TO_FOCAL') {
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
  const response = await fetch(`${AI_BASE}/extract-email`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Failed to extract intent: ${response.statusText}`)
  }
  
  return response.json()
}

async function handleSaveToFocal(payload: unknown) {
  // We can validate using the shared schema if needed
  const data = ExternalTaskRequestSchema.parse(payload)

  // Needs auth - for extension MVP we'll just send it, assuming session cookies 
  // or a token stored in extension storage are used. For now, assuming localhost 
  // has a session cookie or we mock auth for local dev.
  const response = await fetch(`${INTEGRATIONS_BASE}/external-tasks`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error(`Failed to save task: ${response.statusText}`)
  }

  return response.json()
}
