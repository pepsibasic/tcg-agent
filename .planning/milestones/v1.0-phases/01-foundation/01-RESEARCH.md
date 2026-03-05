# Phase 1: Foundation - Research

**Researched:** 2026-03-04
**Domain:** pnpm + Turborepo monorepo scaffold, Zod 4 schemas, Prisma 7 data model, seed fixtures
**Confidence:** HIGH (all core claims verified against official docs or primary sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Monorepo structure:**
- apps/api (Fastify HTTP surface — skeleton only, no routes yet)
- packages/schemas (Zod schemas — shared single source of truth)
- packages/db (Prisma client, migrations, seed script)
- packages/agent (skeleton — rules engine and LLM client added in later phases)
- Turborepo pipeline: schemas → db → agent → api

**ID strategy:**
- UUIDs (v7 — time-sortable) for all primary keys — safer for external API exposure, no sequential ID enumeration
- card_id field on user_cards references canonical cards table

**Card taxonomy:**
- IP categories as flexible string enum (not hard-coded): e.g., "pokemon", "one-piece", "sports", "yugioh", "magic", "custom"
- Language as ISO 639-1 codes: "en", "ja", "ko", "zh", etc.
- Set/series as free-text string (too many to enumerate)
- Grade as string field (e.g., "PSA 10", "BGS 9.5", "RAW") — not an enum, grading systems vary

**Schema conventions:**
- All LLM-facing Zod fields use z.nullable() not z.optional() (OpenAI strict mode compatibility)
- Separate "LLM output" schemas from "API response" schemas — API schemas can use optional
- All price fields include priceFetchedAt (DateTime) and priceConfidence ("LIVE" | "RECENT_24H" | "STALE_7D" | "NO_DATA")
- Action schema includes all 7 types: BUYBACK, LIST, REDEEM, SHIP_TO_VAULT, OPEN_PACK, WATCHLIST, BUNDLE_SHIP

**Database design:**
- Soft delete (deletedAt column) on user-facing tables (users, user_cards, external_cards)
- Card state enum: VAULTED, EXTERNAL, ON_MARKET, IN_TRANSIT
- actions_log table for audit trail (agent recommendation + user action)
- marketplace_listings as stub table (minimal columns, ready for real integration)
- Timestamps (createdAt, updatedAt) on all tables

**Seed data:**
- 3 users with distinct profiles: collector (many cards, diverse IPs), flipper (few high-value cards), new user (1-2 cards)
- ~50 cards across 3-4 IPs (pokemon, one-piece, sports, yugioh)
- Cards in all states: vaulted, external, on_market, in_transit
- Realistic price ranges ($5–$5000) with varying confidence levels
- 2 packs with associated pack_cards mappings
- A few marketplace_listings stubs

**Configuration:**
- Environment variables for DB connection, LLM API keys
- JSON config file or env vars for thresholds: VAULT_VALUE_THRESHOLD: $50, BATCH_SHIP_COUNT: 3, BATCH_SHIP_VALUE: $200, LLM_MAX_RETRIES: 3, ARCHETYPE_MIN_CARDS: 5

### Claude's Discretion
- Exact Prisma schema column types and indexes
- tsconfig paths and module resolution details
- Turborepo cache configuration
- Package.json scripts naming
- ESLint/Prettier configuration choices

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | TypeScript pnpm monorepo with apps/api, packages/agent, packages/schemas, packages/db structure | pnpm 10 workspace setup, Turborepo 2 tasks pipeline, tsconfig.base.json patterns |
| FOUND-02 | Zod schemas defined for CardAnalysis, PortfolioSummary, CollectorArchetype, and Action types with nullable (not optional) fields for LLM compatibility | Zod 4 z.nullable() pattern, LLM schema separation, OpenAI strict mode requirement |
| FOUND-03 | Prisma schema with all required tables and state enum | Prisma 7 schema.prisma syntax, uuid(7), soft delete pattern, enum definition |
| FOUND-04 | All price fields include priceFetchedAt timestamp and priceConfidence enum | Prisma 7 field types, Zod enum pattern for priceConfidence |
| FOUND-05 | Seed data fixtures for local development covering all card states and user scenarios | Prisma seed script pattern with tsx, Prisma 7 client instantiation |
</phase_requirements>

---

## Summary

This phase establishes the entire technical foundation: a four-package pnpm + Turborepo monorepo, a Zod 4 schema layer (with LLM-compatible nullable conventions), a Prisma 7 data model, and seed fixtures. All subsequent phases build directly on these contracts — schema drift here causes cascading breakage upstream.

The key implementation challenge is Prisma 7's new configuration model. Prisma 7 (GA January 2026) moved to an explicit driver adapter pattern with a `prisma.config.ts` file that replaces the old `.env`-based datasource block. The `@prisma/adapter-pg` adapter must be passed to the `PrismaClient` constructor; it is no longer embedded in the binary. Additionally, pnpm 10 blocks postinstall scripts by default, so `@prisma/client` must be allowlisted in `pnpm.onlyBuiltDependencies` or `prisma generate` must run explicitly in the build pipeline.

The Zod 4 schema design is a permanent architectural decision. Using `z.nullable()` (not `z.optional()`) for all LLM-facing fields is non-negotiable for OpenAI strict mode compatibility. Schemas must be split into two groups: `schemas/llm/` (nullable, strict) and `schemas/api/` (optional-friendly, consumer-oriented). The planner should treat this naming convention as locked.

**Primary recommendation:** Build packages in strict dependency order — schemas → db (with migrate + seed validation) → agent skeleton → api skeleton — confirming each layer compiles before building the next. The Turborepo `tasks` pipeline enforces this at CI; manually verify it locally before proceeding to Phase 2.

---

## Standard Stack

### Core (all versions verified against official sources as of 2026-03-04)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 22.x LTS | Runtime | Active LTS until April 2027; Fastify 5 requires Node 20+; 30% faster startup than Node 20 |
| TypeScript | ~5.8 | Type system | Current stable; Prisma 7 requires min TS 5.1; Zod 4 reduces compiler instantiations 100x |
| pnpm | 10.x (10.30.3+) | Package manager + workspace | Strictest phantom-dependency prevention; `workspace:` protocol; v10 security hardening |
| Turborepo | 2.x | Monorepo task orchestration | `tasks` key (v2, replaces `pipeline`); auto-detects pnpm workspaces; right-sized for 4-package monorepo |
| Zod | 4.x | Schema validation (all contexts) | 14x faster parsing vs v3; built-in `z.toJSONSchema()`; 100x fewer TS compiler instantiations |
| Prisma ORM | 7.x (7.4.x) | Database ORM + migrations | Pure-TS client (Rust-free); 90% smaller bundles, 3x faster queries; explicit adapter architecture |
| PostgreSQL | 16+ | Primary database | Fully supported by Prisma 7; standard relational fit |
| @prisma/adapter-pg | 7.x | PostgreSQL driver adapter | Required in Prisma 7 — replaces implicit Rust engine for PG |
| pg | 8.x | PostgreSQL Node.js driver | Underlying driver for @prisma/adapter-pg |

### Supporting (for this phase specifically)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | latest | TypeScript execution (no compile step) | seed.ts, prisma.config.ts, dev scripts |
| dotenv | 16.x | Environment variable loading | Prisma 7 no longer auto-loads .env; explicit import in prisma.config.ts |
| @types/node | 22.x | Node.js type definitions | Match Node.js runtime version |
| vitest | 3.x | Unit tests | Zod schema tests (FOUND-02 verification) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Turborepo 2 | Nx | Nx better for 50+ packages; overkill for 4-package service monorepo |
| Prisma 7 | Drizzle ORM | Drizzle valid for SQL-first teams; Prisma 7 migration tooling wins for greenfield schema iteration |
| Zod 4 | TypeBox | TypeBox excellent for Fastify natively, but dual-schema problem with LLM layer; Zod 4 now covers both |
| tsx | ts-node | ts-node broken ESM support on Node 20+; tsx is community standard replacement |

**Installation:**
```bash
# Root workspace
pnpm init
# Add Turborepo as root dev dep
pnpm add -Dw turbo typescript@~5.8 @types/node tsx vitest prettier eslint

# packages/schemas
pnpm add zod --filter @tcg/schemas

# packages/db
pnpm add prisma @prisma/client @prisma/adapter-pg pg dotenv --filter @tcg/db

# packages/agent (skeleton only this phase)
pnpm add zod --filter @tcg/agent

# apps/api (skeleton only this phase)
pnpm add fastify --filter @tcg/api
```

---

## Architecture Patterns

### Recommended Project Structure

```
tcg-agent/
├── pnpm-workspace.yaml        # packages: ['apps/*', 'packages/*']
├── turbo.json                 # tasks: build, typecheck, test, lint
├── package.json               # root — dev deps, scripts; packageManager field required
├── tsconfig.base.json         # shared TS config: moduleResolution: bundler, strict: true
├── .env                       # DATABASE_URL, etc. (gitignored)
├── packages/
│   ├── schemas/               # @tcg/schemas — Zod schemas, SINGLE SOURCE OF TRUTH
│   │   ├── src/
│   │   │   ├── llm/           # LLM-output schemas (z.nullable(), strict mode compatible)
│   │   │   │   ├── card-analysis.ts
│   │   │   │   ├── portfolio-summary.ts
│   │   │   │   ├── archetype.ts
│   │   │   │   └── action.ts
│   │   │   ├── api/           # API-response schemas (z.optional() allowed)
│   │   │   └── index.ts       # barrel export
│   │   ├── package.json       # name: "@tcg/schemas"
│   │   └── tsconfig.json      # extends ../../tsconfig.base.json
│   ├── db/                    # @tcg/db — Prisma client, migrations, seed
│   │   ├── prisma/
│   │   │   └── schema.prisma  # full data model
│   │   ├── prisma.config.ts   # defineConfig with adapter-pg
│   │   ├── src/
│   │   │   ├── client.ts      # Singleton PrismaClient export
│   │   │   └── seed.ts        # Dev fixtures (3 users, ~50 cards, all states)
│   │   ├── package.json       # name: "@tcg/db"
│   │   └── tsconfig.json
│   └── agent/                 # @tcg/agent — skeleton only this phase
│       ├── src/
│       │   └── index.ts       # placeholder export
│       ├── package.json       # name: "@tcg/agent"; deps: @tcg/schemas, @tcg/db
│       └── tsconfig.json
└── apps/
    └── api/                   # @tcg/api — skeleton only this phase
        ├── src/
        │   └── server.ts      # Fastify server bootstrap (no routes yet)
        ├── package.json       # name: "@tcg/api"; deps: @tcg/agent, @tcg/db, @tcg/schemas
        └── tsconfig.json
```

### Pattern 1: Turborepo `tasks` Pipeline (v2 format)

**What:** Turborepo 2.0 renamed `pipeline` to `tasks` in turbo.json. The `dependsOn: ["^build"]` syntax is unchanged — `^` prefix means "wait for this task in all dependency packages first."

**When to use:** Always. Root turbo.json defines the build order; packages automatically participate.

**Example:**
```json
// turbo.json (Turborepo 2.x format — "tasks" not "pipeline")
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

This enforces: schemas builds first → db → agent → api. Any package whose `package.json` lists `@tcg/schemas` as a dependency will wait for schemas to build before its own build starts.

### Pattern 2: Prisma 7 Configuration (`prisma.config.ts`)

**What:** Prisma 7 moves all database configuration out of `schema.prisma` datasource blocks and into `prisma.config.ts`. The `@prisma/adapter-pg` is passed to `PrismaClient` at instantiation, NOT configured in `prisma.config.ts` (the `adapter` property was removed from `defineConfig` in v7). The `prisma.config.ts` handles DB URL and schema path; the client code handles adapter wiring.

**When to use:** Required in Prisma 7. Without this file, `prisma migrate dev` and related CLI commands will fail.

**Example:**
```typescript
// packages/db/prisma.config.ts
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

```typescript
// packages/db/src/client.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

export const prisma = new PrismaClient({ adapter })
```

### Pattern 3: Zod 4 LLM Schema Conventions

**What:** All Zod schemas intended for LLM output validation must use `z.nullable()` (not `z.optional()`) for fields that can be absent. This is required for OpenAI strict mode. Note a subtle gotcha: some reports show `z.string().nullable()` can behave differently than `z.union([z.string(), z.null()])` for certain OpenAI model versions — use `z.union([z.string(), z.null()])` explicitly if issues arise.

**When to use:** Every field in `schemas/llm/*.ts` that is not always present.

**Example:**
```typescript
// packages/schemas/src/llm/card-analysis.ts
import { z } from 'zod'

// LLM Schema Convention: z.nullable() not z.optional()
// Required for OpenAI strict mode (all fields must be in "required" array)
export const CardAnalysisSchema = z.object({
  card_id: z.string(),
  identity_tags: z.array(z.string()),
  rarity_signal: z.string(),
  liquidity_signal: z.string(),
  // nullable fields: present in output but may be null
  price_band: z.union([z.object({
    low: z.number(),
    high: z.number(),
    currency: z.string(),
  }), z.null()]),
  reasoning_bullets: z.array(z.string()),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  // actions are NOT LLM-populated — injected by service layer from rules engine
  // this schema does NOT include an "actions" field
})

export type CardAnalysis = z.infer<typeof CardAnalysisSchema>
```

```typescript
// packages/schemas/src/llm/action.ts
import { z } from 'zod'

export const ActionTypeSchema = z.enum([
  'BUYBACK',
  'LIST',
  'REDEEM',
  'SHIP_TO_VAULT',
  'OPEN_PACK',
  'WATCHLIST',
  'BUNDLE_SHIP',
])

export const ActionSchema = z.object({
  type: ActionTypeSchema,
  params: z.union([z.record(z.unknown()), z.null()]),
  ui_copy: z.string(),
  risk_notes: z.union([z.string(), z.null()]),
})

export type Action = z.infer<typeof ActionSchema>
```

### Pattern 4: Prisma 7 Schema with UUID v7 and Enums

**What:** Prisma natively supports UUID v7 via `@default(uuid(7))`. No external UUID library needed. The enum syntax for card states and price confidence works as shown below.

**When to use:** All primary key fields use `@default(uuid(7))`.

**Example:**
```prisma
// packages/db/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/client"
}

// Note: In Prisma 7, datasource url goes in prisma.config.ts
// The datasource block is still required in schema.prisma for tooling compatibility
// but the url is effectively overridden by prisma.config.ts
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum CardState {
  VAULTED
  EXTERNAL
  ON_MARKET
  IN_TRANSIT
}

enum PriceConfidence {
  LIVE
  RECENT_24H
  STALE_7D
  NO_DATA
}

model User {
  id        String    @id @default(uuid(7)) @db.Uuid
  email     String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?             // soft delete

  userCards UserCard[]
  externalCards ExternalCard[]
  actionsLog ActionsLog[]
}

model Card {
  id          String   @id @default(uuid(7)) @db.Uuid
  name        String
  ipCategory  String   // "pokemon" | "one-piece" | "sports" | "yugioh" | etc.
  setName     String?  // free text
  language    String   // ISO 639-1: "en", "ja", "ko", "zh"
  grade       String?  // "PSA 10", "BGS 9.5", "RAW"
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userCards   UserCard[]
  packCards   PackCard[]
}

model UserCard {
  id               String          @id @default(uuid(7)) @db.Uuid
  userId           String          @db.Uuid
  cardId           String          @db.Uuid
  state            CardState
  estimatedValue   Decimal?        @db.Decimal(10, 2)
  priceFetchedAt   DateTime?
  priceConfidence  PriceConfidence @default(NO_DATA)
  certNumber       String?         // for graded cards
  userNotes        String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  deletedAt        DateTime?

  user   User   @relation(fields: [userId], references: [id])
  card   Card   @relation(fields: [cardId], references: [id])
  marketplaceListing MarketplaceListing?

  @@index([userId])
  @@index([state])
}

model ExternalCard {
  id               String          @id @default(uuid(7)) @db.Uuid
  userId           String          @db.Uuid
  name             String
  setName          String?
  grade            String?
  certNumber       String?
  estimatedValue   Decimal?        @db.Decimal(10, 2)
  priceConfidence  PriceConfidence @default(NO_DATA)
  priceFetchedAt   DateTime?
  userNotes        String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  deletedAt        DateTime?

  user   User   @relation(fields: [userId], references: [id])

  @@index([userId])
}

model Pack {
  id          String   @id @default(uuid(7)) @db.Uuid
  userId      String   @db.Uuid
  name        String
  ipCategory  String
  openedAt    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  packCards   PackCard[]
}

model PackCard {
  id        String   @id @default(uuid(7)) @db.Uuid
  packId    String   @db.Uuid
  cardId    String   @db.Uuid
  createdAt DateTime @default(now())

  pack   Pack   @relation(fields: [packId], references: [id])
  card   Card   @relation(fields: [cardId], references: [id])
}

model MarketplaceListing {
  id          String   @id @default(uuid(7)) @db.Uuid
  userCardId  String   @unique @db.Uuid
  listPrice   Decimal  @db.Decimal(10, 2)
  status      String   @default("ACTIVE") // stub: ACTIVE | SOLD | CANCELLED
  listedAt    DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userCard    UserCard @relation(fields: [userCardId], references: [id])
}

model ActionsLog {
  id                String   @id @default(uuid(7)) @db.Uuid
  userId            String   @db.Uuid
  cardId            String?  @db.Uuid
  agentRecommended  Json     // what agent suggested
  userAction        String?  // what user clicked
  createdAt         DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

### Pattern 5: pnpm 10 Workspace Root `package.json`

**What:** pnpm 10 requires `packageManager` field in root `package.json`. It blocks postinstall scripts by default. `@prisma/client` needs to be in `onlyBuiltDependencies` to allow client generation on install. The `workspace:*` protocol is used for cross-package deps.

**Example:**
```json
// root package.json
{
  "name": "tcg-agent",
  "private": true,
  "packageManager": "pnpm@10.30.3",
  "scripts": {
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:migrate": "pnpm --filter @tcg/db prisma migrate dev",
    "db:seed": "pnpm --filter @tcg/db run seed",
    "db:generate": "pnpm --filter @tcg/db prisma generate"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["@prisma/client"]
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Pattern 6: Seed Script with tsx

**What:** Seed script runs as a plain TypeScript file via tsx — no compilation step needed. It instantiates the Prisma client and uses `upsert` or `createMany` with `skipDuplicates` to be idempotent.

**Example:**
```typescript
// packages/db/src/seed.ts
import 'dotenv/config'
import { prisma } from './client'

async function main() {
  // Create canonical cards first
  const charizard = await prisma.card.upsert({
    where: { id: '019...fixed-uuid-v7-for-seeding...' },
    update: {},
    create: {
      id: '019...fixed-uuid-v7-for-seeding...',
      name: 'Charizard VMAX',
      ipCategory: 'pokemon',
      setName: 'Sword & Shield — Champions Path',
      language: 'en',
      grade: 'PSA 10',
    },
  })
  // ... create users, userCards in all states, packs, etc.
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

```json
// packages/db/package.json scripts
{
  "scripts": {
    "seed": "tsx src/seed.ts",
    "prisma": "prisma",
    "build": "tsc --project tsconfig.json",
    "generate": "prisma generate"
  }
}
```

### Anti-Patterns to Avoid

- **Using `pipeline` in turbo.json:** Turborepo 2 renamed this to `tasks`. Using `pipeline` will fail with a migration warning.
- **datasource url in schema.prisma only:** Prisma 7 CLI reads from `prisma.config.ts`. Datasource block in schema.prisma is still required syntactically but the url value is overridden by the config file.
- **`z.optional()` in LLM schemas:** OpenAI strict mode requires all fields in `required`. `z.optional()` makes fields optional (absent from required) — use `z.nullable()` or `z.union([type, z.null()])` instead.
- **Putting business logic in schema index.ts:** Only Zod schema definitions and their inferred types should live in `packages/schemas`. No utility functions, no formatting, no validation logic.
- **Using `autoincrement()` for primary keys:** Context decision is UUID v7. Mixing ID strategies creates confusion at API boundaries.
- **Missing `packageManager` field in root package.json:** Turborepo 2 requires this field. pnpm 10 uses it for tooling validation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID v7 generation | Custom time-ordered ID function | `@default(uuid(7))` in Prisma schema | Prisma handles it natively at DB level; no application code needed |
| Monorepo build ordering | Custom build scripts with dependency checks | Turborepo `tasks` with `dependsOn: ["^build"]` | Turborepo computes the DAG and caches at task level |
| TypeScript type inference from Zod | Separate `interface` definitions | `z.infer<typeof Schema>` | Types are always in sync with validation; zero drift |
| Prisma migration state tracking | Manual SQL migration files | `prisma migrate dev` | Prisma generates, checksums, and applies migrations; manual SQL breaks the migration history |
| Environment variable loading | Custom dotenv wrapper | `import 'dotenv/config'` at the top of `prisma.config.ts` | One-liner; Prisma 7 explicitly does NOT auto-load `.env` anymore |
| Cross-package TypeScript references | Copy-paste types across packages | `workspace:*` + `composite: true` + tsconfig `references` | Live types update without rebuild; no stale compiled definitions |

**Key insight:** The entire foundation phase is scaffolding that tools handle automatically. The planner's job is wiring them together in the right order, not building novel solutions to solved problems.

---

## Common Pitfalls

### Pitfall 1: Prisma 7 `adapter` in `defineConfig` (Removed)

**What goes wrong:** The `adapter` property was removed from `defineConfig` in Prisma 7. The old pattern that passes `adapter: new PrismaPg(...)` inside `prisma.config.ts` produces a type error and is silently ignored — or worse, causes confusing "adapter not found" runtime errors.

**Why it happens:** Blog posts and migration guides from 2025 (pre-GA Prisma 7) show `adapter` inside `defineConfig`. The GA release changed this.

**How to avoid:** The `adapter` belongs in `new PrismaClient({ adapter })` in `src/client.ts`, NOT in `prisma.config.ts`. The `prisma.config.ts` only configures the CLI behavior (schema path, migration path, datasource URL for CLI commands). The application code wires the adapter.

**Warning signs:** `prisma.config.ts` imports from `@prisma/adapter-pg`.

### Pitfall 2: pnpm 10 Blocks `@prisma/client` Postinstall

**What goes wrong:** After `pnpm install`, the Prisma client is not generated because pnpm 10 blocks postinstall scripts by default. TypeScript compilation fails with "Cannot find module '@prisma/client'".

**Why it happens:** pnpm 10 introduced a security hardening change: no lifecycle scripts run unless explicitly allowlisted.

**How to avoid:** Add to root `package.json`:
```json
{
  "pnpm": {
    "onlyBuiltDependencies": ["@prisma/client"]
  }
}
```
Alternatively, add `"generate": "prisma generate"` to `packages/db/package.json` scripts and run it explicitly in the Turborepo build pipeline before compilation steps.

**Warning signs:** TypeScript builds succeed locally (where Prisma was previously generated) but fail in fresh CI environments.

### Pitfall 3: Turborepo `pipeline` vs `tasks` Key

**What goes wrong:** Using `pipeline` in `turbo.json` causes a deprecation error or silent failure in Turborepo 2.x. The build appears to run but task dependencies are not respected.

**Why it happens:** Turborepo 2.0 (released 2024) renamed `pipeline` to `tasks`. Many tutorials and examples still show the old format.

**How to avoid:** Use `tasks` key in `turbo.json`. Run `npx @turbo/codemod migrate` on any existing Turborepo config to auto-migrate. Always check the `$schema` URL matches the Turborepo 2 schema.

**Warning signs:** `turbo.json` contains `"pipeline": {}` instead of `"tasks": {}`.

### Pitfall 4: Schema Drift Between LLM and API Schemas

**What goes wrong:** The LLM schema (`schemas/llm/card-analysis.ts`) and the API response schema (`schemas/api/card-analysis.ts`) diverge. LLM produces a shape the API layer rejects, or vice versa. TypeScript types appear correct (both compile) but runtime validation fails.

**Why it happens:** Both schemas grow independently over time. A field added to the LLM schema for validation purposes (e.g., `complianceFlags`) gets accidentally included in the API schema too — or forgotten.

**How to avoid:** API schemas should be derived from LLM schemas using Zod's `pick`, `omit`, or `transform` to strip internal fields. Never define API schema fields independently from LLM schema fields. Document which fields are LLM-internal vs API-public.

**Warning signs:** Both schema files contain the same field name defined separately.

### Pitfall 5: Seed Script Not Idempotent

**What goes wrong:** Running `pnpm db:seed` twice creates duplicate records, causing unique constraint violations or doubled test data. Development becomes unreliable.

**Why it happens:** Seed scripts typically use `prisma.model.create()` without checking for existing records.

**How to avoid:** Use `upsert` with a stable identifier (fixed UUID in seed data) or `createMany({ skipDuplicates: true })`. For the test users and canonical cards, assign fixed known UUIDs in the seed script rather than generating new ones on each run.

**Warning signs:** Running the seed script a second time throws unique constraint errors.

### Pitfall 6: Missing `@db.Uuid` Annotation on UUID Fields

**What goes wrong:** Prisma defaults `String` fields to `VARCHAR` in PostgreSQL. Without `@db.Uuid`, UUID values are stored as `VARCHAR(36)` strings instead of native `UUID` type. Indexes on UUID fields perform significantly worse.

**Why it happens:** `@db.Uuid` is optional from Prisma's perspective (the schema.prisma is valid without it) but required for correct PostgreSQL type mapping.

**How to avoid:** All `@id` fields using `@default(uuid(7))` must also have `@db.Uuid`. All foreign key references to those fields must also have `@db.Uuid`. Codify as a PR checklist item.

**Warning signs:** `prisma migrate dev` generates `VARCHAR(36)` columns instead of `UUID` columns in the migration SQL.

---

## Code Examples

Verified patterns from official sources:

### Turborepo 2 `turbo.json` (Correct Format)
```json
// Source: https://turborepo.dev/blog/turbo-2-0
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "db:generate": {
      "cache": false
    }
  }
}
```

### tsconfig.base.json (Shared Root Config)
```json
// Source: TypeScript monorepo live types pattern — colinhacks.com
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Per-Package tsconfig.json
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": []
}
```
For `packages/db`: add `"references": [{ "path": "../schemas" }]`
For `packages/agent`: add `"references": [{ "path": "../schemas" }, { "path": "../db" }]`
For `apps/api`: add `"references": [{ "path": "../../packages/schemas" }, { "path": "../../packages/db" }, { "path": "../../packages/agent" }]`

### Zod 4 `PortfolioSummary` LLM Schema Example
```typescript
// packages/schemas/src/llm/portfolio-summary.ts
import { z } from 'zod'

