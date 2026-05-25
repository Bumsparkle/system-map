import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

// Load the monorepo-root .env regardless of cwd.
const here = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(here, '../../../.env') })

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export const env = envSchema.parse(process.env)
