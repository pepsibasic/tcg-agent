---
phase: 03-llm-layer
plan: "03"
subsystem: packages/agent/src/llm
tags: [llm, retry, compliance, barrel-exports, tdd]
dependency_graph:
  requires:
    - phase: 03-llm-layer-01
      provides: generateStructured, LLMProviderConfig, AnalysisFailure
    - phase: 03-llm-layer-02
      provides: scrubCompliance, renderPrompt, PROMPTS
  provides:
    - generateWithRetry (retry loop with Zod error feedback and compliance scrub)
    - Full LLM layer barrel export via packages/agent/src/llm/index.ts
    - All LLM exports re-exported from packages/agent barrel
  affects:
    - Phase 4 agent orchestrators (call generateWithRetry as production entry point)
    - Phase 5 observability (complianceViolations returned on every success)
tech_stack:
  added: []
  patterns:
    - Retry loop with Zod error feedback appended to subsequent prompt attempts
    - Error truncation to 500 chars prevents runaway prompt lengths
    - Compliance scrub on every successful result before returning to caller
    - AnalysisFailure with partialFallback for rules-engine partial results
    - TDD red-green with vi.mock for generateStructured and scrubCompliance
key_files:
  created:
    - packages/agent/src/llm/generate.ts
    - packages/agent/src/llm/index.ts
    - packages/agent/src/llm/__tests__/generate.test.ts
  modified:
    - packages/agent/src/index.ts
decisions:
  - "maxAttempts = maxRetries + 1 (default config.maxRetries=2 gives 3 total attempts)"
  - "Retry prompt appends error to original prompt (not replacing it) — preserves full context"
  - "Error truncated to 500 chars per CONTEXT.md decision to prevent prompt bloat"
  - "partialFallback propagates to AnalysisFailure.partial on exhaustion for rules-engine downstream"
  - "Barrel index.ts re-exports types with export type for compliance with isolatedModules"
metrics:
  duration: "5min"
  completed_date: "2026-03-04"
  tasks_completed: 1
  files_changed: 4
---

# Phase 3 Plan 03: Retry/Fallback Loop with Compliance Integration Summary

`generateWithRetry` composing client, prompts, and compliance into the production-ready function — retry loop with 500-char truncated Zod error feedback, compliance scrub on every successful response, and typed `AnalysisFailure` on exhaustion with partial fallback support.

## What Was Built

### packages/agent/src/llm/generate.ts
- `GenerateWithRetryOptions<T>` interface extending `GenerateOptions<T>` with `narrativeFields` and optional `partialFallback`
- `GenerateWithRetryResult<T>` discriminated union: success with `data`, `complianceViolations[]`, `attempts`; failure with `AnalysisFailure`, `attempts`
- `generateWithRetry<T>`: loops up to `maxRetries+1` times; builds retry prompt by appending truncated error to original; calls `scrubCompliance` on every success; returns `AnalysisFailure` with `partial = partialFallback ?? null` after exhaustion

### packages/agent/src/llm/index.ts
- Barrel re-exporting all LLM layer modules: types, client, sanitize, prompts, compliance, generate
- Uses `export type` for interface/type exports for isolatedModules compliance

### packages/agent/src/index.ts (modified)
- Added `export * from './llm/index.js'` so `@tcg/agent` consumers get full LLM layer

### Test Coverage (9 new tests, 155 total)
- First-attempt success: returns scrubbed data, attempts=1
- Compliance violations collected from scrubCompliance and passed through
- Retry on failure: second call prompt contains error text + "Previous attempt failed validation"
- Error truncation: retry prompt contains exactly 500 chars of error, not 501+
- All 3 attempts exhausted: AnalysisFailure with retryable=true, attempts=3
- partialFallback included in failure.partial when provided
- failure.partial is null when partialFallback not provided
- scrubCompliance called with correct narrativeFields
- maxRetries=1 config results in exactly 2 total generateStructured calls

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `pnpm build`: 4 tasks successful, no type errors
- `pnpm --filter '@tcg/agent' test`: 10 test files, 155 tests — all pass
- `generateWithRetry`, `renderPrompt`, `scrubCompliance`, `sanitizeInput` all resolvable from `@tcg/agent`

## Self-Check: PASSED
