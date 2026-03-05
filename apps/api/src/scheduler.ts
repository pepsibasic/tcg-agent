// apps/api/src/scheduler.ts
import cron from 'node-cron'
import { runPriceSnapshot, runTriggerAlerts } from '@tcg/agent'

interface Logger {
  info: (obj: Record<string, unknown>, msg?: string) => void
  error: (obj: Record<string, unknown>, msg?: string) => void
}

export function startScheduler(logger: Logger): void {
  if (process.env.ENABLE_SCHEDULER !== 'true') {
    logger.info({ scheduler: 'disabled' }, 'ENABLE_SCHEDULER not set, skipping in-process scheduler')
    return
  }

  logger.info({ scheduler: 'starting' }, 'Starting in-process scheduler')

  // Daily at 02:00 UTC — snapshot prices
  cron.schedule('0 2 * * *', async () => {
    const requestId = crypto.randomUUID()
    logger.info({ request_id: requestId, job_name: 'snapshot-prices', event: 'job_start' })
    try {
      const result = await runPriceSnapshot(requestId)
      logger.info({ ...result, event: 'job_complete' })
    } catch (err) {
      logger.error({
        request_id: requestId,
        job_name: 'snapshot-prices',
        event: 'job_failed',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }, { timezone: 'UTC' })

  // Every hour — trigger alerts
  cron.schedule('0 * * * *', async () => {
    const requestId = crypto.randomUUID()
    logger.info({ request_id: requestId, job_name: 'trigger-alerts', event: 'job_start' })
    try {
      const result = await runTriggerAlerts(requestId)
      logger.info({ ...result, event: 'job_complete' })
    } catch (err) {
      logger.error({
        request_id: requestId,
        job_name: 'trigger-alerts',
        event: 'job_failed',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }, { timezone: 'UTC' })

  logger.info({ scheduler: 'started', jobs: ['snapshot-prices@02:00UTC', 'trigger-alerts@hourly'] }, 'Scheduler started')
}
