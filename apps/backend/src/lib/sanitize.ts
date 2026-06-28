import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'

const window = new JSDOM('').window
const DOMPurify = createDOMPurify(window)

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Sanitize plain text (strips all HTML)
 * @param text - The text to sanitize
 * @returns Plain text with HTML removed
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}
