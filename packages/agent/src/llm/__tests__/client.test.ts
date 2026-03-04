import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { DEFAULT_LLM_CONFIG, type AnalysisFailure, type GenerateResult } from '../types.js'
import { getModel, generateStructured } from '../client.js'

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => ({ provider: 'openai', model })),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn((model: string) => ({ provider: 'anthropic', model })),
}))

describe('DEFAULT_LLM_CONFIG', () => {
  it('has provider openai', () => {
    expect(DEFAULT_LLM_CONFIG.provider).toBe('openai')
  })

  it('has model gpt-4o-mini', () => {
    expect(DEFAULT_LLM_CONFIG.model).toBe('gpt-4o-mini')
  })

  it('has maxRetries 2', () => {
    expect(DEFAULT_LLM_CONFIG.maxRetries).toBe(2)
  })
})

describe('AnalysisFailure type structure (compile-time)', () => {
  it('can construct a valid AnalysisFailure', () => {
    const failure: AnalysisFailure = {
      status: 'failed',
      reason: 'validation error',
      partial: null,
      retryable: true,
    }
    expect(failure.status).toBe('failed')
    expect(failure.retryable).toBe(true)
    expect(failure.partial).toBeNull()
  })

  it('allows partial with card_id and actions', () => {
    const failure: AnalysisFailure = {
      status: 'failed',
      reason: 'partial',
      partial: { card_id: 'abc', actions: [] },
      retryable: false,
    }
    expect(failure.partial).toMatchObject({ card_id: 'abc' })
  })
})

describe('getModel', () => {
  it('returns openai model for openai config', () => {
    const model = getModel({ provider: 'openai', model: 'gpt-4o-mini' })
    expect(model).toMatchObject({ provider: 'openai', model: 'gpt-4o-mini' })
  })

  it('returns anthropic model for anthropic config', () => {
    const model = getModel({ provider: 'anthropic', model: 'claude-3-haiku-20240307' })
    expect(model).toMatchObject({ provider: 'anthropic', model: 'claude-3-haiku-20240307' })
  })

  it('throws on invalid provider', () => {
    expect(() => getModel({ provider: 'invalid' as 'openai', model: 'x' })).toThrow()
  })
})

describe('generateStructured', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success result with valid data', async () => {
    const { generateObject } = await import('ai')
    const mockSchema = z.object({ name: z.string() })
    vi.mocked(generateObject).mockResolvedValueOnce({ object: { name: 'Charizard' } } as never)

    const result = await generateStructured({
      schema: mockSchema,
      prompt: 'test prompt',
      config: DEFAULT_LLM_CONFIG,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ name: 'Charizard' })
    }
  })

  it('returns failure result on ZodError with retryable=true', async () => {
    const { generateObject } = await import('ai')
    const zodError = new z.ZodError([{ code: 'invalid_type', expected: 'string', received: 'number', path: ['name'], message: 'Expected string' }])
    vi.mocked(generateObject).mockRejectedValueOnce(zodError)

    const result: GenerateResult<unknown> = await generateStructured({
      schema: z.object({ name: z.string() }),
      prompt: 'test prompt',
      config: DEFAULT_LLM_CONFIG,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.failure.status).toBe('failed')
      expect(result.failure.retryable).toBe(true)
      expect(result.failure.partial).toBeNull()
    }
  })

  it('returns failure result on generic AI SDK error with retryable=true', async () => {
    const { generateObject } = await import('ai')
    vi.mocked(generateObject).mockRejectedValueOnce(new Error('API rate limit'))

    const result = await generateStructured({
      schema: z.object({ val: z.number() }),
      prompt: 'test',
      config: DEFAULT_LLM_CONFIG,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.failure.reason).toContain('API rate limit')
      expect(result.failure.retryable).toBe(true)
    }
  })
})
