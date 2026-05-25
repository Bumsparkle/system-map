import cors from '@fastify/cors'
import fp from 'fastify-plugin'

export default fp(async (app) => {
  // MVP: single-origin local dev, allow all. Tighten when auth/hosting lands.
  await app.register(cors, { origin: true })
})
