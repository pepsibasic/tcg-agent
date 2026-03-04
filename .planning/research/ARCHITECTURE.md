# Architecture Research

**Domain:** Rules+LLM hybrid agent service embedded in a collectibles platform API
**Researched:** 2026-03-04
**Confidence:** HIGH (patterns verified across OpenAI guides, Vercel AI SDK docs, Fastify community, TypeScript monorepo ecosystem)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API Layer (Fastify)                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐            │
│  │  /cards/*     │  │ /portfolio/*  │  │  /identity/*  │            │
│  │  (analysis)   │  │  (summary)    │  │  (archetype)  │            │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘            │
│          │                  │                  │                     │
├──────────┴──────────────────┴──────────────────┴────────────────────┤
│                      Agent Orchestrator                              │
│   (routes request → rules engine → LLM → validation → response)     │
├─────────────────────────────────────────────────────────────────────┤
│          │                  │                  │                     │
│  ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐            │
│  │ Rules Engine  │  │   LLM Client  │  │ Prompt Store  │            │
│  │ (action elig.)│  │ (AI SDK wrap) │  │ (templates)   │            │
│  └───────┬───────┘  └───────┬───────┘  └───────────────┘            │
│          │                  │                                        │
│  ┌───────▼───────┐  ┌───────▼───────┐                               │
│  │ Schema Layer  │  │ Output Guard  │                               │
│  │ (Zod schemas) │  │ (retry/fall.) │                               │
│  └───────┬───────┘  └───────┬───────┘                               │
│          └──────────────────┘                                        │
├─────────────────────────────────────────────────────────────────────┤
│                        Data Layer                                    │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │
│  │   PostgreSQL   │  │  Redis (opt.)  │  │   Prisma ORM   │         │
│  │ (users, cards, │  │  (LLM result   │  │  (query layer) │         │
│  │  actions_log)  │  │   cache)       │  │                │         │
│  └────────────────┘  └────────────────┘  └────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Fastify API | HTTP surface, request validation, auth, rate-limiting | Agent Orchestrator |
| Agent Orchestrator | Coordinates rules → LLM → validation pipeline per use-case | Rules Engine, LLM Client, Schema Layer |
| Rules Engine | Deterministic card state → eligible actions mapping (no LLM) | Agent Orchestrator, Prisma (card state reads) |
| LLM Client | Provider-abstracted wrapper around Vercel AI SDK `generateObject` | Prompt Store, Output Guard, LLM providers |
| Prompt Store | Versioned template registry; injects card data into prompt slots | LLM Client |
| Output Guard | Zod validation, retry on schema failure, compliance scrub, fallback | LLM Client, Schema Layer |
| Schema Layer (packages/schemas) | Zod definitions for all agent outputs; shared across API and agent | API, Output Guard, consumers |
| Prisma + PostgreSQL | Persistent card state, user data, actions log | Rules Engine, Agent Orchestrator |
| Redis (optional) | LLM response cache keyed on deterministic input hash | LLM Client |

---

## Recommended Project Structure

```
tcg-agent/                        # pnpm workspace root
├── apps/
│   └── api/                      # Fastify HTTP application
│       ├── src/
│       │   ├── routes/           # Route handlers — thin, delegate to services
│       │   │   ├── cards.ts      # POST /cards/:id/analyze
│       │   │   ├── portfolio.ts  # GET /portfolio/:userId/summary
│       │   │   └── identity.ts   # GET /portfolio/:userId/archetype
│       │   ├── plugins/          # Fastify plugins (auth, db, agent service)
│       │   │   ├── db.ts         # Registers Prisma client on fastify instance
│       │   │   └── agent.ts      # Registers agent service on fastify instance
│       │   ├── middleware/       # Request validation, error handling
│       │   └── server.ts         # App bootstrap
│       └── package.json
│
├── packages/
│   ├── schemas/                  # Zod schemas — SINGLE SOURCE OF TRUTH
│   │   ├── src/
│   │   │   ├── card-analysis.ts  # CardAnalysis schema + inferred type
│   │   │   ├── portfolio.ts      # PortfolioSummary schema
│   │   │   ├── archetype.ts      # CollectorArchetype schema
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── agent/                    # Agent logic — no HTTP coupling
│   │   ├── src/
│   │   │   ├── orchestrator/     # Per-use-case orchestration flows
│   │   │   │   ├── analyze-card.ts
│   │   │   │   ├── summarize-portfolio.ts
│   │   │   │   └── detect-archetype.ts
│   │   │   ├── rules/            # Deterministic rules engine
│   │   │   │   ├── action-eligibility.ts   # Card state → ActionSet
│   │   │   │   ├── vault-incentive.ts      # Threshold-based vault recs
│   │   │   │   └── rules.types.ts
│   │   │   ├── llm/              # LLM abstraction
│   │   │   │   ├── client.ts     # generateObject wrapper
│   │   │   │   ├── retry.ts      # Retry/fallback logic
│   │   │   │   └── guard.ts      # Compliance scrub, output validation
│   │   │   ├── prompts/          # Prompt template registry
│   │   │   │   ├── templates/
│   │   │   │   │   ├── card-narrative.txt
│   │   │   │   │   ├── portfolio-summary.txt
│   │   │   │   │   └── archetype-identity.txt
│   │   │   │   └── loader.ts     # Template loading + slot injection
│   │   │   └── index.ts          # Public API of the agent package
│   │   └── package.json
│   │
│   └── db/                       # Prisma client + schema
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── client.ts         # Singleton Prisma client export
│       │   └── seed.ts           # Dev fixtures
│       └── package.json
│
├── pnpm-workspace.yaml
└── turbo.json                    # (optional) build orchestration
```

### Structure Rationale

- **packages/schemas/:** Zod schemas define the contract. Both the API layer (response serialization) and the agent layer (LLM output validation) import from here. No duplication, no drift.
- **packages/agent/:** Pure business logic with no Fastify coupling. Can be tested with plain function calls. Orchestrators are the entry points per use-case.
- **packages/db/:** Prisma client isolated; avoids circular deps. Rules engine imports db types, not db implementation.
- **apps/api/:** HTTP surface only. Routes delegate immediately to agent orchestrators. No business logic in route handlers.

---

## Architectural Patterns

### Pattern 1: Rules-First, LLM-Second Pipeline

**What:** Every agent request passes through the rules engine before the LLM is called. The rules engine produces a deterministic `ActionSet` (which actions are eligible for this card in its current state). The LLM only receives the pre-computed `ActionSet` and is asked to narrate — never to decide eligibility.

**When to use:** Always. This is the load-bearing safety constraint for this system. The LLM cannot hallucinate an action that the rules engine has not enabled.

**Trade-offs:** Slightly more code (two passes); pays off immediately by eliminating a class of hallucination bugs and making action logic unit-testable without any LLM calls.

**Example:**
```typescript
// packages/agent/src/orchestrator/analyze-card.ts
export async function analyzeCard(
  cardId: string,
  ctx: AgentContext
): Promise<CardAnalysis> {
  // Step 1: Fetch card state (deterministic)
  const card = await ctx.db.userCard.findUniqueOrThrow({ where: { id: cardId } });

  // Step 2: Rules engine produces eligible actions (no LLM)
  const eligibleActions = computeEligibleActions(card); // pure function

  // Step 3: LLM narrates using pre-computed actions
  const prompt = ctx.prompts.render("card-narrative", { card, eligibleActions });
  const result = await ctx.llm.generate(CardAnalysisSchema, prompt);

  // Step 4: Log action for audit trail
  await ctx.db.actionsLog.create({ data: { cardId, actions: eligibleActions } });

  return result;
}
```

---

### Pattern 2: Zod Schema as LLM Contract

**What:** A single Zod schema defines the expected LLM output structure. That same schema is used to: (a) constrain the LLM call via `generateObject`, (b) validate the response at runtime, (c) type the API response at the HTTP layer.

**When to use:** Every LLM call that must produce structured data. Do not use free-form text generation for any output that will be serialized to clients.

**Trade-offs:** Requires Vercel AI SDK or equivalent that passes the schema to the provider's structured-output API (OpenAI `response_format`, Anthropic tool use). Older "parse from freeform text" approach is fragile and deprecated.

**Example:**
```typescript
// packages/agent/src/llm/client.ts
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import type { z } from "zod";

export async function generateStructured<T>(
  schema: z.ZodType<T>,
  prompt: string,
  systemPrompt: string
): Promise<T> {
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema,
    system: systemPrompt,
    prompt,
  });
  return object; // Already validated against schema by AI SDK
}
```

---

### Pattern 3: Retry with Schema-Aware Error Feedback

**What:** When `generateObject` throws `AI_NoObjectGeneratedError` (schema validation failure), the system retries with the validation error appended to the prompt — giving the LLM information about what was wrong. After N retries (default: 3), a deterministic fallback object is returned rather than propagating an exception.

**When to use:** All LLM calls. Structured output APIs fail ~2-5% of the time even with schema enforcement; retry+fallback prevents these from becoming user-visible errors.

**Trade-offs:** Adds latency on retry paths; mitigated by keeping retry count low (2-3) and by caching successful outputs.

**Example:**
```typescript
// packages/agent/src/llm/retry.ts
import { AI_NoObjectGeneratedError } from "ai";

export async function withRetry<T>(
  fn: (attempt: number, previousError?: string) => Promise<T>,
  fallback: T,
  maxAttempts = 3
): Promise<T> {
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt, lastError);
    } catch (err) {
      if (err instanceof AI_NoObjectGeneratedError) {
        lastError = `Previous attempt failed schema validation. Raw output: ${err.text}`;
        continue;
      }
      throw err; // Non-schema errors bubble up immediately
    }
  }
  // After max retries: return deterministic fallback, log for monitoring
  return fallback;
}
```

---

### Pattern 4: Prompt Template Registry with Slot Injection

**What:** Prompts are stored as versioned text files in `packages/agent/src/prompts/templates/`. A `PromptLoader` reads templates at startup, caches them in memory, and exposes a `render(templateName, vars)` method. Variables are injected into named slots (`{{card.name}}`, `{{eligibleActions}}`).

**When to use:** Any project with more than 1-2 prompts. Keeping prompts in code strings makes them impossible to review, version, or A/B test.

**Trade-offs:** Templates must be bundled with the service binary (not loaded from DB in v1). Promotes legibility and easy iteration without code changes.

**Example:**
```typescript
// packages/agent/src/prompts/loader.ts
import { readFileSync } from "fs";
import { join } from "path";

const cache = new Map<string, string>();

export function renderPrompt(name: string, vars: Record<string, unknown>): string {
  if (!cache.has(name)) {
    const raw = readFileSync(join(__dirname, "templates", `${name}.txt`), "utf8");
    cache.set(name, raw);
  }
  let template = cache.get(name)!;
  for (const [key, value] of Object.entries(vars)) {
    template = template.replaceAll(`{{${key}}}`, String(value));
  }
  return template;
}
```

---

### Pattern 5: Compliance Output Guard (Post-LLM Scrub)

**What:** After schema validation passes, a compliance guard function runs a final pass over text fields to detect and replace disallowed language patterns: profit guarantees ("will increase"), certainty claims ("guaranteed"), direct buy/sell advice. Replacements use pre-approved hedged equivalents from a lookup table.

**When to use:** Any LLM-generated text visible to end users in financial or collectibles contexts. Required by the project's safety posture.

**Trade-offs:** Adds ~1ms per call; pattern list must be maintained. Does not replace careful prompt design — guard is a last-resort catch, not primary safety mechanism.

---

## Data Flow

### Card Analysis Request Flow

```
HTTP POST /cards/:id/analyze
    │
    ▼
[Fastify Route Handler]
  - Authenticate request
  - Validate path params (Zod)
  - Delegate to agent orchestrator
    │
    ▼
[analyzeCard Orchestrator]
    │
    ├──► [Prisma] fetch card + ownership + vault state
    │         └──► card state object returned
    │
    ├──► [Rules Engine: computeEligibleActions(card)]
    │         - Pure function, no I/O
    │         - Returns: { actions: ["sell", "list"], blocked: ["redeem"] }
    │
    ├──► [Prompt Store: render("card-narrative", { card, actions })]
    │         - Template interpolation
    │         - Returns: filled prompt string
    │
    ├──► [LLM Client: generateStructured(CardAnalysisSchema, prompt)]
    │         - Calls Vercel AI SDK generateObject
    │         - Provider: OpenAI / Anthropic (abstracted)
    │         │
    │         └──► [withRetry wrapper]
    │                   - On AI_NoObjectGeneratedError: retry with error feedback
    │                   - After 3 failures: return deterministic fallback
    │
    ├──► [Compliance Guard: scrub(result)]
    │         - Text field pattern replacement
    │         - Returns: scrubbed CardAnalysis
    │
    ├──► [Prisma: log action to actions_log]
    │
    └──► CardAnalysis (validated Zod object) returned to route handler
              │
              ▼
         HTTP 200 { data: CardAnalysis }
```

### Portfolio Summary Request Flow

```
HTTP GET /portfolio/:userId/summary
    │
    ▼
[Fastify Route Handler]
    │
    ▼
[summarizePortfolio Orchestrator]
    │
    ├──► [Prisma] fetch all user cards (vaulted + external) + market stubs
    │
    ├──► [Rules Engine: computePortfolioSignals(cards)]
    │         - Concentration analysis (pure math)
    │         - Liquidity tiers (rule-based thresholds)
    │         - Vault conversion candidates (threshold check)
    │
    ├──► [LLM Client: generateStructured(PortfolioSummarySchema, prompt)]
    │         (with retry + fallback)
    │
    └──► PortfolioSummary returned
```

### External Card Upload Flow

```
HTTP POST /cards/external
    │
    ▼
[Fastify Route Handler]
    │
    ├──► Validate request body (Zod)
    │
    ├──► [Prisma] insert external_card record (state = "external")
    │
    ├──► [Rules Engine: computeEligibleActions({ state: "external" })]
    │         - External cards: actions = [] (read-only in Gacha economy)
    │         - Returns vault conversion recommendation signals
    │
    └──► Trigger async analyzeCard (background, no blocking)
              │
              └──► Store CardAnalysis result in DB for later fetch
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Monolith is correct — single Fastify process, direct DB calls, no queue needed |
| 1k-10k users | Add Redis for LLM result caching (key: hash of card state); LLM calls are expensive and frequently repeated for unchanged card states |
| 10k-100k users | Extract LLM calls to async background jobs (BullMQ + Redis); API returns job ID, client polls or receives webhook. Enables retries without holding HTTP connections |
| 100k+ users | Horizontal scale of API tier; separate agent worker pool; consider read replicas for portfolio aggregations |

### Scaling Priorities

1. **First bottleneck: LLM latency.** Each `generateObject` call takes 1-4 seconds. At any meaningful load, caching identical card state results is the highest-leverage optimization. Cache key = `hash(cardId + cardState + schemaVersion)`.
2. **Second bottleneck: Portfolio aggregation queries.** Fetching all user cards + market stubs for summary is a join-heavy query. Materialized views or denormalized summary tables are the fix.

---

## Anti-Patterns

### Anti-Pattern 1: LLM Decides Action Eligibility

**What people do:** Pass card state to LLM and ask "what actions are available?" in the prompt.
**Why it's wrong:** LLMs hallucinate. An LLM will confidently suggest "redeem for cash" on an external card that has no vault record. Users act on this. Trust is destroyed.
**Do this instead:** Rules engine produces `ActionSet` deterministically from card state before the LLM is called. LLM receives the computed `ActionSet` and only writes narrative about it.

---

### Anti-Pattern 2: One Giant Prompt for Everything

**What people do:** Build a single "agent prompt" that handles card analysis, portfolio summary, and archetype detection depending on what variables are injected.
**Why it's wrong:** Prompt bloat degrades output quality. Context window fills with irrelevant schema fields. Debugging becomes impossible. Template conflicts cause subtle failures.
**Do this instead:** One prompt template per use-case. `card-narrative.txt`, `portfolio-summary.txt`, `archetype-identity.txt` are independent files with independent schemas.

---

### Anti-Pattern 3: Parsing JSON from Free-Form LLM Text

**What people do:** Ask the LLM to "respond in JSON format" in the system prompt, then regex/parse the response.
**Why it's wrong:** Models fail to produce valid JSON ~5-15% of the time without schema enforcement. Parser errors in production become user-facing 500s.
**Do this instead:** Use Vercel AI SDK `generateObject` with a Zod schema. The schema is passed to the provider's native structured-output API (OpenAI `response_format: { type: "json_schema" }`, Anthropic tool use). Validation is done at the API boundary, not by regex.

---

### Anti-Pattern 4: Embedding Business Logic in Route Handlers

**What people do:** Card state evaluation, rules checks, and LLM calls placed directly inside Fastify route handler functions.
**Why it's wrong:** Untestable (requires HTTP layer to test). Impossible to reuse across routes. Couples transport to domain logic.
**Do this instead:** Routes are a thin HTTP adapter. All logic lives in `packages/agent/` orchestrators that receive plain function arguments and return typed objects. Routes call orchestrators.

---

### Anti-Pattern 5: Schema Definitions Duplicated Across Packages

**What people do:** Define `CardAnalysis` interface in the API package and separately define a validator schema in the agent package.
**Why it's wrong:** They drift. API returns a shape the agent no longer produces. Type errors appear only at runtime.
**Do this instead:** `packages/schemas` is the single source of truth. Zod schema is the definition; TypeScript type is derived with `z.infer<typeof CardAnalysisSchema>`. Both packages import from `packages/schemas`.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI | Vercel AI SDK `@ai-sdk/openai`, `generateObject` | Provider-abstracted; swap to Anthropic by changing provider import |
| Anthropic | Vercel AI SDK `@ai-sdk/anthropic`, same `generateObject` surface | Fallback provider or A/B option |
| PostgreSQL | Prisma ORM, singleton client in `packages/db` | Connection pool via Prisma; no raw SQL in agent layer |
| Redis | `ioredis` client, optional; registered as Fastify plugin | Used for LLM result cache and optional rate-limit counters |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| apps/api ↔ packages/agent | Direct TypeScript function calls | No HTTP between them; same process in v1 |
| packages/agent ↔ packages/schemas | Import (types + Zod schemas) | Agent imports schemas for validation; never redefines types |
| packages/agent ↔ packages/db | Import (Prisma client + generated types) | Agent reads card state; DB package owns connection lifecycle |
| apps/api ↔ packages/db | Import (Prisma client) | API reads user data for auth; also delegates to agent which reads via same client |
| packages/agent ↔ LLM providers | Vercel AI SDK (HTTP to provider APIs) | Network I/O; isolated in `packages/agent/src/llm/client.ts` |

---

## Suggested Build Order

Dependencies determine sequencing. Each layer must exist before the layer above can be built:

```
1. packages/schemas        (no deps — defines all data contracts)
       │
       ▼
2. packages/db             (depends on schemas for Prisma types)
       │
       ▼
3. packages/agent/rules/   (depends on db types for card state shape; pure functions, no LLM)
       │
       ▼
4. packages/agent/llm/     (depends on schemas for generateObject calls; no rules dep)
       │
       ▼
5. packages/agent/prompts/ (depends on nothing; pure template loading)
       │
       ▼
6. packages/agent/orchestrators/ (composes rules + llm + prompts; depends on all above)
       │
       ▼
7. apps/api/routes/        (thin adapter over orchestrators; depends on schemas for request validation)
       │
       ▼
8. apps/api/plugins/       (Fastify plugin wiring; depends on db and agent packages)
```

**Rationale:** Build order maps to testability milestones. After step 3, the rules engine is fully unit-testable without any LLM or HTTP. After step 6, all agent use-cases are testable with plain function calls. HTTP layer (step 7-8) is added last and adds no new business logic.

---

## Sources

- Vercel AI SDK structured outputs: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- Vercel AI SDK structured output tutorial: https://www.aihero.dev/structured-outputs-with-vercel-ai-sdk
- OpenAI practical agent guide: https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf
- LLM guardrails best practices (Datadog): https://www.datadoghq.com/blog/llm-guardrails-best-practices/
- JSON schema enforcement for LLMs: https://modelmetry.com/blog/how-to-ensure-llm-output-adheres-to-a-json-schema
- Fastify dependency injection (awilix): https://github.com/fastify/fastify-awilix
- pnpm workspace guide: https://jsdev.space/complete-monorepo-guide/
- TypeScript monorepo live types pattern: https://colinhacks.com/essays/live-types-typescript-monorepo
- Rules engine TypeScript: https://benjamin-ayangbola.medium.com/building-a-rule-engine-with-typescript-1732d891385c
- LLM agent architecture overview: https://aisera.com/blog/llm-agents/

---
*Architecture research for: Gacha Portfolio Agent — Rules+LLM hybrid embedded service*
*Researched: 2026-03-04*
