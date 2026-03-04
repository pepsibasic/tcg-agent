# Stack Research

**Domain:** TypeScript monorepo — Fastify API + Prisma ORM + LLM agent service (collectible card portfolio)
**Researched:** 2026-03-04
**Confidence:** HIGH (all major choices verified against current official sources or npm)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 22.x LTS | Runtime | Active LTS until April 2027; required for Fastify v5 (Node 20+); native --experimental-strip-types for tsx-free dev; 30% faster startup than Node 20 |
| TypeScript | ~5.8 | Type system | Current stable; 5.8 adds granular branch return type checks; Prisma 7 requires min TS 5.1; Zod 4 reduces compiler instantiations 100x |
| pnpm | 10.x (latest: 10.30.3) | Package manager / workspace manager | Strictest phantom-dependency prevention; content-addressable store; `workspace:` protocol for cross-package refs; v10 adds security hardening (minimumReleaseAge, no-downgrade) |
| Turborepo | 2.x | Monorepo task orchestration | Minimal config ("convention over configuration"); excellent pnpm workspace integration; build caching + parallelization; right-sized for a 4-package monorepo (no NX overhead) |
| Fastify | 5.7.x | HTTP API framework | Faster startup than Express/NestJS; native schema-based serialization; TypeBox/Zod type-provider support for compile-time type inference; built-in pino logging; targets Node 20+; required for this service-oriented architecture |
| Prisma ORM | 7.x (latest: 7.4.x) | Database ORM + migrations | Rust-free pure-TS client (v7 GA Jan 2026); 90% smaller bundles, 3x faster queries, 70% faster type-checks; driver adapter architecture (explicit `@prisma/adapter-pg`); new `prisma.config.ts` centralizes DB config |
| PostgreSQL | 16+ | Primary database | Specified in PROJECT.md; Prisma 7 fully supports; standard relational fit for cards/users/actions schema |
| Zod | 4.x | Schema validation (all contexts) | 14x faster parsing vs v3; built-in `z.toJSONSchema()` eliminates `zod-to-json-schema` dep; 100x fewer TS compiler instantiations (critical in monorepo); shared between API request validation AND LLM output validation |

