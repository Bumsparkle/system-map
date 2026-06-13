import { mkdir } from 'node:fs/promises'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { env } from './env.js'
import { HttpError } from './lib/errors.js'
import { UPLOADS_ROOT } from './lib/paths.js'
import { type AuthUser, authHook } from './plugins/auth.js'
import corsPlugin from './plugins/cors.js'
import { companyRoutes } from './routes/companies.js'
import { diagramRoutes } from './routes/diagrams.js'
import { saveRoutes } from './routes/save.js'
import { vendorRoutes } from './routes/vendors.js'

/**
 * Build the configured Fastify instance WITHOUT listening. This is the shared
 * core used both by the long-running server (index.ts, for local/Render) and by
 * the Vercel serverless function (api/[...path].ts), which emits requests into
 * `app.server` instead of binding a port.
 */
export async function buildApp(): Promise<FastifyInstance> {
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

  // Serve mirrored vendor logos (spec v1.2 §2.4) only when we actually mirror to
  // disk. On serverless hosts (LOGO_DEV_DIRECT=1) logos are absolute logo.dev
  // URLs, the disk is ephemeral/read-only, and this route would never be hit —
  // so skip both the mkdir and the static registration.
  if (env.LOGO_DEV_DIRECT !== '1') {
    await mkdir(UPLOADS_ROOT, { recursive: true })
    await app.register(fastifyStatic, { root: UPLOADS_ROOT, prefix: '/uploads/' })
  }

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

  // Public: no auth (uptime checks).
  app.get('/health', async () => ({ status: 'ok' }))

  // Everything under /api is gated by authHook (encapsulated to this scope, so
  // /health stays public). The hook sets req.user; routes scope to it.
  await app.register(
    async (api) => {
      api.decorateRequest('user', null as unknown as AuthUser)
      api.addHook('onRequest', authHook)
      await api.register(companyRoutes)
      await api.register(diagramRoutes)
      await api.register(saveRoutes)
      await api.register(vendorRoutes)
    },
    { prefix: '/api' },
  )

  return app
}
