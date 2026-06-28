import { z } from 'zod'
import { openRouterCircuitBreaker } from './circuitBreaker'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const API_KEY = process.env.OPENROUTER_API_KEY

// OpenRouter Fallback Routing: It will try these models in order if one is rate-limited or down.
export const FREE_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
]

export async function callOpenRouter<T>(params: {
  models?: string[]
  systemPrompt: string
  userPrompt: string
  schema: z.ZodType<T>
  stream?: boolean
}): Promise<{ data: T; usage: { input: number; output: number }, model_used: string }> {
  return openRouterCircuitBreaker.execute(async () => {
    if (!API_KEY) throw new Error('OPENROUTER_API_KEY is not set')

    const requestedModels = params.models ?? FREE_MODELS

    // Manual fallback loop across all models
    for (const model of requestedModels) {
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://verve.app',
            'X-Title': 'Verve',
          },
          body: JSON.stringify({
            model, // Provide single model
            response_format: { type: 'json_object' },
            max_tokens: 2000,
            stream: params.stream || false,
            messages: [
              { role: 'system', content: params.systemPrompt },
              { role: 'user', content: params.userPrompt },
            ]
          }),
          signal: AbortSignal.timeout(15000)
        })

        if (!response.ok) {
          if (response.status === 429 || response.status === 502) {
            // If rate limited or bad gateway, immediately try the next model
            continue
          }
          const text = await response.text()
          throw new Error(`OpenRouter API Error: ${response.status} ${text}`)
        }

        const json = await response.json()
        let content = json.choices[0].message.content

        // Strip markdown code blocks if the model wrapped the JSON
        content = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

        const parsed = JSON.parse(content)
        
        const validated = params.schema.parse(parsed)

        return {
          data: validated,
          usage: {
            input: json.usage?.prompt_tokens ?? 0,
            output: json.usage?.completion_tokens ?? 0,
          },
          model_used: json.model,
        }
      } catch (e: any) {
        // Ignore schema parse errors or rate limits for the current model, let it fallback
        console.warn(`Model ${model} failed:`, e.message)
        continue
      }
    }
    
    throw new Error('All fallback models failed or were rate-limited.')
  })
}

export async function* callOpenRouterStream(params: {
  models?: string[]
  systemPrompt: string
  userPrompt: string
}): AsyncGenerator<{ content: string; done: boolean }, void, unknown> {
  if (!API_KEY) throw new Error('OPENROUTER_API_KEY is not set')

  const requestedModels = params.models ?? FREE_MODELS

  for (const model of requestedModels) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://focal.app',
          'X-Title': 'Focal',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          stream: true,
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: params.userPrompt },
          ]
        }),
        signal: AbortSignal.timeout(15000)
      })

      if (!response.ok) {
        if (response.status === 429 || response.status === 502) {
          continue
        }
        throw new Error(`OpenRouter API Error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              yield { content: '', done: true }
              return
            }
            try {
              const json = JSON.parse(data)
              const content = json.choices?.[0]?.delta?.content || ''
              if (content) {
                yield { content, done: false }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      yield { content: '', done: true }
      return
    } catch (e: any) {
      console.warn(`Model ${model} failed:`, e.message)
      continue
    }
  }

  throw new Error('All fallback models failed or were rate-limited.')
}
