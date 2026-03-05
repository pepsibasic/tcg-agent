# Cron Job Scheduling

## Jobs

| Job | Command | Recommended Schedule |
|-----|---------|---------------------|
| Price Snapshots | `pnpm --filter @tcg/api job:snapshot-prices` | Daily at 02:00 UTC |
| Trigger Alerts | `pnpm --filter @tcg/api job:trigger-alerts` | Every hour |

## Option A: Railway Cron (Recommended for Production)

In Railway dashboard, create a **Cron Service** for each job:

### snapshot-prices
- **Schedule**: `0 2 * * *`
- **Command**: `pnpm --filter @tcg/api job:snapshot-prices`
- **Required env vars**: `DATABASE_URL`, `PRICECHARTING_API_KEY`

### trigger-alerts
- **Schedule**: `0 * * * *`
- **Command**: `pnpm --filter @tcg/api job:trigger-alerts`
- **Required env vars**: `DATABASE_URL`

Both jobs emit structured JSON logs with `request_id` for tracing.

## Option B: In-Process Scheduler (Dev / Fallback)

Set `ENABLE_SCHEDULER=true` on the API service. The Fastify server will start
node-cron jobs in-process using the same schedules above.

This is suitable for development or single-instance deploys. For multi-instance
deploys, use Railway Cron to avoid duplicate job execution.

## Logs

All jobs log structured JSON:
```json
{"request_id":"...","job_name":"snapshot-prices","event":"job_start"}
{"request_id":"...","job_name":"snapshot-prices","event":"job_complete","total_keys":42,"success_count":42,"fail_count":0,"duration_ms":12345}
```
