---
phase: 03-llm-layer
plan: "02"
subsystem: llm
tags: [prompt-templates, compliance, slot-injection, safety-guard, vitest]

# Dependency graph
requires:
  - phase: 03-llm-layer-01
    provides: LLM client abstraction (generateStructured, client.ts)
provides:
  - Prompt template registry with SYSTEM_PERSONA and slot injection (renderPrompt, PROMPTS)
  - 3 prompt templates: card_analysis, portfolio_summary, archetype_identity
  - Compliance guard scrubbing financial advice language from LLM outputs (scrubCompliance, scrubText)
  - ComplianceScrubResult type with violation logging for Phase 5 observability
affects:
  - Phase 4 agent orchestrators (consume renderPrompt to build prompts for generateStructured)
  - Phase 5 observability (compliance violation logs feed OBS-03)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SYSTEM_PERSONA constant shared across all prompt templates for consistent persona
    - Slot injection via {{slot_name}} replacement with required-slot validation
    - Compliance guard scans narrative fields only, skips numeric/id/array-of-non-strings
    - Violation log structure (field, original, replacement) designed for Phase 5 consumption
    - BLOCKLIST as array of pattern+replacement entries for easy extension

key-files:
  created:
    - packages/agent/src/llm/prompts.ts
    - packages/agent/src/llm/compliance.ts
    - packages/agent/src/llm/__tests__/prompts.test.ts
    - packages/agent/src/llm/__tests__/compliance.test.ts
  modified: []

key-decisions:
  - "SYSTEM_PERSONA string is the same across all 3 templates, ensuring consistent persona enforcement"
  - "renderPrompt returns { system, user } pair (not a flat string) to keep provider abstraction clean"
  - "scrubCompliance accepts explicit narrativeFields list rather than auto-detecting field types — prevents accidental scrubbing of identity_tags or card_id"
  - "BLOCKLIST patterns use gi flags (global + case-insensitive); lastIndex reset explicitly before each match + replace call to avoid stateful regex bugs"
  - "Array fields (reasoning_bullets) scrubbed element-by-element so violations reference the specific field name"

patterns-established:
  - "Prompt templates: PromptTemplate type with { system, user, requiredSlots } — all templates follow this contract"
  - "Compliance violations: { field, original, replacement } — structured for log ingestion in Phase 5"
  - "scrubCompliance<T>: generic over data type, returns { data: T, violations } — type-safe for all LLM output schemas"

requirements-completed: [LLM-02, LLM-04]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 3 Plan 02: Prompt Templates and Compliance Guard Summary

**Prompt template registry with slot injection for 3 analysis types plus compliance guard with 9-pattern blocklist detecting financial advice language, field-scoped scrubbing, and structured violation logging**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T21:32:13Z
- **Completed:** 2026-03-04T21:34:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- PROMPTS registry with card_analysis, portfolio_summary, and archetype_identity templates — each with SYSTEM_PERSONA and narrative style per CONTEXT.md decisions
- renderPrompt with required-slot validation throws descriptive errors on missing slots, handles extra slots silently
- scrubCompliance with 9-pattern BLOCKLIST (will increase, guaranteed return, buy now, sell immediately, should buy/sell/hold, investment advice, profit, guaranteed, will definitely/certainly/surely)
- Field-scoped scrubbing: only narrativeFields are scanned; card_id, identity_tags, numeric fields, confidence score are never touched
- Full TDD coverage: 32 new tests (16 prompts + 16 compliance), 146 total passing

## Task Commits

Each task was committed atomically:

1. **Task 1 - RED phase (failing tests)** - `1d3f375` (test)
2. **Task 1 - GREEN phase (implementation)** - `62d40bf` (feat)

_Note: TDD tasks have multiple commits (test RED → feat GREEN)_

## Files Created/Modified
- `packages/agent/src/llm/prompts.ts` - PROMPTS registry, SYSTEM_PERSONA constant, renderPrompt function with slot validation
- `packages/agent/src/llm/compliance.ts` - BLOCKLIST, scrubText per-string scrubber, scrubCompliance generic field-scoped guard
- `packages/agent/src/llm/__tests__/prompts.test.ts` - 16 tests covering registry structure, slot injection, error cases
- `packages/agent/src/llm/__tests__/compliance.test.ts` - 16 tests covering blocklist detection, case-insensitivity, field scoping, array handling

## Decisions Made
- Used `renderPrompt` returning `{ system, user }` pair rather than a flat string — keeps provider abstraction clean, matches generateStructured call signature from Plan 01
- scrubCompliance accepts explicit `narrativeFields` parameter rather than auto-detecting which fields are narrative — callers must be explicit about what to scrub, preventing accidental scrubbing of identity_tags or cert numbers
- BLOCKLIST regex flags use `gi` (global + case-insensitive) with explicit `lastIndex` reset before each match and replace call to avoid stateful regex bugs with global patterns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Prompt templates ready for Phase 4 agent orchestrators to call `renderPrompt('card_analysis', slots)` and pass result to `generateStructured`
- Compliance guard ready to wrap all LLM output fields before API response composition
- Violation log structure (`{ field, original, replacement }`) designed for Phase 5 OBS-03 ingestion

---
*Phase: 03-llm-layer*
*Completed: 2026-03-04*
