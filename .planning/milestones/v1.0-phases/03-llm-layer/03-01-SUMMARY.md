---
phase: 03-llm-layer
plan: "01"
subsystem: packages/agent/src/llm
tags: [llm, ai-sdk, sanitization, types, tdd]
dependency_graph:
  requires: []
  provides: [generateStructured, sanitizeInput, wrapUserInput, AnalysisFailure, LLMProviderConfig]
  affects: [packages/agent/src/llm/client.ts, packages/agent/src/llm/sanitize.ts, packages/agent/src/llm/types.ts]
tech_stack:
  added: [ai, "@ai-sdk/openai", "@ai-sdk/anthropic", zod]
  patterns: [Vercel AI SDK generateObject, provider-agnostic factory, XML input sanitization, TDD red-green]
key_files:
  created:
    - packages/agent/src/llm/types.ts
    - packages/agent/src/llm/client.ts
    - packages/agent/src/llm/sanitize.ts
    - packages/agent/src/llm/__tests__/sanitize.test.ts
    - packages/agent/src/llm/__tests__/client.test.ts
  modified:
    - packages/agent/package.json
    - packages/agent/tsconfig.json
    - pnpm-lock.yaml
decisions:
  - "Used Vercel AI SDK generateObject for provider-agnostic LLM calls — single import handles both OpenAI and Anthropic"
  - "Excluded __tests__ dirs from tsconfig build — prevents future-plan stub test files from breaking tsc compilation"
  - "Added zod as direct dependency of agent package — required for test files that use z.ZodError"
metrics:
  duration: "6min"
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_changed: 8
---

# Phase 3 Plan 01: LLM Client Abstraction and Input Sanitization Summary

Provider-agnostic `generateStructured<T>()` using Vercel AI SDK with XML input sanitization and `AnalysisFailure` type for Phase 4 orchestrator reuse.

## What Was Built

### packages/agent/src/llm/types.ts
- `LLMProvider` type: `'openai' | 'anthropic'`
- `LLMProviderConfig` interface with provider, model, apiKey, maxRetries, temperature
- `GenerateOptions<T>` interface with schema, prompt, system, config
- `AnalysisFailure` type: `{ status: 'failed', reason, partial, retryable }` — reusable by all Phase 4 orchestrators
- `GenerateResult<T>` = discriminated union `{ success: true, data: T } | { success: false, failure: AnalysisFailure }`
- `DEFAULT_LLM_CONFIG` with provider 'openai', model 'gpt-4o-mini', maxRetries 2

### packages/agent/src/llm/client.ts
- `getModel(config)` — factory returning `openai(model)` or `anthropic(model)` based on config.provider; throws on invalid provider with exhaustive TypeScript never check
- `generateStructured<T>(options)` — calls Vercel AI SDK `generateObject`, returns `{ success: true, data }` on success, `{ success: false, failure }` on any error with `retryable: true`

### packages/agent/src/llm/sanitize.ts
- `sanitizeInput(value)` — XML-escapes `<>&'"`, returns `''` for null/undefined
- `wrapUserInput(type, value)` — sanitizes then wraps: `<user_input type="...">...</user_input>`

### Test Coverage (25 new tests)
- 14 sanitize tests: all 5 XML chars, null/undefined/empty, clean strings, script injection
- 11 client tests: DEFAULT_LLM_CONFIG defaults, AnalysisFailure type structure, getModel provider routing, generateStructured success/failure paths with mocked AI SDK

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added zod as direct agent dependency**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `import { z } from 'zod'` in client.test.ts failed — zod only available transitively via @tcg/schemas, not resolvable by vitest in the agent package
- **Fix:** `pnpm add zod --filter @tcg/agent`
- **Files modified:** packages/agent/package.json, pnpm-lock.yaml
- **Commit:** 39a9694

**2. [Rule 3 - Blocking] Excluded test files from tsconfig build**
- **Found during:** Task 1 build verification
- **Issue:** Pre-existing stub test files (`compliance.test.ts`, `prompts.test.ts`) for future plans (03-02) imported modules that don't exist yet, breaking `tsc` compilation
- **Fix:** Added `"exclude": ["src/**/__tests__/**", "src/**/*.test.ts"]` to tsconfig.json
- **Files modified:** packages/agent/tsconfig.json
- **Commit:** 39a9694

## Verification

- `pnpm build`: 4 tasks successful (full TURBO cache)
- `pnpm --filter '@tcg/agent' test`: 9 test files, 146 tests — all pass
- `generateStructured`, `sanitizeInput`, `wrapUserInput`, `AnalysisFailure` all exported from packages/agent/src/llm/

## Self-Check: PASSED
