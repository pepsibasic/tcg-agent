import { z } from 'zod'

export type LLMProvider = 'openai' | 'anthropic'

export interface LLMProviderConfig {
  provider: LLMProvider
  model: string
  apiKey?: string
  maxRetries?: number
  temperature?: number
}

export interface GenerateOptions<T> {
  schema: z.ZodSchema<T>
  prompt: string
  system?: string
  config: LLMProviderConfig
}

export type AnalysisFailure = {
  status: 'failed'
  reason: string
  partial: Record<string, unknown> | null
  retryable: boolean
}

export type GenerateResult<T> =
  | { success: true; data: T }
  | { success: false; failure: AnalysisFailure }

export const DEFAULT_LLM_CONFIG: LLMProviderConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  maxRetries: 2,
}
