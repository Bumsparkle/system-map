import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

const here = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(here, '../../.env') })

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  casing: 'snake_case',
})
