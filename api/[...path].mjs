// Vercel serverless entrypoint for the whole API. Plain JS (.mjs) so Vercel
// never type-checks or file-by-file transpiles our cross-package TypeScript —
// it just imports the pre-bundled Fastify app (apps/api/dist/app.mjs, produced
// by apps/api/scripts/bundle.mjs during the build) and emits each request into
// it. Fastify routes are registered under /api and Vercel preserves the full
// req.url, so no path rewriting is needed here.
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
