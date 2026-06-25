interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number // milliseconds
  maxDelay?: number // milliseconds
  backoffMultiplier?: number
  retryableErrors?: (error: any) => boolean
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: (error: any) => {
    // Retry on network errors, 5xx, 429 (rate limit)
    if (!error) return false
    const status = error.status || error.statusCode
    return !status || status >= 500 || status === 429 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT'
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  let delay = opts.initialDelay!

  for (let attempt = 1; attempt <= opts.maxAttempts!; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Check if error is retryable
      if (!opts.retryableErrors!(error) || attempt === opts.maxAttempts!) {
        throw error
      }

      // Calculate delay with exponential backoff
      const currentDelay = Math.min(delay, opts.maxDelay!)
      
      console.warn(`Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${currentDelay}ms...`, (error as Error)?.message)
      
      await new Promise(resolve => setTimeout(resolve, currentDelay))
      
      // Increase delay for next attempt
      delay = currentDelay * opts.backoffMultiplier!
    }
  }

  throw lastError
}

export function createRetryWrapper<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): () => Promise<T> {
  return () => retryWithBackoff(fn, options)
}
