// Bundle the Fastify app into one self-contained ESM file for the Vercel
// serverless function (api/[...path].mjs imports the output). This sidesteps
// Vercel's file-by-file transpile, which can't resolve our extensionless
// relative imports or the @system-map/shared TypeScript source under
// node_modules at runtime.
//
// Strategy: inline OUR code (apps/api/src + @system-map/shared) and keep real
// npm packages external. The output lives under apps/api/dist so those external
// imports resolve from apps/api/node_modules at runtime — the same place Vercel
// (and pnpm) put them.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const here = dirname(fileURLToPath(import.meta.url)) // apps/api/scripts
const apiRoot = resolve(here, '..') // apps/api
const pkg = JSON.parse(readFileSync(resolve(apiRoot, 'package.json'), 'utf8'))

// Externalize every real dependency; inline only the workspace package (TS src).
const external = Object.keys(pkg.dependencies ?? {}).filter((d) => d !== '@system-map/shared')

await build({
  entryPoints: [resolve(apiRoot, 'src/app.ts')],
  outfile: resolve(apiRoot, 'dist/app.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external,
  logLevel: 'info',
})

console.log('Bundled apps/api/src/app.ts -> apps/api/dist/app.mjs')
