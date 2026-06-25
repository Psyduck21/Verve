import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'

// Error code constants for better user communication
export const ErrorCodes = {
  // Validation errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Authentication/Authorization (4xx)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Resource errors (4xx)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Rate limiting (4xx)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Business logic errors (4xx)
  INVALID_STATE: 'INVALID_STATE',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  
  // External service errors (5xx)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Circuit breaker (5xx)
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
  SERVICE_TEMPORARILY_UNAVAILABLE: 'SERVICE_TEMPORARILY_UNAVAILABLE',
  
  // Generic errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export function errorHandler(
  error: FastifyError,
  req:   FastifyRequest,
  reply: FastifyReply
) {
  const requestId = req.id

  // Zod validation errors → 422 Unprocessable Entity
  if (error instanceof ZodError) {
    return reply.status(422).send({
      success: false,
      error: {
        code: ErrorCodes.INVALID_PAYLOAD,
        message: 'Request validation failed. Please check your input.',
        details: error.flatten().fieldErrors,
      },
      meta: { request_id: requestId },
    })
  }

  // Known app errors (thrown with statusCode)
  if (error.statusCode && error.statusCode < 500) {
    const errorCode = (error as any).code
    
    // Map common status codes to specific error codes
    let code: keyof typeof ErrorCodes = ErrorCodes.UNKNOWN_ERROR
    if (error.statusCode === 400) code = ErrorCodes.VALIDATION_ERROR
    else if (error.statusCode === 401) code = ErrorCodes.UNAUTHORIZED
    else if (error.statusCode === 403) code = ErrorCodes.FORBIDDEN
    else if (error.statusCode === 404) code = ErrorCodes.NOT_FOUND
    else if (error.statusCode === 409) code = ErrorCodes.CONFLICT
    else if (error.statusCode === 429) code = ErrorCodes.RATE_LIMIT_EXCEEDED
    else if (errorCode && Object.values(ErrorCodes).includes(errorCode)) code = errorCode as keyof typeof ErrorCodes
    
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code,
        message: error.message || 'Request failed.',
      },
      meta: { request_id: requestId },
    })
  }

  // Circuit breaker errors
  if (error.message?.includes('Circuit breaker')) {
    req.log.error({ err: error, requestId }, 'Circuit breaker triggered')
    return reply.status(503).send({
      success: false,
      error: {
        code: ErrorCodes.CIRCUIT_BREAKER_OPEN,
        message: 'Service is temporarily unavailable due to high error rate. Please try again later.',
      },
      meta: { request_id: requestId },
    })
  }

  // Unknown server errors — never expose internals
  req.log.error({ err: error, requestId }, 'Unhandled server error')
  return reply.status(500).send({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred. Our team has been notified.',
    },
    meta: { request_id: requestId },
  })
}
