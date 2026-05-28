import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { nanoid } from 'nanoid'
import { env } from '../env'
import { VENDOR_LOGOS_DIR } from './paths'

const LOGO_TIMEOUT_MS = 2000

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
}

/**
 * Fetch a vendor logo from logo.dev (Clearbit's successor) and mirror it to
 * local disk, returning OUR served URL (spec v1.2 §2.4). Insulates the demo
 * from the upstream going down and is faster on second load.
 *
 * Returns null (→ node falls back to the type icon) when: no token configured,
 * timeout, non-2xx, or a non-image response. Never throws.
 */
export async function mirrorLogo(domain: string): Promise<string | null> {
  const token = env.LOGO_DEV_TOKEN
  if (!token) return null

  const src = `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(token)}&size=128&format=png`
  // On hosts without a persistent disk, skip the mirror and serve logo.dev directly.
  if (env.LOGO_DEV_DIRECT === '1') return src
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(LOGO_TIMEOUT_MS) })
    if (!res.ok) return null
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? ''
    if (!contentType.startsWith('image/')) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.byteLength === 0) return null

    const ext = EXT_BY_TYPE[contentType] ?? 'png'
    const filename = `${nanoid()}.${ext}`
    await mkdir(VENDOR_LOGOS_DIR, { recursive: true })
    await writeFile(join(VENDOR_LOGOS_DIR, filename), buffer)
    return `/uploads/vendor-logos/${filename}`
  } catch {
    return null
  }
}
