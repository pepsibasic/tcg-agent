# @tcg/agent-web

Next.js 15 frontend for the Gacha Portfolio Agent.

## Local Development

```bash
# From repo root
pnpm install

# Start the API backend (port 3000)
pnpm --filter @tcg/api dev

# Start the web frontend (port 3001)
pnpm dev:web
# or
pnpm --filter @tcg/agent-web dev
```

Open [http://localhost:3001](http://localhost:3001).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Backend API base URL |
| `NEXT_PUBLIC_PULL_BASE` | `https://pull.gacha.game` | Deep link base for marketplace |
| `NEXT_PUBLIC_DEFAULT_USER_ID` | `0190f0e0-0001-7000-8000-000000000001` | Seed user ID |

## Tests

```bash
pnpm --filter @tcg/agent-web test
```

## Railway Deploy

- **Build command:** `pnpm build`
- **Start command:** `pnpm start`
- **Root directory:** `apps/agent-web`

Set `NEXT_PUBLIC_API_URL` to your deployed API URL.
