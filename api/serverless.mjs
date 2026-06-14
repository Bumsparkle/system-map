// Vercel serverless entrypoint for the whole API. A vercel.json rewrite sends
// every /api/* request (any depth) here; Fastify routes on the original req.url,
// which Vercel preserves. Plain JS (.mjs) importing the pre-bundled app
// (apps/api/dist/app.mjs from apps/api/scripts/bundle.mjs) so there's no
// cross-package TypeScript for Vercel to resolve, and a static filename so its
// router doesn't mis-parse a [...catch-all] as a single segment.
import { buildApp } from '../apps/api/dist/app.mjs'

// Reuse the built, ready app across invocations on a warm instance.
let appPromise
function getApp() {
  appPromise ??= buildApp().then(async (app) => {
    await app.ready()
    return app
  })
  return appPromise
}

export default async function handler(req, res) {
  const app = await getApp()
  app.server.emit('request', req, res)
}
