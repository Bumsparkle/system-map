import { buildApp } from './app.js'
import { env } from './env.js'

// Long-running server entrypoint (local dev + Render). On Vercel the app is
// served by api/[...path].ts instead, which never calls listen().
const app = await buildApp()

try {
  const address = await app.listen({ port: env.PORT ?? env.API_PORT, host: '0.0.0.0' })
  app.log.info(`System Map API listening on ${address}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
