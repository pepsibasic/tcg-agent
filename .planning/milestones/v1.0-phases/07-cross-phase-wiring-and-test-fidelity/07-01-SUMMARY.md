---
phase: 07-cross-phase-wiring-and-test-fidelity
plan: 01
subsystem: agent-orchestrators, api-routes
tags: [vault-conversion, logger-threading, actionsLog, observability, cross-phase-wiring]
dependency_graph:
  requires: []
  provides:
    - vault conversion candidates surfaced in portfolio summary response
    - LLM diagnostic logger threading via request.log through all orchestrators
    - batch card analysis RECOMMENDATION audit trail in actionsLog
  affects:
    - packages/agent/src/orchestrators/portfolio-summary.ts
    - packages/agent/src/orchestrators/card-analysis.ts
    - packages/agent/src/orchestrators/archetype.ts
    - apps/api/src/routes/agent.ts
tech_stack:
  added: []
  patterns:
    - LLMLogger optional param on all orchestrators
    - for-of loop pattern (not .map) to avoid TS7006 implicit-any in strict mode
    - request.log cast as LLMLogger in route handlers
key_files:
  created: []
  modified:
    - packages/agent/src/orchestrators/portfolio-summary.ts
    - packages/agent/src/orchestrators/card-analysis.ts
    - packages/agent/src/orchestrators/archetype.ts
    - packages/agent/src/llm/index.ts
    - apps/api/src/routes/agent.ts
    - packages/agent/src/__tests__/orchestrators/card-analysis.test.ts
    - apps/api/src/__tests__/routes/agent.test.ts
    - apps/api/src/__tests__/integration/journeys.test.ts
decisions:
  - LLMLogger exported from llm/index.ts barrel so route handlers can import it from @tcg/agent without reaching into internal paths
  - for-of loop used in externalCardInputs mapping to avoid TS7006 implicit-any (consistent with existing pattern in archetype.ts)
  - request.log cast as LLMLogger in route handlers — Pino logger has info/warn superset; cast avoids type gymnastics without losing safety
  - Test assertions updated to use expect.anything() for the logger arg — keeps test intent clear while accommodating new optional param
  - analyzeCardBatch writes actionsLog after collecting all chunk results — not inside analyzeCard — so single-card calls from tests remain clean
metrics:
  duration: ~8 minutes
  completed_date: "2026-03-05"
  tasks_completed: 2
  files_modified: 8
---

# Phase 7 Plan 01: Cross-Phase Wiring — Vault Conversion, Logger Threading, Batch Audit Trail Summary

**One-liner:** Vault conversion candidates wired into portfolio summary response, Fastify request.log threaded as LLMLogger through all 3 orchestrators, and batch card analysis writes RECOMMENDATION actionsLog entries per card.

## What Was Built

### Task 1: Wire Vault Conversion and Thread Logger Through Orchestrators

**portfolio-summary.ts:**
- Imported `computeVaultConversionCandidates` from `../rules/index.js`
- After fetching externalCards, builds an `ExternalCardInput[]` array (for-of loop to satisfy strict mode) and calls `computeVaultConversionCandidates`
- Both success and degraded return paths now include `vaultConversionCandidates: Action[]`
- `logger?: LLMLogger` added as optional second param; threaded into `generateWithRetry`

**card-analysis.ts:**
- `analyzeCard` gains optional `logger?: LLMLogger` 4th param; passed into `generateWithRetry` with `cardId`
- `analyzeCardBatch` gains optional `logger?: LLMLogger` 4th param; threaded into each `analyzeCard` call
- After all chunks resolve, writes a `prisma.actionsLog.create` RECOMMENDATION entry for each successful result (closes CARD-03 / OBS-02 gap)

**archetype.ts:**
- `detectArchetype` gains optional `logger?: LLMLogger` 2nd param; threaded into `generateWithRetry`

**llm/index.ts:**
- Added `LLMLogger` to the barrel export so route handlers can import it cleanly from `@tcg/agent`

### Task 2: Thread request.log from Fastify Routes

**apps/api/src/routes/agent.ts:**
- All 4 route handlers now pass `request.log as LLMLogger` as the logger argument:
  - `POST /agent/card/analyze` → `analyzeCard(cardId, userId, {}, request.log as LLMLogger)`
  - `POST /agent/card/analyze-batch` → `analyzeCardBatch(cardIds, userId, { source: 'pack_pull' }, request.log as LLMLogger)`
  - `POST /agent/portfolio/summary` → `summarizePortfolio(userId, request.log as LLMLogger)`
  - `POST /agent/archetype` → `detectArchetype(userId, request.log as LLMLogger)`
- `LLMLogger` imported from `@tcg/agent` (not an internal path)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TS7006 implicit-any on externalCards.map lambda**
- **Found during:** Task 1 build
- **Issue:** `externalCards.map((ec) => ...)` produced TS7006 in strict mode — same known issue that prompted the for-of loop pattern in Phase 4
- **Fix:** Replaced `.map()` with explicit typed `ExternalCardInput[]` array built via for-of loop (imported via inline `import()` type reference)
- **Files modified:** `packages/agent/src/orchestrators/portfolio-summary.ts`
- **Commit:** e661094

**2. [Rule 1 - Bug] card-analysis test missing actionsLog mock**
- **Found during:** Task 1 tests
- **Issue:** `analyzeCardBatch` now calls `prisma.actionsLog.create` but the test mock for `@tcg/db` only mocked `userCard.findFirst`
- **Fix:** Added `actionsLog: { create: vi.fn() }` to the prisma mock in `card-analysis.test.ts`
- **Files modified:** `packages/agent/src/__tests__/orchestrators/card-analysis.test.ts`
- **Commit:** e661094

**3. [Rule 1 - Bug] Route test assertions broken by new logger param**
- **Found during:** Task 2 tests
- **Issue:** `toHaveBeenCalledWith('user-1')` assertions in agent.test.ts and journeys.test.ts failed because orchestrators are now called with an extra logger arg
- **Fix:** Updated 5 assertions across 2 test files to append `expect.anything()` for the logger parameter
- **Files modified:** `apps/api/src/__tests__/routes/agent.test.ts`, `apps/api/src/__tests__/integration/journeys.test.ts`
- **Commit:** 8d44366

## Requirements Closed

| Requirement | Description | Status |
|-------------|-------------|--------|
| VAULT-01 | Vault conversion threshold logic surfaced in API | Closed |
| VAULT-02 | Vault conversion unlocks reasons in response | Closed |
| VAULT-03 | Vault conversion candidates in portfolio summary | Closed |
| OBS-02 | Agent recommendations recorded in actionsLog | Closed (batch) |
| OBS-03 | LLM diagnostic events include request context | Closed |
| CARD-03 | Batch/pack-pull cards get audit trail | Closed |

## Commits

| Hash | Description |
|------|-------------|
| e661094 | feat(07-01): wire vault conversion into portfolio summary and thread logger through all orchestrators |
| 8d44366 | feat(07-01): thread request.log from Fastify routes into all 4 orchestrator calls |

## Self-Check: PASSED
