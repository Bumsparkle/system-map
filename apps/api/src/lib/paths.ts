import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Anchor uploads to the api package root regardless of process cwd, so the
// disk-write path (logoMirror) and the static-serve root (index.ts) agree.
const here = dirname(fileURLToPath(import.meta.url)) // apps/api/src/lib
export const UPLOADS_ROOT = resolve(here, '../../uploads') // apps/api/uploads
export const VENDOR_LOGOS_DIR = resolve(UPLOADS_ROOT, 'vendor-logos')
