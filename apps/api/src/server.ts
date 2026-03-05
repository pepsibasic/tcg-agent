import Fastify from 'fastify'
import cors from '@fastify/cors'
import { agentRoutes } from './routes/agent.js'
import { externalCardRoutes } from './routes/external-cards.js'
import { vaultRoutes } from './routes/vault.js'
import { actionsRoutes } from './routes/actions.js'
import { pricingRoutes } from './routes/pricing.js'

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

const port = Number(process.env.PORT) || 3000

server.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }
})
