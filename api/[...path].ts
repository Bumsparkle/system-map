// Vercel serverless entrypoint for the whole API. Vercel routes every /api/*
// request to this catch-all function; we hand the raw request to a cached,
// ready Fastify instance (the same app the local server runs). The Fastify
// routes are registered under /api, and Vercel preserves the full req.url, so
// no path rewriting is needed here.
//
// NB: this file lives at the repo root (Vercel's functions convention), where
// `fastify` is NOT resolvable in a pnpm workspace — so we import nothing from
// `fastify` directly and derive the app type from buildApp(). The relative
// import below resolves `fastify` & friends from apps/api/node_modules.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from '../apps/api/src/app'

type App = Awaited<ReturnType<typeof buildApp>>

// Reuse the built app across invocations on a warm instance (cold start builds
// it once). `ready()` resolves all plugin/route registration before the first
// request is emitted.
let appPromise: Promise<App> | null = null

function getApp(): Promise<App> {
  if (!appPromise) {
    appPromise = buildApp().then(async (app) => {
      await app.ready()
      return app
    })
  }
  return appPromise
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp()
  app.server.emit('request', req, res)
}
