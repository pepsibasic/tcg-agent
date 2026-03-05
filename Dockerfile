FROM node:22-slim AS base
RUN npm i -g corepack@latest && corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/schemas/package.json packages/schemas/
COPY packages/db/package.json packages/db/
COPY packages/agent/package.json packages/agent/
COPY apps/agent-web/package.json apps/agent-web/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM base AS runtime
COPY --from=build /app /app
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @tcg/db exec prisma migrate deploy && node apps/api/dist/server.js"]
