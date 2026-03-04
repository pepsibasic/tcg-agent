import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import type { LLMProviderConfig, GenerateOptions, GenerateResult } from './types.js'

export function getModel(config: LLMProviderConfig): ReturnType<typeof openai> | ReturnType<typeof anthropic> {
  switch (config.provider) {
    case 'openai':
      return openai(config.model)
    case 'anthropic':
      return anthropic(config.model)
    default: {
      const _exhaustive: never = config.provider
      throw new Error(`Unknown LLM provider: ${_exhaustive}`)
    }
  }
}

export async function generateStructured<T>(
  options: GenerateOptions<T>
): Promise<GenerateResult<T>> {
  try {
    const model = getModel(options.config)
    const result = await generateObject({
      model,
      schema: options.schema,
      prompt: options.prompt,
      ...(options.system ? { system: options.system } : {}),
    })
    return { success: true, data: result.object }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      failure: {
        status: 'failed',
        reason,
        partial: null,
        retryable: true,
      },
    }
  }
}
