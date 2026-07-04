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
    
    // Handle different RRule module structures
    let parsed
    if (typeof RRule.fromString === 'function') {
      parsed = RRule.fromString(rule)
    } else if (RRule.RRule && typeof RRule.RRule.fromString === 'function') {
      parsed = RRule.RRule.fromString(rule)
    } else if (RRule.default && typeof RRule.default.fromString === 'function') {
      parsed = RRule.default.fromString(rule)
    } else {
      return { valid: false, error: 'RRule module structure not recognized' }
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