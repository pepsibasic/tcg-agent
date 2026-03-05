import { z } from 'zod'
import { generateStructured } from './client.js'
import { scrubCompliance } from './compliance.js'
import type { LLMProviderConfig, AnalysisFailure } from './types.js'
import type { ComplianceViolation } from './compliance.js'

export type LLMLogger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

export interface GenerateWithRetryOptions<T> {
  schema: z.ZodSchema<T>
  prompt: string
  system?: string
  config: LLMProviderConfig
  narrativeFields: string[]
  partialFallback?: Record<string, unknown>
  logger?: LLMLogger
  cardId?: string
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

    const startTime = Date.now()
    const result = await generateStructured({
      schema: options.schema,
      prompt: currentPrompt,
      system: options.system,
      config: options.config,
    })
    const latencyMs = Date.now() - startTime

    if (result.success) {
      if (options.logger) {
        const logObj: Record<string, unknown> = {
          card_id: options.cardId,
          model: options.config.model,
          attempts: attempt,
          latency_ms: latencyMs,
        }
        const resultWithUsage = result as unknown as Record<string, unknown>
        if (resultWithUsage['usage'] && typeof resultWithUsage['usage'] === 'object') {
          const usage = resultWithUsage['usage'] as Record<string, unknown>
          if (usage['promptTokens'] !== undefined) logObj['input_tokens'] = usage['promptTokens']
          if (usage['completionTokens'] !== undefined) logObj['output_tokens'] = usage['completionTokens']
        }
        options.logger.info(logObj, 'llm_generation_success')
      }

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

    if (options.logger) {
      options.logger.warn(
        {
          card_id: options.cardId,
          model: options.config.model,
          attempt,
          error_path: result.failure.reason.slice(0, 500),
          raw_output_truncated: JSON.stringify(result.failure.partial).slice(0, 500),
        },
        'llm_validation_failure'
      )
    }
  }

  if (options.logger) {
    options.logger.warn(
      {
        card_id: options.cardId,
        model: options.config.model,
        total_attempts: maxAttempts,
        final_error: lastError.slice(0, 500),
      },
      'llm_generation_exhausted'
    )
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