### AI / LLM Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel AI SDK (`ai`) | 6.x (latest: 6.0.108) | Unified LLM abstraction | Provider-agnostic (OpenAI, Anthropic, 20+ others); `generateObject()` accepts Zod schemas directly → end-to-end typed structured outputs; handles retries, streaming, provider switching without code changes |
| `openai` | 6.25.x | OpenAI API client (via AI SDK) | AI SDK uses this under the hood for OpenAI; pin version explicitly to control breaking changes |
| `@anthropic-ai/sdk` | 0.78.x | Anthropic API client (via AI SDK) | AI SDK uses this under the hood for Anthropic; Anthropic Structured Outputs (public beta Nov 2025) guarantees schema-conformant JSON when used with `anthropic-beta: structured-outputs-2025-11-13` header |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fastify-type-provider-zod` | latest | Fastify ↔ Zod integration | Every route — enables Zod schemas to drive both request validation AND compile-time TypeScript types via `withTypeProvider<ZodTypeProvider>()` |
| `@fastify/swagger` + `@fastify/swagger-ui` | latest | Auto-generated OpenAPI docs | From day one — Zod schemas feed swagger automatically; essential for integration team consuming agent endpoints |
| `@fastify/cors` | latest | CORS headers | Required for embedded UI components calling API |
| `@fastify/helmet` | latest | Security headers | Production safety baseline; add at project init |
| `@prisma/adapter-pg` | 7.x | PostgreSQL driver adapter | Required in Prisma 7 — explicit adapter replaces implicit Rust engine |
| `pg` | 8.x | PostgreSQL Node.js driver | Underlying driver for `@prisma/adapter-pg` |
| `pino` | built-in | Structured logging | Fastify's default logger; JSON output; automatic request ID propagation; use `pino-pretty` in dev only |
| `dotenv` | 16.x | Environment variable loading | Prisma 7 no longer auto-loads `.env`; explicit load required in `prisma.config.ts` |
| `@types/node` | 22.x | Node.js type definitions | Match Node.js runtime version |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsx` | TypeScript execution in dev (no compile step) | Replacement for ts-node; Node 20+ compatible; use for `prisma.config.ts` and seed scripts |
| `vitest` | Unit + integration tests | Current version 4.x; native TS support; fast with Vite; use `@vitest/coverage-v8` for coverage |
| `eslint` + `typescript-eslint` | Linting | Use flat config format (eslint.config.ts); typescript-eslint 8.x |
| `prettier` | Code formatting | Pin version in root, shared config via `packages/config` |
| `pino-pretty` | Human-readable logs in development | Dev-only; never in production (defeats pino's performance benefit) |
| Turborepo | Pipeline caching | `turbo.json` at root; define `build`, `typecheck`, `test`, `lint` tasks with correct dependency graph |

---

## Installation

```bash
# Initialize pnpm workspace (root)
pnpm init
# Create pnpm-workspace.yaml pointing to packages/* and apps/*

# Core runtime deps (apps/api)
pnpm add fastify fastify-type-provider-zod @fastify/swagger @fastify/swagger-ui @fastify/cors @fastify/helmet

# Database (packages/db)
pnpm add prisma @prisma/client @prisma/adapter-pg pg dotenv

# Zod (packages/schemas — shared)
pnpm add zod

# LLM layer (packages/agent)
pnpm add ai openai @anthropic-ai/sdk

# Dev dependencies (root workspace)
pnpm add -Dw typescript@~5.8 @types/node tsx vitest @vitest/coverage-v8 eslint typescript-eslint prettier pino-pretty turbo
```

---

## Package Structure

```
tcg-agent/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json            # root — dev deps, scripts
├── tsconfig.base.json      # shared TS config
├── packages/
│   ├── schemas/            # Zod schemas for all agent outputs
│   │   └── package.json    # name: "@tcg/schemas"
│   ├── db/                 # Prisma schema, client, migrations
│   │   └── package.json    # name: "@tcg/db"
│   └── agent/              # Rules engine + LLM integration
│       └── package.json    # name: "@tcg/agent"
└── apps/
    └── api/                # Fastify HTTP server
        └── package.json    # name: "@tcg/api"
```

Cross-package dependencies use `workspace:` protocol:
```
"@tcg/schemas": "workspace:*"
"@tcg/db": "workspace:*"
"@tcg/agent": "workspace:*"
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| API framework | Fastify 5 | NestJS | NestJS is heavier (decorator-heavy DI, class-based), slower startup, more opinionated — unnecessary for a service API without large team conventions to enforce |
| API framework | Fastify 5 | Express | Express has no built-in TypeScript type inference from schemas; requires additional layers (express-zod-api, etc.); slower than Fastify |
| ORM | Prisma 7 | Drizzle ORM | Drizzle is valid for teams who want SQL-first; Prisma 7's type-check speed improvements and migration tooling win for a greenfield schema with iterative DB changes |
| ORM | Prisma 7 | TypeORM | TypeORM's decorator-based approach has poor ESM support and slower type inference; effectively in maintenance mode for new features |
| LLM abstraction | Vercel AI SDK | LangChain.js | LangChain adds significant complexity and bundle size for what is a deterministic JSON output pattern, not a complex multi-step agent; AI SDK's `generateObject` is purpose-built for this use case |
| LLM abstraction | Vercel AI SDK | Direct OpenAI/Anthropic SDKs | Direct SDKs require duplicate provider-switching logic; retry/fallback per provider; AI SDK handles this uniformly |
| Validation | Zod 4 | TypeBox | TypeBox is excellent for Fastify (official support) but lacks the ecosystem fit — Zod v4 now has built-in JSON Schema conversion and native AI SDK integration; using TypeBox for routes and Zod for agent outputs creates a dual-schema problem |
| Monorepo orchestration | Turborepo | Nx | Nx is better for large enterprise monorepos (50+ packages) with complex code generation needs; overkill for a 4-package service monorepo |
| Testing | Vitest | Jest | Jest has poor native ESM support; Vitest is 2-5x faster; shares Vite config; ESM-first by default |
| TypeScript runner | tsx | ts-node | ts-node has ESM module compatibility issues on Node 20+; tsx is the community-standard replacement |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Prisma 6.x | Rust-based engine has 90% larger bundle; slower queries; ESM support is incomplete; v7 is stable and GA since Jan 2026 | Prisma 7.x |
| Zod 3.x | 14x slower parsing; no built-in JSON Schema export (requires `zod-to-json-schema` dep); 100x more TS compiler instantiations (kills monorepo type-check performance) | Zod 4.x |
| ts-node | Broken ESM support on Node 20+; community moved to tsx | tsx |
| `typeorm` | Decorator-based patterns conflict with ESM-first TS; poor type inference; maintenance-mode for new features | Prisma 7 |
| `jsonwebtoken` (CommonJS) | CJS-only, breaks ESM; use `jose` for JWT | `jose` |
| `express` | No schema-driven type inference; requires manual zod-express glue; slower than Fastify | Fastify 5 |
| `dotenv` auto-loading via Prisma | Prisma 7 removed automatic `.env` loading; relying on implicit loading will fail | Explicit `dotenv` import in `prisma.config.ts` |
| `zod-to-json-schema` | Now unnecessary — Zod 4 includes `z.toJSONSchema()` natively | `z.toJSONSchema()` |
| NestJS | Adds class decorators, reflection metadata, DI container overhead — none of which benefit a focused agent service API | Fastify 5 |

---

## Stack Patterns by Variant

**LLM output validation (deterministic JSON agent outputs):**
- Use `generateObject()` from Vercel AI SDK with a Zod schema from `@tcg/schemas`
- The AI SDK converts the Zod schema to JSON Schema for the provider, validates the response, and types the result — no `zodResponseFormat` wrapper needed
- On validation failure, AI SDK retries by default; configure `maxRetries: 3` at the model level
- For Anthropic: add `anthropic-beta: structured-outputs-2025-11-13` header for guaranteed schema compliance

**Fastify route with type-safe request/response:**
```typescript
// apps/api — register once at server init
import { ZodTypeProvider } from 'fastify-type-provider-zod'
const server = fastify().withTypeProvider<ZodTypeProvider>()

// Per route — body and response are fully typed from Zod schemas
server.post('/analysis', {
  schema: {
    body: CardAnalysisRequestSchema,   // from @tcg/schemas
    response: { 200: CardAnalysisSchema }
  }
}, async (req, reply) => {
  // req.body is fully typed — no casting
})
```

**Prisma 7 config (required — no longer implicit):**
```typescript
// prisma.config.ts (at packages/db root)
import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

export default defineConfig({
  datasource: {
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  },
})
```

**Monorepo dependency graph (Turborepo pipeline):**
```
schemas → db → agent → api
```
`api` depends on `agent`, `db`, and `schemas`. Build must follow this order. Define in `turbo.json` with `dependsOn: ["^build"]`.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Prisma 7.x | TypeScript ≥ 5.1, Node ≥ 18 | Requires `@prisma/adapter-pg` + `pg` v8; ships as ESM |
| Zod 4.x | TypeScript ≥ 5.0 | Breaking changes from v3 in error API and transform patterns; migration guide at zod.dev/v4 |
| Fastify 5.x | Node.js ≥ 20 | Drops support for Node 18; all deprecated v4 APIs removed |
| `fastify-type-provider-zod` | Zod 3 or 4 | Verify latest release supports Zod 4 before locking versions |
| Vercel AI SDK 6.x | openai ≥ 4.x, @anthropic-ai/sdk ≥ 0.70.x | AI SDK manages provider SDK versions; let it control peer deps |
| pnpm 10.x | Node ≥ 18 | v10 disables lifecycle scripts by default; add `pnpm.onlyBuiltDependencies` for packages requiring postinstall |
| Turborepo 2.x | pnpm workspaces | Auto-detects pnpm workspace config; no additional setup |

---

## Critical Setup Notes

1. **Prisma 7 migration from v6:** The `datasource.url` in `schema.prisma` is removed. All DB connection config moves to `prisma.config.ts`. Failing to do this is the #1 migration gotcha (see GitHub issue #28573).

2. **pnpm lifecycle scripts:** pnpm 10 disables postinstall scripts by default. Prisma generates the client in postinstall. Add `"onlyBuiltDependencies": ["@prisma/client"]` to root `package.json` pnpm config or run `prisma generate` explicitly in the monorepo build pipeline.

3. **ESM throughout:** Prisma 7 ships as ESM. Fastify 5 is ESM-compatible. Zod 4 is ESM-first. Set `"type": "module"` in all `package.json` files and use `.js` extensions in imports (TypeScript with `moduleResolution: "bundler"` or `"node16"`).

4. **Zod 4 breaking changes:** If migrating from Zod 3, error customization API changed — `message`, `invalid_type_error`, and `errorMap` unified under single `error` parameter. Run the Zod 4 migration tool.

5. **AI SDK provider keys:** The AI SDK reads `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` from environment by default. No manual key passing needed if using the default `openai()` or `anthropic()` provider constructors.

---

## Sources

- [Fastify npm (v5.7.4 confirmed)](https://www.npmjs.com/package/fastify) — version verified
- [Fastify v5 official announcement](https://openjsf.org/blog/fastifys-growth-and-success) — Node 20+ requirement confirmed
- [Fastify Type Providers docs](https://fastify.dev/docs/latest/Reference/Type-Providers/) — Zod provider support confirmed
- [Prisma 7 announcement blog](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) — Rust-free, bundle size, performance numbers
- [Prisma 7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) — breaking changes, adapter requirement
- [Zod v4 release notes](https://zod.dev/v4) — performance benchmarks, breaking changes, stable status confirmed
- [Vercel AI SDK npm (v6.0.108 confirmed)](https://www.npmjs.com/package/ai) — version verified
- [Vercel AI SDK generateObject docs](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) — Zod schema integration confirmed
- [Anthropic structured outputs announcement (Nov 2025)](https://tessl.io/blog/anthropic-brings-structured-outputs-to-claude-developer-platform-making-api-responses-more-reliable/) — beta header requirement
- [OpenAI structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs/) — zodResponseFormat helper confirmed
- [openai npm (v6.25.0 confirmed)](https://www.npmjs.com/package/openai) — version verified
- [@anthropic-ai/sdk npm (v0.78.0 confirmed)](https://www.npmjs.com/package/@anthropic-ai/sdk) — version verified
- [pnpm 10 release](https://pnpm.io/blog/2025/12/29/pnpm-in-2025) — v10.30.3 current; lifecycle script changes
- [Turborepo vs Nx comparison](https://dev.to/saswatapal/why-i-chose-turborepo-over-nx-monorepo-performance-without-the-complexity-1afp) — MEDIUM confidence (community source, aligns with other findings)
- [Node.js 22 LTS recommendation](https://endoflife.date/nodejs) — active LTS until April 2027
- [TypeScript 5.8 release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/) — current stable

---
*Stack research for: TypeScript monorepo — collectible card portfolio agent (Gacha platform)*
*Researched: 2026-03-04*
