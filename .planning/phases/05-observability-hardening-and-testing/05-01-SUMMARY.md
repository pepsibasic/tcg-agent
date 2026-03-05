---
phase: 05-observability-hardening-and-testing
plan: "01"
subsystem: observability
tags: [logging, request-id, audit-trail, llm-diagnostics]
dependency_graph:
  requires: []
  provides: [request-id-tracing, actions-audit-log, llm-failure-diagnostics]
  affects: [apps/api, packages/agent]
tech_stack:
  added: []
  patterns: [structured-logging, request-id-propagation, optional-logger-injection]
key_files:
  created: []
  modified:
    - apps/api/src/server.ts
    - apps/api/src/routes/agent.ts
    - apps/api/src/routes/actions.ts
    - packages/agent/src/llm/generate.ts
    - apps/api/src/__tests__/routes/agent.test.ts
decisions:
  - "genReqId reads X-Request-Id header from upstream gateway or generates UUID — onSend hook reflects it back on every response"
  - "RECOMMENDATION audit entry written to actionsLog on card analysis — action types array stored in agentRecommended JSON"
  - "LLMLogger is a minimal interface (info/warn only) — keeps agent package decoupled from Fastify"
  - "Logger optional with if(options.logger) guards — all existing callers work unchanged"
metrics:
  duration: "4min"
  completed: "2026-03-05"
  tasks: 2
  files: 5
---

# Phase 5 Plan 01: Structured Logging, Request ID Tracing, and LLM Diagnostics Summary

**One-liner:** X-Request-Id propagation via Fastify genReqId/onSend, actions audit trail on card analysis, and optional LLM logger with latency/token/failure diagnostics in generateWithRetry.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Request ID propagation and structured logging hooks | 73cc9b6 | server.ts, routes/agent.ts, routes/actions.ts |
| 2 | LLM failure diagnostics and token/latency logging | 9fecb17 | packages/agent/src/llm/generate.ts |

## What Was Built

**Task 1 — Request ID + Audit Trail:**
- `server.ts`: Added `genReqId` option (reads `X-Request-Id` header or generates `crypto.randomUUID()`) and `onSend` hook that reflects `request.id` back as `X-Request-Id` on every response.
- `routes/agent.ts`: After card analysis succeeds, writes a `RECOMMENDATION` entry to `actionsLog` with `agentRecommended: { actions: [...] }`. All agent routes log `agent_analysis_complete` via `request.log.info`.
- `routes/actions.ts`: Added `request.log.info({ action_type, card_id, user_id }, 'action_executed')` after logging the action.

**Task 2 — LLM Diagnostics:**
- Added `LLMLogger` interface and optional `logger`/`cardId` fields to `GenerateWithRetryOptions`.
- On success: logs `llm_generation_success` with `latency_ms`, `attempts`, `input_tokens`, `output_tokens` (when SDK provides usage).
- On validation failure: logs `llm_validation_failure` with `error_path` and `raw_output_truncated` (both truncated to 500 chars).
- After retry exhaustion: logs `llm_generation_exhausted` with `total_attempts` and `final_error`.
- All logging is guarded by `if (options.logger)` — backward compatible.

## Test Results

- API: 24/24 tests pass
- Agent: 173/173 tests pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added @tcg/db mock to agent route test**
- **Found during:** Task 1
- **Issue:** `agent.ts` now imports `prisma` from `@tcg/db` for the actionsLog RECOMMENDATION write. The existing test had no `@tcg/db` mock, causing the test suite to fail when Prisma's generated client wasn't present in the test environment.
- **Fix:** Added `vi.mock('@tcg/db', ...)` with a stubbed `actionsLog.create` to `apps/api/src/__tests__/routes/agent.test.ts`.
- **Files modified:** `apps/api/src/__tests__/routes/agent.test.ts`
- **Commit:** 73cc9b6

## Requirements Satisfied

- API-07: Every endpoint emits structured logs with request ID (via Fastify `request.log` + `genReqId`)
- OBS-01: Request ID traces across all agent operations via `request.log` propagation
- OBS-02: `actionsLog` records recommended actions on analysis and executed actions on execute
- OBS-03: LLM validation failures logged with `card_id`, `model`, `error_path`, `raw_output_truncated`
