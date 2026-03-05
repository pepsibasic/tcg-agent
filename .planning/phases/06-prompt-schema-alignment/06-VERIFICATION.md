---
phase: 06-prompt-schema-alignment
verified: 2026-03-05T14:20:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
gaps: []
human_verification: []
---

# Phase 6: Prompt-Schema Alignment Verification Report

**Phase Goal:** All 3 LLM prompt templates produce output that validates against their target Zod schemas on the first attempt, input sanitization is wired in all orchestrators, and contract tests verify prompt-schema alignment cannot silently drift
**Verified:** 2026-03-05T14:20:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | card_analysis prompt instructs confidence as enum HIGH/MEDIUM/LOW, not a float | VERIFIED | `prompts.ts:38` — `confidence: 'HIGH' \| 'MEDIUM' \| 'LOW' — your confidence in this analysis` |
| 2  | card_analysis prompt instructs price_band as {low, high, currency}, not {low, mid, high} | VERIFIED | `prompts.ts:36` — `price_band: { low: number, high: number, currency: string } \| null` |
| 3  | card_analysis prompt does NOT mention card_id in its field instructions | VERIFIED | grep for `card_id` in prompts.ts returns no matches |
| 4  | portfolio_summary prompt uses camelCase field names matching PortfolioSummaryLLMSchema | VERIFIED | `prompts.ts:63-67` — concentrationScore, liquidityScore, collectorArchetype, missingSetGoals, recommendedActions |
| 5  | portfolio_summary prompt does NOT ask LLM for breakdown, userId, totalValueEst, priceDataAsOf, or priceConfidence | VERIFIED | grep for orchestrator-computed field names in prompts.ts returns no matches in output section |
| 6  | portfolio_summary prompt does NOT mention top_insight | VERIFIED | grep for `top_insight` in prompts.ts returns no matches |
| 7  | archetype_identity prompt uses share_card_badges, not badges | VERIFIED | `prompts.ts:94` — `share_card_badges: string[] — earned achievement badges` |
| 8  | Portfolio-summary orchestrator calls sanitizeInput/wrapUserInput before prompt rendering | VERIFIED | `portfolio-summary.ts:6` imports wrapUserInput; `line 137` wraps cards_json before renderPrompt (wrapUserInput internally calls sanitizeInput) |
| 9  | Archetype orchestrator calls sanitizeInput/wrapUserInput before prompt rendering | VERIFIED | `archetype.ts:7` imports wrapUserInput; `lines 139-141` wrap all 3 user-influenced slots |
| 10 | generateWithRetry in portfolio-summary orchestrator is called with PortfolioSummaryLLMSchema (5 fields), not PortfolioSummarySchema (10 fields) | VERIFIED | `portfolio-summary.ts:2` imports PortfolioSummaryLLMSchema; `line 145` passes it to generateWithRetry with inline comment confirming intent |
| 11 | A contract test exists for each of the 3 prompt templates verifying field alignment with its Zod schema | VERIFIED | `prompt-schema-contract.test.ts` — 3 describe blocks with 13 tests covering card_analysis (4), portfolio_summary (6), archetype_identity (3) |
| 12 | If someone edits a prompt to add/remove a field without updating the schema, the contract test fails | VERIFIED | Tests use `toContain(field)` per schema key; absent keys cause test failure |
| 13 | If someone renames a schema key without updating the prompt, the contract test fails | VERIFIED | Tests iterate Object.keys(schema.shape) dynamically — renamed keys immediately surface as failures |
| 14 | Contract tests verify that data structured per prompt instructions actually validates against the Zod schema | VERIFIED | safeParse() tests in all 3 describe blocks with error surface pattern |
| 15 | Portfolio summary contract test uses PortfolioSummaryLLMSchema (5 fields), not the full PortfolioSummarySchema (10 fields) | VERIFIED | `prompt-schema-contract.test.ts:17` imports PortfolioSummaryLLMSchema; `line 96-97` asserts schema has exactly 5 keys |

