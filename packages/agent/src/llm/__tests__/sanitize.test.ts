import { describe, it, expect } from 'vitest'
import { sanitizeInput, wrapUserInput } from '../sanitize.js'

describe('sanitizeInput', () => {
  it('escapes < character', () => {
    expect(sanitizeInput('<')).toBe('&lt;')
  })

  it('escapes > character', () => {
    expect(sanitizeInput('>')).toBe('&gt;')
  })

  it('escapes & character', () => {
    expect(sanitizeInput('&')).toBe('&amp;')
  })

  it("escapes single quote '", () => {
    expect(sanitizeInput("'")).toBe('&apos;')
  })

  it('escapes double quote "', () => {
    expect(sanitizeInput('"')).toBe('&quot;')
  })

  it('escapes all 5 XML chars in one string', () => {
    expect(sanitizeInput('<>&\'"')).toBe('&lt;&gt;&amp;&apos;&quot;')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeInput('')).toBe('')
  })

  it('returns empty string for null', () => {
    expect(sanitizeInput(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(sanitizeInput(undefined)).toBe('')
  })

  it('returns clean string unchanged', () => {
    expect(sanitizeInput('Charizard')).toBe('Charizard')
  })

  it('escapes dangerous script content', () => {
    expect(sanitizeInput('Charizard <script>alert(1)</script>')).toBe(
      'Charizard &lt;script&gt;alert(1)&lt;/script&gt;'
    )
  })
})

describe('wrapUserInput', () => {
  it('wraps with correct tag format', () => {
    expect(wrapUserInput('card_name', 'Charizard')).toBe(
      '<user_input type="card_name">Charizard</user_input>'
    )
  })

  it('escapes dangerous content inside tags', () => {
    expect(wrapUserInput('card_name', 'Charizard <script>')).toBe(
      '<user_input type="card_name">Charizard &lt;script&gt;</user_input>'
    )
  })

  it('produces correct output for type="card_name"', () => {
    const result = wrapUserInput('card_name', 'Pikachu & Friends')
    expect(result).toBe('<user_input type="card_name">Pikachu &amp; Friends</user_input>')
  })
})
