/**
 * Lazy loading utilities for heavy dependencies
 * Reduces initial memory footprint by loading dependencies only when needed
 */

type LazyModule<T> = {
  module: T | null
  promise: Promise<T> | null
  loadFn: () => Promise<T>
}

class LazyLoader {
  private static loaders = new Map<string, LazyModule<any>>()

  /**
   * Get or lazy load a module
   */
  static async get<T>(key: string, loadFn: () => Promise<T>): Promise<T> {
    if (!this.loaders.has(key)) {
      this.loaders.set(key, {
        module: null,
        promise: null,
        loadFn
      })
    }

    const loader = this.loaders.get(key)!
    
    // Return cached module if already loaded
    if (loader.module) {
      return loader.module
    }

    // Return existing promise if loading
    if (loader.promise) {
      return loader.promise
    }

    // Start loading
    loader.promise = loadFn()
    const module = await loader.promise
    loader.module = module
    return module
  }

  /**
   * Preload a module (useful for critical paths)
   */
  static async preload<T>(key: string, loadFn: () => Promise<T>): Promise<void> {
    await this.get(key, loadFn)
  }

  /**
   * Clear cached module (free memory)
   */
  static clear(key: string): void {
    const loader = this.loaders.get(key)
    if (loader) {
      loader.module = null
      loader.promise = null
    }
  }

  /**
   * Clear all cached modules
   */
  static clearAll(): void {
    for (const loader of this.loaders.values()) {
      loader.module = null
      loader.promise = null
    }
  }
}

// Lazy loaders for specific heavy dependencies

let transformers: any = null
let transformersPromise: Promise<any> | null = null

export async function getTransformers() {
  if (transformers) return transformers
  
  if (transformersPromise) return transformersPromise
  
  transformersPromise = import('@xenova/transformers')
  transformers = await transformersPromise
  return transformers
}

let RRule: any = null
let RRulePromise: Promise<any> | null = null

export async function getRRule() {
  if (RRule) return RRule
  
  if (RRulePromise) return RRulePromise
  
  RRulePromise = import('rrule').then(m => {
    // Handle both default and named exports
    const rruleModule = m.default || m.RRule || m
    if (!rruleModule) {
      throw new Error('RRule module not found in rrule package')
    }
    return rruleModule
  }).catch(err => {
    console.error('Failed to load RRule:', err)
    throw err
  })
  
  try {
    RRule = await RRulePromise
    return RRule
  } catch (err) {
    console.error('RRule loading failed:', err)
    throw err
  }
}

// Additional heavy dependencies can be added here as needed
// Example:
// let pdfLib: any = null
// export async function getPdfLib() {
//   if (pdfLib) return pdfLib
//   pdfLib = await import('pdf-lib')
//   return pdfLib
// }

export { LazyLoader }