export const PortfolioBreakdownSchema = z.object({
  ipCategory: z.string(),
  totalValue: z.number(),
  cardCount: z.number(),
  percentOfPortfolio: z.number(),
})

export const PortfolioSummarySchema = z.object({
  userId: z.string(),
  totalValueEst: z.number(),
  breakdown: z.array(PortfolioBreakdownSchema),
  concentrationScore: z.number(),  // 0-1 where 1 = fully concentrated
  liquidityScore: z.number(),       // 0-1
  collectorArchetype: z.union([z.string(), z.null()]),
  missingSetGoals: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  // price staleness metadata — required on all price-bearing schemas
  priceDataAsOf: z.union([z.string(), z.null()]),  // ISO timestamp
  priceConfidence: z.enum(['LIVE', 'RECENT_24H', 'STALE_7D', 'NO_DATA']),
})

export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>
```

### Prisma 7 Singleton Client (Correct Pattern)
```typescript
// packages/db/src/client.ts
// Source: Prisma 7 upgrade guide — prisma.io/docs
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

// Singleton pattern — prevents multiple connections in development
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pipeline` in turbo.json | `tasks` in turbo.json | Turborepo 2.0 (2024) | Old format causes migration warning or silent failures |
| Prisma auto-loads `.env` | Explicit `import 'dotenv/config'` in `prisma.config.ts` | Prisma 7 (Jan 2026) | Without explicit load, DATABASE_URL is undefined in CLI commands |
| `PrismaClient()` with built-in Rust engine | `PrismaClient({ adapter: new PrismaPg(...) })` | Prisma 7 (Jan 2026) | Rust engine removed; explicit adapter required |
| `zod-to-json-schema` external package | `z.toJSONSchema()` built into Zod 4 | Zod 4 (2025) | One fewer dependency; consistent behavior |
| ts-node for TypeScript execution | tsx | 2024 | ts-node has broken ESM support on Node 20+ |
| `pipeline` schema.prisma datasource url | `prisma.config.ts` datasource.url | Prisma 7 (Jan 2026) | datasource block in schema.prisma is now deprecated for config; still required syntactically |

**Deprecated/outdated:**
- `pipeline` key in `turbo.json`: Use `tasks` key instead
- Automatic `.env` loading in Prisma: Explicit dotenv import required
- `ts-node`: Use `tsx` for all TypeScript execution in dev
- `zod-to-json-schema` package: Use `z.toJSONSchema()` from Zod 4

---

## Open Questions

1. **fastify-type-provider-zod version for Zod 4**
   - What we know: PR #176 added Zod 4 API support; latest release is 6.0.0 (Sept 2024); v5.0.0 includes "Switch to Zod v4 API"; research is inconsistent on which version number is correct
   - What's unclear: The exact npm version that definitively supports Zod 4 — the context notes flagged this as a "first-day validation step"
   - Recommendation: On Phase 1 Day 1, run `pnpm add fastify-type-provider-zod` and verify `ZodTypeProvider` works with a simple Zod 4 schema before any route code is written. If incompatible, pin the last compatible version or use `@fastify/type-provider-typebox` temporarily.

2. **Prisma schema.prisma datasource block with Prisma 7**
   - What we know: `prisma.config.ts` overrides datasource URL for CLI; the datasource block is still syntactically required in schema.prisma
   - What's unclear: Whether an empty URL placeholder (e.g., `url = "placeholder"`) in schema.prisma is needed or whether Prisma 7 can fully omit the block
   - Recommendation: Keep a minimal datasource block in schema.prisma for IDE tooling (Prisma VS Code extension reads it); let `prisma.config.ts` override the URL at runtime.

3. **Vitest version in this stack**
   - What we know: Stack research references Vitest 4.x; latest release notes show Vitest 3.2 (deprecated workspace file in favor of projects option)
   - What's unclear: Whether Vitest 4 has been released — STACK.md says "current version 4.x" but Vitest 3.2 blog post from the official site is latest confirmed
   - Recommendation: Install latest vitest, verify version. Use per-package `vitest.config.ts` files (not a root workspace file) as recommended in Vitest 3.2+.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest, ~3.x) |
| Config file | Per-package `vitest.config.ts` (none yet — Wave 0 gap) |
| Quick run command | `pnpm --filter @tcg/schemas test` |
| Full suite command | `pnpm run test` (Turborepo runs all packages) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | `pnpm install && pnpm build` succeeds across all packages | build/smoke | `pnpm build` | ❌ Wave 0 |
| FOUND-02 | Zod schemas parse valid CardAnalysis, PortfolioSummary, CollectorArchetype, Action; reject invalid; all LLM fields are nullable | unit | `pnpm --filter @tcg/schemas test` | ❌ Wave 0 |
| FOUND-03 | `prisma migrate dev` produces all tables with correct state enum and price columns | migration/smoke | `pnpm db:migrate` (manual verify) | ❌ Wave 0 |
| FOUND-04 | priceFetchedAt and priceConfidence present on UserCard and ExternalCard models | unit (Prisma introspection) | Verified via migration SQL inspection | ❌ Wave 0 |
| FOUND-05 | `pnpm db:seed` populates all states and user scenarios without errors | smoke | `pnpm db:seed` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @tcg/schemas test` (schema unit tests, <5s)
- **Per wave merge:** `pnpm build && pnpm test` (full Turborepo pipeline)
- **Phase gate:** `pnpm build` green + `pnpm db:migrate` green + `pnpm db:seed` green + all schema unit tests green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/schemas/vitest.config.ts` — Vitest configuration for schema package
- [ ] `packages/schemas/src/__tests__/card-analysis.test.ts` — covers FOUND-02 (valid/invalid CardAnalysis)
- [ ] `packages/schemas/src/__tests__/portfolio-summary.test.ts` — covers FOUND-02 (PortfolioSummary)
- [ ] `packages/schemas/src/__tests__/archetype.test.ts` — covers FOUND-02 (CollectorArchetype)
- [ ] `packages/schemas/src/__tests__/action.test.ts` — covers FOUND-02 (Action types, all 7)
- [ ] Framework install: `pnpm add -D vitest --filter @tcg/schemas`

---

## Sources

### Primary (HIGH confidence)
- [Prisma 7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) — breaking changes, adapter requirement, prisma.config.ts format
- [Prisma config reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference) — defineConfig API, datasource options
- [Turborepo 2.0 release blog](https://turborepo.dev/blog/turbo-2-0) — `pipeline` → `tasks` rename, required packageManager field, cache location change
- [Turborepo task configuration docs](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) — dependsOn semantics, ^ prefix meaning
- [Zod v4 release notes](https://zod.dev/v4) — performance benchmarks, z.nullable vs z.optional, z.toJSONSchema()
- [pnpm 10 lifecycle script blocking announcement](https://socket.dev/blog/pnpm-10-0-0-blocks-lifecycle-scripts-by-default) — onlyBuiltDependencies requirement
- [Prisma UUID v7 GitHub issue #24079](https://github.com/prisma/prisma/issues/24079) — confirmed uuid(7) in @default()
- [Prisma use in pnpm workspaces guide](https://www.prisma.io/docs/guides/use-prisma-in-pnpm-workspaces) — monorepo configuration

### Secondary (MEDIUM confidence)
- [fastify-type-provider-zod PR #176](https://github.com/turkerdev/fastify-type-provider-zod/pull/176) — Zod v4 API support; exact released version unclear
- [OpenAI community: strict=true and z.nullable gotcha](https://community.openai.com/t/strict-true-and-required-fields/1131075) — nullable vs optional distinction
- [pnpm 10 in 2025 blog](https://pnpm.io/blog/2025/12/29/pnpm-in-2025) — v10.30.3 current; onlyBuiltDependencies behavior

### Tertiary (LOW confidence — verify before implementation)
- [Vitest 3.2 blog post](https://vitest.dev/blog/vitest-3-2.html) — workspace deprecation in favor of `projects` option; version number uncertain vs STACK.md claim of 4.x

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm or official docs as of 2026-03-04
- Architecture: HIGH — Turborepo, pnpm workspace, Prisma 7, and Zod 4 patterns all verified against primary sources
- Pitfalls: HIGH (critical) / MEDIUM (operational) — Prisma 7 config gotchas verified; seed idempotency and schema drift are well-established patterns
- Validation architecture: HIGH — test structure follows established pnpm+Vitest monorepo patterns

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (Prisma 7 and Turborepo 2 are stable; Zod 4 is stable; 30-day validity is appropriate)
