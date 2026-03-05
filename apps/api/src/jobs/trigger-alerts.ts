import { runTriggerAlerts } from '@tcg/agent'

const requestId = crypto.randomUUID()
console.log(`[trigger-alerts] Starting with request_id=${requestId}`)

const result = await runTriggerAlerts(requestId)
console.log('[trigger-alerts] Complete:', JSON.stringify(result, null, 2))

process.exit(0)
