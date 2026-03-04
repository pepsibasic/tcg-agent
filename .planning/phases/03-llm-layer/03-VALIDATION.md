---
phase: 03
slug: llm-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | packages/agent/vitest.config.ts (exists from Phase 2) |
| **Quick run command** | `pnpm --filter @tcg/agent test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @tcg/agent test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | LLM-01, LLM-03 | unit | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | LLM-02 | unit | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | LLM-04, LLM-05 | unit | `pnpm --filter @tcg/agent test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `ai` package + provider packages installed in packages/agent
- [ ] Test mock utilities for LLM responses

*Existing infrastructure covers test framework (vitest from Phase 2).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Provider switching (OpenAI ↔ Anthropic) | LLM-01 | Requires live API keys | Set LLM_PROVIDER env var, call generateStructured, verify response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
