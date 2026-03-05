import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Allow prisma generate to succeed without DATABASE_URL (e.g. CI/CD build step)
const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder'

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
})
