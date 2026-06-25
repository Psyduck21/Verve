/**
 * Standardized keyboard event handling utilities
 * Ensures consistent behavior across all components
 */

export interface KeyboardHandlerConfig {
  /** Whether to prevent default behavior */
  preventDefault?: boolean
  /** Whether to stop propagation */
  stopPropagation?: boolean
  /** Whether to check if an input field is focused */
  ignoreInInput?: boolean
  /** Whether to check if contentEditable element is focused */
  ignoreInContentEditable?: boolean
}

/**
 * Check if keyboard event should be ignored (e.g., in input fields)
 */
export function shouldIgnoreKeyboardEvent(
  event: KeyboardEvent,
  config: KeyboardHandlerConfig = {}
): boolean {
  const {
    ignoreInInput = true,
    ignoreInContentEditable = true,
  } = config

  const target = event.target as HTMLElement

  if (ignoreInInput) {
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
    if (isInput) return true
  }

  if (ignoreInContentEditable) {
    const isContentEditable = target.isContentEditable
    if (isContentEditable) return true
  }

  return false
}

/**
 * Apply standard keyboard event handling
 */
export function handleKeyboardEvent(
  event: KeyboardEvent,
  handler: () => void,
  config: KeyboardHandlerConfig = {}
): void {
  if (shouldIgnoreKeyboardEvent(event, config)) return

  const { preventDefault = true, stopPropagation = false } = config

  if (preventDefault) event.preventDefault()
  if (stopPropagation) event.stopPropagation()

  handler()
}

/**
 * Create a keyboard event handler with standard behavior
 */
export function createKeyboardHandler(
  handler: () => void,
  config: KeyboardHandlerConfig = {}
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => handleKeyboardEvent(event, handler, config)
}
