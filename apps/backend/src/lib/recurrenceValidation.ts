import { getRRule } from './lazyLoader'

export async function validateRecurrenceRule(rule: string): Promise<{ valid: boolean; error?: string }> {
  if (!rule || rule.trim().length === 0) {
    return { valid: false, error: 'Empty recurrence rule' }
  }

  if (rule.length > 500) {
    return { valid: false, error: 'Recurrence rule too complex (max 500 characters)' }
  }

  try {
    const RRule = await getRRule()
    
    // Handle different RRule module structures more flexibly
    let parsed
    if (typeof RRule === 'function') {
      // RRule is a constructor/function
      parsed = new RRule(rule)
    } else if (typeof RRule.fromString === 'function') {
      // RRule has fromString method
      parsed = RRule.fromString(rule)
    } else if (RRule.RRule && typeof RRule.RRule === 'function') {
      // RRule.RRule is the constructor
      parsed = new RRule.RRule(rule)
    } else if (RRule.RRule && typeof RRule.RRule.fromString === 'function') {
      // RRule.RRule has fromString method
      parsed = RRule.RRule.fromString(rule)
    } else if (RRule.default && typeof RRule.default === 'function') {
      // RRule.default is the constructor
      parsed = new RRule.default(rule)
    } else if (RRule.default && typeof RRule.default.fromString === 'function') {
      // RRule.default has fromString method
      parsed = RRule.default.fromString(rule)
    } else {
      // Try to use the module as-is with direct construction
      try {
        parsed = new RRule(rule)
      } catch (e) {
        return { valid: false, error: 'RRule module structure not recognized' }
      }
    }
    
    if (!parsed || typeof parsed.origOptions === 'undefined') {
      return { valid: false, error: 'Invalid RRule format' }
    }

    // Validate required fields
    if (!parsed.origOptions.freq) {
      return { valid: false, error: 'Missing frequency (FREQ) in recurrence rule' }
    }

    return { valid: true }
  } catch (error: any) {
    return { valid: false, error: `RRule parsing failed: ${error.message}` }
  }
}

export function standardizeRecurrenceRule(rule: string): string {
  if (!rule || rule.trim().length === 0) {
    return rule
  }

  const lowerRule = rule.toLowerCase()
  
  const mappings: Record<string, string> = {
    'every day': 'FREQ=DAILY',
    'every week': 'FREQ=WEEKLY',
    'every month': 'FREQ=MONTHLY',
    'daily': 'FREQ=DAILY',
    'weekly': 'FREQ=WEEKLY',
    'monthly': 'FREQ=MONTHLY',
    'each day': 'FREQ=DAILY',
    'each week': 'FREQ=WEEKLY',
    'each month': 'FREQ=MONTHLY',
  }
  
  for (const [natural, rrule] of Object.entries(mappings)) {
    if (lowerRule.includes(natural)) {
      return rrule
    }
  }
  
  return rule // Return original if no mapping found
}