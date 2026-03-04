---
phase: 01-foundation
plan: 02
subsystem: schemas
tags: [zod, typescript, schemas, validation, llm, api]

requires:
  - phase: 01-foundation-01
    provides: pnpm monorepo with @tcg/schemas package structure, tsconfig, vitest
provides:
  - CardAnalysisSchema with nullable price_band for LLM output validation
  - PortfolioSummarySchema with nullable archetype/priceDataAsOf
  - CollectorArchetypeSchema for identity feature
  - ActionSchema with all 7 action types
  - CardAnalysisResponseSchema (API variant with actions array)
  - Shared enums (CardState, PriceConfidence)
  - Barrel exports from @tcg/schemas
affects: [02-rules-engine, 03-llm-integration, 04-api-routes]

tech-stack:
  added: [zod]
  patterns: [z.union([type, z.null()]) for LLM nullable fields, API schemas extend LLM schemas via .extend()]

key-files:
  created:
    - packages/schemas/src/shared/enums.ts
    - packages/schemas/src/llm/card-analysis.ts
    - packages/schemas/src/llm/portfolio-summary.ts
    - packages/schemas/src/llm/archetype.ts
    - packages/schemas/src/llm/action.ts
    - packages/schemas/src/api/card-analysis.ts
    - packages/schemas/src/api/portfolio-summary.ts
    - packages/schemas/src/api/archetype.ts
    - packages/schemas/src/__tests__/card-analysis.test.ts
    - packages/schemas/src/__tests__/portfolio-summary.test.ts
    - packages/schemas/src/__tests__/archetype.test.ts
    - packages/schemas/src/__tests__/action.test.ts
  modified:
    - packages/schemas/src/index.ts

key-decisions:
  - "LLM schemas use z.union([type, z.null()]) not z.optional() for OpenAI strict mode compatibility"
  - "API schemas derive from LLM schemas via .extend() to prevent field duplication drift"
  - "Actions field only in API schema, not LLM schema (rules engine injection per locked decision)"

patterns-established:
  - "Nullable convention: z.union([z.type(), z.null()]) for all nullable LLM fields"
  - "Schema layering: LLM schemas are base, API schemas extend with service-injected fields"
  - "Dual export pattern: every schema exports both Zod object and inferred TypeScript type"

requirements-completed: [FOUND-02]

duration: 3min
completed: 2026-03-04
---

# Phase 01 Plan 02: Zod Schemas Summary

**Zod schemas for CardAnalysis, PortfolioSummary, CollectorArchetype, and Action types with LLM-nullable convention and API extension pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T12:13:40Z
- **Completed:** 2026-03-04T12:16:40Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- All 4 LLM-facing schemas with z.nullable() convention for OpenAI structured output compatibility
- All 7 action types defined in ActionTypeSchema (BUYBACK, LIST, REDEEM, SHIP_TO_VAULT, OPEN_PACK, WATCHLIST, BUNDLE_SHIP)
- API CardAnalysisResponseSchema extends LLM schema with actions array and priceConfidence
- 26 unit tests covering valid acceptance and invalid rejection for all schemas
- Full monorepo build passes with schema compilation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared enums and all LLM-facing Zod schemas**
   - `1052c1c` (test: add failing tests for all LLM schemas - TDD RED)
   - `792fdba` (feat: implement shared enums and all LLM schemas - TDD GREEN)
2. **Task 2: Create API-facing schemas, barrel exports, build verification** - `7e761dd` (feat)

## Files Created/Modified
- `packages/schemas/src/shared/enums.ts` - CardState and PriceConfidence Zod enums
- `packages/schemas/src/llm/card-analysis.ts` - CardAnalysisSchema with nullable price_band
- `packages/schemas/src/llm/portfolio-summary.ts` - PortfolioSummarySchema with PriceConfidence import
- `packages/schemas/src/llm/archetype.ts` - CollectorArchetypeSchema with traits and badges
- `packages/schemas/src/llm/action.ts` - ActionSchema/ActionTypeSchema with all 7 types
- `packages/schemas/src/api/card-analysis.ts` - CardAnalysisResponseSchema extending LLM schema
- `packages/schemas/src/api/portfolio-summary.ts` - PortfolioSummaryResponseSchema re-export
- `packages/schemas/src/api/archetype.ts` - ArchetypeResponseSchema re-export
- `packages/schemas/src/index.ts` - Barrel re-exports for all schemas and types
- `packages/schemas/src/__tests__/*.test.ts` - 26 unit tests across 4 test files

## Decisions Made
- Used z.union([type, z.null()]) for all nullable LLM fields (not z.optional()) to ensure OpenAI strict mode compatibility where all fields must be in the "required" array
- API schemas derive from LLM schemas via Zod .extend() to prevent field duplication and schema drift
- Actions field only appears in API CardAnalysisResponseSchema, not in LLM CardAnalysisSchema, per the locked "Rules+LLM hybrid" decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All schemas importable from @tcg/schemas for rules engine (Phase 2) and LLM integration (Phase 3)
- TypeScript types inferred from Zod schemas for end-to-end type safety
- Full monorepo build green

---
*Phase: 01-foundation*
*Completed: 2026-03-04*
