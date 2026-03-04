/**
 * Compliance guard that scrubs financial advice language from LLM outputs.
 *
 * Scans narrative fields only — numeric/id fields are untouched.
 * Every scrub is logged with field name, original text, and replacement text
 * to feed Phase 5 observability.
 */

export type ComplianceViolation = {
  field: string;
  original: string;
  replacement: string;
};

export type ComplianceScrubResult = {
  text: string;
  violations: ComplianceViolation[];
};

type BlocklistEntry = {
  pattern: RegExp;
  replacement: string;
};

export const BLOCKLIST: BlocklistEntry[] = [
  {
    pattern: /will increase(\s+in\s+value)?/gi,
    replacement: 'shows positive market signals',
  },
  {
    pattern: /guaranteed\s+(return|profit|gain)/gi,
    replacement: 'historical performance suggests',
  },
  {
    pattern: /\bbuy\s+now\b/gi,
    replacement: 'consider acquiring',
  },
  {
    pattern: /\bsell\s+immediately\b/gi,
    replacement: 'consider listing',
  },
  {
    pattern: /\bshould\s+(buy|sell|hold)\b/gi,
    replacement: 'you might consider',
  },
  {
    pattern: /\binvestment\s+advice\b/gi,
    replacement: 'market observations',
  },
  {
    pattern: /\bprofit\b/gi,
    replacement: 'potential value',
  },
  {
    pattern: /\bguaranteed\b/gi,
    replacement: 'historically consistent',
  },
  {
    pattern: /\bwill\s+(definitely|certainly|surely)\b/gi,
    replacement: 'may potentially',
  },
];

/**
 * Scrub a single text string against the compliance blocklist.
 *
 * @param text - The text to scrub
 * @param field - The field name (for violation logging)
 * @returns Scrubbed text and list of violations found
 */
export function scrubText(text: string, field: string): ComplianceScrubResult {
  const violations: ComplianceViolation[] = [];
  let scrubbed = text;

  for (const entry of BLOCKLIST) {
    // Reset lastIndex for global regexes
    entry.pattern.lastIndex = 0;
    const matches = scrubbed.match(entry.pattern);
    if (matches) {
      for (const match of matches) {
        violations.push({
          field,
          original: match,
          replacement: entry.replacement,
        });
      }
      // Reset again before replace
      entry.pattern.lastIndex = 0;
      scrubbed = scrubbed.replace(entry.pattern, entry.replacement);
    }
  }

  return { text: scrubbed, violations };
}

/**
 * Scrub compliance violations from a data object, scanning only specified narrative fields.
 *
 * Handles string fields and string-array fields (e.g., reasoning_bullets).
 * Skips numeric, boolean, null, and non-listed fields entirely.
 *
 * @param data - The LLM output object to scrub
 * @param narrativeFields - Field names to scan (all other fields are untouched)
 * @returns Modified data with violations replaced, plus full violation log
 */
export function scrubCompliance<T extends Record<string, unknown>>(
  data: T,
  narrativeFields: string[]
): { data: T; violations: ComplianceViolation[] } {
  const allViolations: ComplianceViolation[] = [];
  const result = { ...data };

  for (const field of narrativeFields) {
    if (!(field in result)) continue;

    const value = result[field];

    if (typeof value === 'string') {
      const { text, violations } = scrubText(value, field);
      (result as Record<string, unknown>)[field] = text;
      allViolations.push(...violations);
    } else if (Array.isArray(value)) {
      const scrubbed: unknown[] = [];
      for (const element of value) {
        if (typeof element === 'string') {
          const { text, violations } = scrubText(element, field);
          scrubbed.push(text);
          allViolations.push(...violations);
        } else {
          scrubbed.push(element);
        }
      }
      (result as Record<string, unknown>)[field] = scrubbed;
    }
    // Non-string, non-array fields are skipped (numeric, boolean, null, objects)
  }

  return { data: result as T, violations: allViolations };
}
