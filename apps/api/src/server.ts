import Fastify from 'fastify'
import { startScheduler } from './scheduler.js'
import cors from '@fastify/cors'
import { agentRoutes } from './routes/agent.js'
import { externalCardRoutes } from './routes/external-cards.js'
import { vaultRoutes } from './routes/vault.js'
import { actionsRoutes } from './routes/actions.js'
import { pricingRoutes } from './routes/pricing.js'
import { alertsRoutes } from './routes/alerts.js'
import { marketRoutes } from './routes/market.js'
import { watchlistRoutes } from './routes/watchlist.js'
import { notificationsRoutes } from './routes/notifications.js'
import { searchRoutes } from './routes/search.js'

const server = Fastify({
  logger: true,
  genReqId: (req) => (req.headers['x-request-id'] as string) || crypto.randomUUID(),
})

await server.register(cors, { origin: true })

server.addHook('onSend', async (request, reply) => {
  reply.header('X-Request-Id', request.id)
})

server.get('/health', async () => {
  return { status: 'ok' }
})

server.register(agentRoutes)
server.register(externalCardRoutes)
server.register(vaultRoutes)
server.register(actionsRoutes)
server.register(pricingRoutes)
server.register(alertsRoutes)
server.register(marketRoutes)
server.register(watchlistRoutes)
server.register(notificationsRoutes)
server.register(searchRoutes)

const port = Number(process.env.PORT) || 3000

server.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }
  startScheduler(server.log)
})
