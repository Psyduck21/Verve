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
    
    console.log('RRule validation attempt:', {
      rule,
      rruleType: typeof RRule,
      hasFromString: typeof RRule.fromString === 'function',
      hasRRule: !!RRule.RRule,
      rruleRRuleType: RRule.RRule ? typeof RRule.RRule : 'none',
      hasDefault: !!RRule.default,
      defaultType: RRule.default ? typeof RRule.default : 'none'
    })
    
    // Handle different RRule module structures more flexibly
    let parsed
    if (typeof RRule === 'function') {
      // RRule is a constructor/function
      console.log('Using RRule as constructor')
      parsed = new RRule(rule)
    } else if (typeof RRule.fromString === 'function') {
      // RRule has fromString method
      console.log('Using RRule.fromString')
      parsed = RRule.fromString(rule)
    } else if (RRule.RRule && typeof RRule.RRule === 'function') {
      // RRule.RRule is the constructor
      console.log('Using RRule.RRule as constructor')
      parsed = new RRule.RRule(rule)
    } else if (RRule.RRule && typeof RRule.RRule.fromString === 'function') {
      // RRule.RRule has fromString method
      console.log('Using RRule.RRule.fromString')
      parsed = RRule.RRule.fromString(rule)
    } else if (RRule.default && typeof RRule.default === 'function') {
      // RRule.default is the constructor
      console.log('Using RRule.default as constructor')
      parsed = new RRule.default(rule)
    } else if (RRule.default && typeof RRule.default.fromString === 'function') {
      // RRule.default has fromString method
      console.log('Using RRule.default.fromString')
      parsed = RRule.default.fromString(rule)
    } else {
      // Try to use the module as-is with direct construction
      console.log('Trying to use RRule module as-is')
      try {
        parsed = new RRule(rule)
      } catch (e) {
        console.error('All RRule parsing attempts failed:', e)
        return { valid: false, error: 'RRule module structure not recognized' }
      }
    }
    
    if (!parsed || typeof parsed.origOptions === 'undefined') {
      console.error('Parsed RRule missing origOptions:', parsed)
      return { valid: false, error: 'Invalid RRule format' }
    }

    // Validate required fields
    if (!parsed.origOptions.freq) {
      console.error('Missing frequency in RRule options:', parsed.origOptions)
      return { valid: false, error: 'Missing frequency (FREQ) in recurrence rule' }
    }

    console.log('RRule validation successful')
    return { valid: true }
  } catch (error: any) {
    console.error('RRule validation error:', error)
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