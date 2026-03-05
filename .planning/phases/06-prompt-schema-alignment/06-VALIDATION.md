---
phase: 6
slug: prompt-schema-alignment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `packages/agent/vitest.config.ts` |
| **Quick run command** | `cd packages/agent && pnpm vitest run src/llm/__tests__/prompts-contract.test.ts` |
| **Full suite command** | `pnpm --filter @tcg/agent test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @tcg/agent test`
- **After every plan wave:** Run `pnpm --filter @tcg/agent test && pnpm --filter @tcg/schemas test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | LLM-02, CARD-01 | contract | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | LLM-02, PORT-01, PORT-03 | contract | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | LLM-02, IDENT-01 | contract | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | LLM-05 | unit | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | LLM-05 | unit | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | CARD-04, PORT-01, IDENT-01, IDENT-02, IDENT-03 | contract | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/agent/src/llm/__tests__/prompts-contract.test.ts` — contract tests for LLM-02, CARD-01, CARD-04, PORT-01, PORT-03, IDENT-01, IDENT-02, IDENT-03
- [ ] Existing test infrastructure covers all other requirements (Vitest already configured)

*Existing infrastructure covers sanitization testing (11 tests in sanitize.test.ts).*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