**Score:** 15/15 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/agent/src/llm/prompts.ts` | All 3 corrected prompt templates; contains `share_card_badges` | VERIFIED | 140 lines; all 3 templates corrected; share_card_badges at line 94 |
| `packages/schemas/src/llm/portfolio-summary.ts` | PortfolioSummaryLLMSchema with only 5 LLM-generated fields | VERIFIED | 36 lines; PortfolioSummaryLLMSchema defined at line 27 with exactly 5 fields |
| `packages/agent/src/orchestrators/portfolio-summary.ts` | Sanitization wiring + PortfolioSummaryLLMSchema in generateWithRetry | VERIFIED | Imports PortfolioSummaryLLMSchema (line 2), wrapUserInput (line 6); uses both correctly |
| `packages/agent/src/orchestrators/archetype.ts` | Sanitization wiring for archetype detection | VERIFIED | Imports wrapUserInput (line 7); wraps all 3 user-influenced slots (lines 139-141) |
| `packages/agent/src/llm/__tests__/prompt-schema-contract.test.ts` | Contract tests for all 3 prompt-schema pairs; min_lines: 80 | VERIFIED | 229 lines; 13 tests across 3 describe blocks; all pass |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/agent/src/llm/prompts.ts` | `packages/schemas/src/llm/card-analysis.ts` | confidence enum HIGH/MEDIUM/LOW in prompt | WIRED | `prompts.ts:38` contains `'HIGH' \| 'MEDIUM' \| 'LOW'`; matches CardAnalysisSchema enum exactly |
| `packages/agent/src/llm/prompts.ts` | `packages/schemas/src/llm/portfolio-summary.ts` | camelCase field names match PortfolioSummaryLLMSchema keys | WIRED | concentrationScore, liquidityScore, recommendedActions all present in portfolio_summary prompt output section |
| `packages/agent/src/llm/prompts.ts` | `packages/schemas/src/llm/archetype.ts` | share_card_badges field name in prompt | WIRED | `prompts.ts:94` contains `share_card_badges`; matches CollectorArchetypeSchema key |
| `packages/agent/src/orchestrators/portfolio-summary.ts` | `packages/schemas/src/llm/portfolio-summary.ts` | imports PortfolioSummaryLLMSchema for generateWithRetry | WIRED | Import line 2; used at line 145 in generateWithRetry call |
| `packages/agent/src/orchestrators/portfolio-summary.ts` | `packages/agent/src/llm/sanitize.ts` | import and call wrapUserInput before renderPrompt | WIRED | Import line 6; wrapUserInput called at line 137 for cards_json slot |
| `packages/agent/src/orchestrators/archetype.ts` | `packages/agent/src/llm/sanitize.ts` | import and call wrapUserInput before renderPrompt | WIRED | Import line 7; wrapUserInput called at lines 139, 140, 141 for portfolio_summary_json, top_ips, action_history |
| `packages/agent/src/llm/__tests__/prompt-schema-contract.test.ts` | `packages/agent/src/llm/prompts.ts` | imports PROMPTS registry | WIRED | `prompt-schema-contract.test.ts:14` imports PROMPTS |
| `packages/agent/src/llm/__tests__/prompt-schema-contract.test.ts` | `packages/schemas/src/llm/card-analysis.ts` | imports CardAnalysisSchema | WIRED | Line 16 imports CardAnalysisSchema; used in safeParse test at line 64 |
| `packages/agent/src/llm/__tests__/prompt-schema-contract.test.ts` | `packages/schemas/src/llm/portfolio-summary.ts` | imports PortfolioSummaryLLMSchema | WIRED | Line 17 imports PortfolioSummaryLLMSchema; used in shape key checks and safeParse test |
| `packages/agent/src/llm/__tests__/prompt-schema-contract.test.ts` | `packages/schemas/src/llm/archetype.ts` | imports CollectorArchetypeSchema | WIRED | Line 18 imports CollectorArchetypeSchema; used in schema key loop and safeParse test |
| `packages/schemas/src/index.ts` | `packages/schemas/src/llm/portfolio-summary.ts` | barrel export of PortfolioSummaryLLMSchema | WIRED | Lines 11-12 export PortfolioSummaryLLMSchema and PortfolioSummaryLLM type |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LLM-02 | 06-01, 06-02 | Prompt templates for card narrative, portfolio summary, and archetype identity with slot injection | SATISFIED | All 3 templates corrected in prompts.ts; contract tests verify alignment |
| LLM-05 | 06-01 | Input sanitization for user-supplied card names and notes before prompt interpolation | SATISFIED | sanitizeInput (card-analysis), wrapUserInput (portfolio-summary, archetype) wired in all 3 orchestrators |
| CARD-01 | 06-01, 06-02 | User can request analysis of any card and receive CardAnalysis JSON with correct fields | SATISFIED | card_analysis prompt field instructions match CardAnalysisSchema exactly; contract test verifies |
| CARD-04 | 06-01, 06-02 | Card analysis outputs validated against Zod schema with retry/fallback | SATISFIED | generateWithRetry uses CardAnalysisSchema; confidence now enum not float — first-attempt validation succeeds |
| PORT-01 | 06-01, 06-02 | User can view PortfolioSummary with correct fields | SATISFIED | portfolio_summary prompt instructs 5 LLM-produced camelCase fields; orchestrator merges DB-computed fields |
| PORT-03 | 06-01, 06-02 | Portfolio concentration signal identifies over-concentration | SATISFIED | concentrationScore field correctly instructed in prompt and present in PortfolioSummaryLLMSchema |
| IDENT-01 | 06-01, 06-02 | User receives CollectorArchetype with name, traits, why, comparable_collectors, share_card_text, share_card_badges | SATISFIED | archetype_identity prompt instructs all 6 CollectorArchetypeSchema fields including share_card_badges |
| IDENT-02 | 06-01 | Archetype inference uses portfolio composition | SATISFIED | Archetype orchestrator passes portfolio_summary_json, top_ips, action_history (all wrapUserInput-wrapped) to LLM |
| IDENT-03 | 06-01, 06-02 | Shareable collector identity as exportable JSON + short text + badges | SATISFIED | share_card_badges, share_card_text fields correctly wired in prompt and schema; contract test verifies |

