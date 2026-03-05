---
phase: 06-prompt-schema-alignment
plan: 02
subsystem: testing
tags: [vitest, zod, prompts, contract-tests, schema-alignment]

# Dependency graph
requires:
  - phase: 06-prompt-schema-alignment/06-01
    provides: corrected prompt templates, PortfolioSummaryLLMSchema (5-field narrow schema)
  - phase: 03-llm-layer
    provides: PROMPTS registry, renderPrompt
  - phase: 01-foundation
    provides: CardAnalysisSchema, PortfolioSummaryLLMSchema, CollectorArchetypeSchema
provides:
  - Contract tests for all 3 prompt-schema pairs (card_analysis, portfolio_summary, archetype_identity)
  - Canary that fails loudly if any prompt field name diverges from its Zod schema key
  - Verification that PortfolioSummaryLLMSchema.shape (5 fields) is the contract boundary, not the full 10-field schema
affects: [07-cross-phase-wiring, future-prompt-changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - String-match rendered prompt user text against each schema key (toContain) — resilient to ordering changes
    - Verify orchestrator-injected fields are absent from prompt output section (split on "Produce a JSON object")
    - safeParse() with error surface pattern for clear test failure messages

key-files:
  created:
    - packages/agent/src/llm/__tests__/prompt-schema-contract.test.ts
  modified: []

key-decisions:
  - "String-match approach (toContain) chosen over regex extraction — catches both additions and removals, more resilient than structural parsing"
  - "Bare 'badges' check uses /^- badges:/m regex on output section — targets field instruction line, not word in description prose"
  - "Portfolio contract tests against PortfolioSummaryLLMSchema.shape (5 fields), not PortfolioSummarySchema (10 fields) — enforces narrow schema boundary"

patterns-established:
  - "Contract test pattern: import PROMPTS, split on 'Produce a JSON object', verify each schema key in output section"
  - "Orchestrator-injected field exclusion: verify field NOT in output section (post-'Produce a JSON object' text)"

requirements-completed: [LLM-02, CARD-01, CARD-04, PORT-01, PORT-03, IDENT-01, IDENT-02, IDENT-03]

# Metrics
duration: 1min
completed: 2026-03-05
---

# Phase 6 Plan 02: Prompt-Schema Contract Tests Summary

**Vitest contract tests for all 3 LLM prompt-schema pairs using string-match on rendered prompt output sections to catch future field-name drift between prompts.ts and Zod schemas.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-05T06:13:29Z
- **Completed:** 2026-03-05T06:15:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- 13 contract tests across 3 describe blocks (card_analysis: 4, portfolio_summary: 6, archetype_identity: 3)
- card_analysis: verifies 6 LLM-produced fields present in prompt, card_id absent from instructions, sample validates against full CardAnalysisSchema including orchestrator-injected card_id
- portfolio_summary: verifies all 5 PortfolioSummaryLLMSchema.shape keys present in prompt output section, 5 orchestrator-computed fields absent, 5-field sample validates against PortfolioSummaryLLMSchema (not 10-field schema)
- archetype_identity: verifies all 6 CollectorArchetypeSchema keys present, share_card_badges prefix enforced (no bare `- badges:` field instruction), sample validates
- All 199 agent tests pass (13 new + 186 existing), zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create prompt-schema contract tests** - `89e5132` (test)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `packages/agent/src/llm/__tests__/prompt-schema-contract.test.ts` - Contract tests for all 3 prompt-schema pairs; 229 lines, 13 tests

## Decisions Made

- Used string-match (`toContain`) strategy against the rendered user prompt text rather than regex field extraction — catches both additions and removals without fragile parsing
- For the "bare badges" check, used `/^- badges:/m` regex on the output section (text after "Produce a JSON object") instead of a word-boundary lookbehind on "badges" — the lookbehind was matching "badges" inside description prose like "earned achievement badges", which is not a field instruction
- Portfolio contract compares `.shape` keys of `PortfolioSummaryLLMSchema` (5 fields) against prompt, not `PortfolioSummarySchema` (10 fields) — this enforces the narrow schema boundary established in 06-01

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed bare "badges" regex to avoid false positive on description prose**
- **Found during:** Task 1 (writing contract tests)
- **Issue:** Initial implementation used lookbehind regex `(?<!share_card_)badges\b` to detect bare "badges" field names. This regex matched the word "badges" in description prose ("earned achievement badges (e.g., ...)") — a false positive
- **Fix:** Changed to `/^- badges:/m` which anchors to a field definition line pattern, not any occurrence of the word "badges"
- **Files modified:** packages/agent/src/llm/__tests__/prompt-schema-contract.test.ts
- **Verification:** 13/13 tests pass
- **Committed in:** 89e5132 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in test logic)
**Impact on plan:** Fix ensures test logic correctly validates field instruction lines, not prose text. No scope creep.

## Issues Encountered

None beyond the regex auto-fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Contract tests are the "canary" for future prompt-schema drift — any future edits to prompts.ts or schema files will immediately surface alignment breaks
- Phase 6 complete: all 3 prompts corrected (06-01) and contract-tested (06-02)
- Phase 7 (cross-phase wiring) can proceed with full confidence in prompt-schema alignment

---
*Phase: 06-prompt-schema-alignment*
*Completed: 2026-03-05*
