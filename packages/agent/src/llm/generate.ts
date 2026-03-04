import { z } from 'zod'
import { generateStructured } from './client.js'
import { scrubCompliance } from './compliance.js'
import type { LLMProviderConfig, AnalysisFailure } from './types.js'
import type { ComplianceViolation } from './compliance.js'

export interface GenerateWithRetryOptions<T> {
  schema: z.ZodSchema<T>
  prompt: string
  system?: string
  config: LLMProviderConfig
  narrativeFields: string[]
  partialFallback?: Record<string, unknown>
}

export type GenerateWithRetryResult<T> =
  | {
      success: true
      data: T
      complianceViolations: ComplianceViolation[]
      attempts: number
    }
  | {
      success: false
      failure: AnalysisFailure
      attempts: number
    }

export async function generateWithRetry<T>(
  options: GenerateWithRetryOptions<T>
): Promise<GenerateWithRetryResult<T>> {
  const maxAttempts = (options.config.maxRetries ?? 2) + 1
  let lastError = ''
  let currentPrompt = options.prompt

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      const truncatedError = lastError.slice(0, 500)
      currentPrompt =
        options.prompt +
        `\n\nPrevious attempt failed validation. Error: ${truncatedError}\nPlease fix these issues and try again.`
    }

    const result = await generateStructured({
      schema: options.schema,
      prompt: currentPrompt,
      system: options.system,
      config: options.config,
    })

    if (result.success) {
      const { data, violations } = scrubCompliance(
        result.data as Record<string, unknown>,
        options.narrativeFields
      )
      return {
        success: true,
        data: data as T,
        complianceViolations: violations,
        attempts: attempt,
      }
    }

    lastError = result.failure.reason
  }

  return {
    success: false,
    failure: {
      status: 'failed',
      reason: lastError,
      partial: options.partialFallback ?? null,
      retryable: true,
    },
    attempts: maxAttempts,
  }
}