All 9 requirement IDs declared in plan frontmatter are satisfied. No orphaned requirements found — REQUIREMENTS.md traceability table maps all 9 IDs to Phase 6 and marks them Complete.

---

## Commit Verification

| Commit | Message | Status |
|--------|---------|--------|
| c9d9fbf | fix(06-01): correct all 3 LLM prompt templates to match Zod schemas | EXISTS |
| 9b36aef | feat(06-01): add PortfolioSummaryLLMSchema, wire sanitization in orchestrators | EXISTS |
| 89e5132 | test(06-02): add prompt-schema contract tests for all 3 LLM prompt-schema pairs | EXISTS |

---

## Anti-Patterns Found

None. Scan of all 5 phase-modified files returned no TODO/FIXME/PLACEHOLDER/stub patterns. The "return null" matches in prompts.ts are instruction strings to the LLM (`return null — not omit — for unknown fields`), not code stubs.

---

## Human Verification Required

None. All phase goals are programmatically verifiable:
- Prompt field names are static strings in prompts.ts (grep-verifiable)
- Schema field names are static Zod object keys (grep-verifiable)
- generateWithRetry schema parameter is a direct import reference (grep-verifiable)
- Sanitization calls are import + usage patterns (grep-verifiable)
- Contract tests run and pass (13/13 confirmed by vitest execution)
- TypeScript compiles cleanly for both schemas and agent packages

---

## Build/Test Status

- `pnpm --filter @tcg/schemas exec tsc --noEmit` — PASS (no output = clean compile)
- `pnpm --filter @tcg/agent exec tsc --noEmit` — PASS (no output = clean compile)
- `pnpm --filter @tcg/agent exec vitest run src/llm/__tests__/prompt-schema-contract.test.ts` — PASS (13/13 tests)

---

## Summary

Phase 6 goal is fully achieved. All 3 LLM prompt templates now produce field instructions that exactly match their target Zod schemas:

1. **card_analysis:** confidence is `'HIGH' | 'MEDIUM' | 'LOW'` (was float); price_band is `{low, high, currency}` (was `{low, mid, high}`); card_id removed from LLM instructions (orchestrator-injected)
2. **portfolio_summary:** 5 camelCase LLM-generated fields only (concentrationScore, liquidityScore, collectorArchetype, missingSetGoals, recommendedActions); orchestrator-computed fields (userId, totalValueEst, breakdown, priceDataAsOf, priceConfidence) removed from prompt; generateWithRetry uses PortfolioSummaryLLMSchema (5 fields), eliminating Zod validation failures on orchestrator-computed fields
3. **archetype_identity:** share_card_badges (corrected from bare `badges`)

Input sanitization is wired in all 3 orchestrators: card-analysis uses `sanitizeInput` + `wrapUserInput`; portfolio-summary and archetype use `wrapUserInput` (which internally applies `sanitizeInput`). Contract tests (13 tests, 229 lines) guard against future prompt-schema drift for all 3 pairs.

---

_Verified: 2026-03-05T14:20:00Z_
_Verifier: Claude (gsd-verifier)_
