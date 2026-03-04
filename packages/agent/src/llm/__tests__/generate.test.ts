import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { generateWithRetry } from '../generate.js'
import type { LLMProviderConfig } from '../types.js'

vi.mock('../client.js', () => ({
  generateStructured: vi.fn(),
}))

vi.mock('../compliance.js', () => ({
  scrubCompliance: vi.fn((data, _fields) => ({ data, violations: [] })),
}))

import { generateStructured } from '../client.js'
import { scrubCompliance } from '../compliance.js'

const mockGenerateStructured = vi.mocked(generateStructured)
const mockScrubCompliance = vi.mocked(scrubCompliance)

const testSchema = z.object({ name: z.string(), value: z.number() })
type TestData = z.infer<typeof testSchema>

const baseConfig: LLMProviderConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  maxRetries: 2,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockScrubCompliance.mockImplementation((data, _fields) => ({ data, violations: [] }))
})

describe('generateWithRetry', () => {
  it('returns scrubbed data with attempts=1 on first-attempt success', async () => {
    const successData: TestData = { name: 'card', value: 42 }
    mockGenerateStructured.mockResolvedValueOnce({ success: true, data: successData })
    mockScrubCompliance.mockReturnValueOnce({ data: successData, violations: [] })

    const result = await generateWithRetry({
      schema: testSchema,
      prompt: 'analyze this card',
      config: baseConfig,
      narrativeFields: ['name'],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(successData)
      expect(result.attempts).toBe(1)
      expect(result.complianceViolations).toEqual([])
    }
  })

  it('collects compliance violations from scrubCompliance on success', async () => {
    const successData: TestData = { name: 'buy now!', value: 10 }
    const scrubbedData: TestData = { name: '[compliance redacted]', value: 10 }
    const violations = [{ field: 'name', original: 'buy now!', replacement: '[compliance redacted]' }]
    mockGenerateStructured.mockResolvedValueOnce({ success: true, data: successData })
    mockScrubCompliance.mockReturnValueOnce({ data: scrubbedData, violations })

    const result = await generateWithRetry({
      schema: testSchema,
      prompt: 'test',
      config: baseConfig,
      narrativeFields: ['name'],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(scrubbedData)
      expect(result.complianceViolations).toEqual(violations)
    }
  })

  it('retries on failure and succeeds on second attempt with error in prompt', async () => {
    const successData: TestData = { name: 'card', value: 42 }
    mockGenerateStructured
      .mockResolvedValueOnce({ success: false, failure: { status: 'failed', reason: 'Zod validation error: name is required', partial: null, retryable: true } })
      .mockResolvedValueOnce({ success: true, data: successData })

    const result = await generateWithRetry({
      schema: testSchema,
      prompt: 'analyze this card',
      config: baseConfig,
      narrativeFields: ['name'],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.attempts).toBe(2)
    }

    // Second call prompt should contain the error text
    const secondCallArgs = mockGenerateStructured.mock.calls[1]![0]
    expect(secondCallArgs.prompt).toContain('Zod validation error: name is required')
    expect(secondCallArgs.prompt).toContain('Previous attempt failed validation')
  })

  it('truncates error text to 500 chars in retry prompt', async () => {
    const longError = 'x'.repeat(600)
    mockGenerateStructured
      .mockResolvedValueOnce({ success: false, failure: { status: 'failed', reason: longError, partial: null, retryable: true } })
      .mockResolvedValueOnce({ success: true, data: { name: 'card', value: 1 } })

    await generateWithRetry({
      schema: testSchema,
      prompt: 'test',
      config: baseConfig,
      narrativeFields: [],
    })

    const secondCallPrompt = mockGenerateStructured.mock.calls[1]![0].prompt
    // The error in the prompt should be truncated to 500 chars
    expect(secondCallPrompt).toContain('x'.repeat(500))
    expect(secondCallPrompt).not.toContain('x'.repeat(501))
  })

  it('returns AnalysisFailure after all attempts exhausted with retryable=true', async () => {
    mockGenerateStructured
      .mockResolvedValueOnce({ success: false, failure: { status: 'failed', reason: 'error 1', partial: null, retryable: true } })
      .mockResolvedValueOnce({ success: false, failure: { status: 'failed', reason: 'error 2', partial: null, retryable: true } })
      .mockResolvedValueOnce({ success: false, failure: { status: 'failed', reason: 'error 3', partial: null, retryable: true } })

    const result = await generateWithRetry({
      schema: testSchema,
      prompt: 'test',
      config: baseConfig,
      narrativeFields: [],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.failure.status).toBe('failed')
      expect(result.failure.retryable).toBe(true)
      expect(result.attempts).toBe(3)
    }
  })

  it('includes partialFallback in failure result when provided', async () => {
    mockGenerateStructured.mockResolvedValue({ success: false, failure: { status: 'failed', reason: 'err', partial: null, retryable: true } })
    const partialFallback = { card_id: 'abc123', actions: ['WATCHLIST'] }

    const result = await generateWithRetry({
      schema: testSchema,
      prompt: 'test',
      config: { ...baseConfig, maxRetries: 0 },
      narrativeFields: [],
      partialFallback,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.failure.partial).toEqual(partialFallback)
    }
  })

  it('sets partial to null in failure result when partialFallback not provided', async () => {
    mockGenerateStructured.mockResolvedValue({ success: false, failure: { status: 'failed', reason: 'err', partial: null, retryable: true } })

    const result = await generateWithRetry({
      schema: testSchema,
      prompt: 'test',
      config: { ...baseConfig, maxRetries: 0 },
      narrativeFields: [],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.failure.partial).toBeNull()
    }
  })

  it('calls scrubCompliance with narrativeFields on success', async () => {
    mockGenerateStructured.mockResolvedValueOnce({ success: true, data: { name: 'card', value: 1 } })

    await generateWithRetry({
      schema: testSchema,
      prompt: 'test',
      config: baseConfig,
      narrativeFields: ['name', 'description'],
    })

    expect(mockScrubCompliance).toHaveBeenCalledWith(
      { name: 'card', value: 1 },
      ['name', 'description']
    )
  })

  it('makes maxRetries+1 total attempts', async () => {
    mockGenerateStructured.mockResolvedValue({ success: false, failure: { status: 'failed', reason: 'err', partial: null, retryable: true } })

    await generateWithRetry({
      schema: testSchema,
      prompt: 'test',
      config: { ...baseConfig, maxRetries: 1 },
      narrativeFields: [],
    })

    expect(mockGenerateStructured).toHaveBeenCalledTimes(2)
  })
})
