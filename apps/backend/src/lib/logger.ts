/**
 * Standardized error logging utility
 * Provides consistent error logging format across the application
 */

export interface LogContext {
  requestId?: string
  userId?: string
  action?: string
  resource?: string
  [key: string]: any
}

export interface ErrorLogEntry extends LogContext {
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  error?: Error
  timestamp: string
}

class Logger {
  private formatLogEntry(
    level: ErrorLogEntry['level'],
    message: string,
    error?: Error,
    context?: LogContext
  ): ErrorLogEntry {
    return {
      level,
      message,
      error,
      timestamp: new Date().toISOString(),
      ...context,
    }
  }

  private log(entry: ErrorLogEntry) {
    const logFn = entry.level === 'error' ? console.error : 
                  entry.level === 'warn' ? console.warn :
                  entry.level === 'debug' ? console.debug : console.log

    // Format log message
    const contextStr = Object.entries(entry)
      .filter(([key]) => !['level', 'message', 'error', 'timestamp'].includes(key))
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ')

    const message = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr ? ` ${contextStr}` : ''}`

    if (entry.error) {
      logFn(message, entry.error)
    } else {
      logFn(message)
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    const entry = this.formatLogEntry('error', message, error, context)
    this.log(entry)
  }

  warn(message: string, context?: LogContext) {
    const entry = this.formatLogEntry('warn', message, undefined, context)
    this.log(entry)
  }

  info(message: string, context?: LogContext) {
    const entry = this.formatLogEntry('info', message, undefined, context)
    this.log(entry)
  }

  debug(message: string, context?: LogContext) {
    const entry = this.formatLogEntry('debug', message, undefined, context)
    this.log(entry)
  }
}

export const logger = new Logger()

/**
 * Create a child logger with default context
 */
export function createLogger(defaultContext: LogContext) {
  const childLogger = new Logger()
  
  return {
    error: (message: string, error?: Error, context?: LogContext) => 
      childLogger.error(message, error, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) => 
      childLogger.warn(message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) => 
      childLogger.info(message, { ...defaultContext, ...context }),
    debug: (message: string, context?: LogContext) => 
      childLogger.debug(message, { ...defaultContext, ...context }),
  }
}
