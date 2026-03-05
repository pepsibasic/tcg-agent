import { runPriceSnapshot } from '@tcg/agent'

const requestId = crypto.randomUUID()

console.log(JSON.stringify({ level: 'info', request_id: requestId, job: 'snapshot-prices', event: 'job_start' }))

try {
  const result = await runPriceSnapshot(requestId)
  console.log(JSON.stringify({ level: 'info', ...result, event: 'job_complete' }))
  process.exit(0)
} catch (err) {
  console.error(JSON.stringify({
    level: 'error',
    request_id: requestId,
    job: 'snapshot-prices',
    event: 'job_failed',
    error: err instanceof Error ? err.message : String(err),
  }))
  process.exit(1)
}
