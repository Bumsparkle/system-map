import { mkdir } from 'node:fs/promises'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyError } from 'fastify'
import { ZodError } from 'zod'
import { env } from './env'
import { HttpError } from './lib/errors'
import { UPLOADS_ROOT } from './lib/paths'
import corsPlugin from './plugins/cors'
import { companyRoutes } from './routes/companies'
import { diagramRoutes } from './routes/diagrams'
import { saveRoutes } from './routes/save'
import { vendorRoutes } from './routes/vendors'

const app = Fastify({
  logger:
    env.NODE_ENV === 'production'
      ? true
      : {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        },
})

await app.register(corsPlugin)

// Serve mirrored vendor logos (spec v1.2 §2.4). Ensure the dir exists so a fresh
// checkout doesn't fail registration before any logo has been written.
await mkdir(UPLOADS_ROOT, { recursive: true })
await app.register(fastifyStatic, { root: UPLOADS_ROOT, prefix: '/uploads/' })

app.setErrorHandler((err: FastifyError, req, reply) => {
  if (err instanceof ZodError) {
    reply.code(400).send({ error: 'ValidationError', issues: err.issues })
    return
  }
  if (err instanceof HttpError) {
    reply.code(err.statusCode).send({ error: err.message })
    return
  }
  req.log.error(err)
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500
  reply.code(status).send({ error: status === 500 ? 'Internal Server Error' : err.message })
})

app.get('/health', async () => ({ status: 'ok' }))

await app.register(companyRoutes, { prefix: '/api' })
await app.register(diagramRoutes, { prefix: '/api' })
await app.register(saveRoutes, { prefix: '/api' })
await app.register(vendorRoutes, { prefix: '/api' })

try {
  const address = await app.listen({ port: env.API_PORT, host: '0.0.0.0' })
  app.log.info(`System Map API listening on ${address}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
