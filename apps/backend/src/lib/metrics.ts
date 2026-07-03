import { Counter, Histogram, Gauge, Registry } from 'prom-client'

const register = new Registry()

// HTTP Request Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
})

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
})

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
})

export const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table']
})

// Cache Metrics
export const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_level']
})

export const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Duration of cache operations in seconds',
  labelNames: ['operation', 'cache_level'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25]
})

// AI Service Metrics
export const aiRequestDuration = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'Duration of AI requests in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60]
})

export const aiRequestTotal = new Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI requests',
  labelNames: ['operation', 'status']
})

// Memory Metrics
export const memoryUsage = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
})

// CPU Metrics
export const eventLoopLag = new Histogram({
  name: 'event_loop_lag_seconds',
  help: 'Event loop lag in seconds',
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
})

// Queue Metrics
export const queueJobDuration = new Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Duration of queue jobs in seconds',
  labelNames: ['queue', 'job_name'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300]
})

export const queueJobTotal = new Counter({
  name: 'queue_jobs_total',
  help: 'Total number of queue jobs',
  labelNames: ['queue', 'job_name', 'status']
})

// Helper functions
export function trackHttpRequest(method: string, route: string, statusCode: number, duration: number) {
  httpRequestDuration.observe({
    method,
    route,
    status_code: statusCode
  }, duration / 1000)
  
  httpRequestTotal.inc({
    method,
    route,
    status_code: statusCode
  })
}

export function trackDbQuery(operation: string, table: string, duration: number) {
  dbQueryDuration.observe({
    operation,
    table
  }, duration / 1000)
  
  dbQueryTotal.inc({
    operation,
    table
  })
}

export function trackCacheOperation(operation: string, cacheLevel: string, duration: number, hit: boolean) {
  cacheOperationDuration.observe({
    operation,
    cache_level: cacheLevel
  }, duration / 1000)
  
  // Update hit rate (simplified - in production you'd want a more sophisticated calculation)
  const currentRate = hit ? 1 : 0
  cacheHitRate.set({ cache_level: cacheLevel }, currentRate)
}

export function trackAiRequest(operation: string, model: string, duration: number, success: boolean) {
  aiRequestDuration.observe({
    operation,
    model
  }, duration / 1000)
  
  aiRequestTotal.inc({
    operation,
    status: success ? 'success' : 'failure'
  })
}

export function trackQueueJob(queue: string, jobName: string, duration: number, success: boolean) {
  queueJobDuration.observe({
    queue,
    job_name: jobName
  }, duration / 1000)
  
  queueJobTotal.inc({
    queue,
    job_name: jobName,
    status: success ? 'completed' : 'failed'
  })
}

// Start periodic metrics collection
function startMetricsCollection() {
  // Update memory metrics every 30 seconds
  setInterval(() => {
    const usage = process.memoryUsage()
    memoryUsage.set({ type: 'rss' }, usage.rss)
    memoryUsage.set({ type: 'heap_total' }, usage.heapTotal)
    memoryUsage.set({ type: 'heap_used' }, usage.heapUsed)
    memoryUsage.set({ type: 'external' }, usage.external)
  }, 30000)
  
  // Measure event loop lag every 5 seconds
  setInterval(() => {
    const start = Date.now()
    setImmediate(() => {
      const lag = Date.now() - start
      eventLoopLag.observe(lag / 1000)
    })
  }, 5000)
}

// Start metrics collection on import
startMetricsCollection()

export { register }