import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'
import * as schema from './schema'

// Vercel (and most serverless hosts) set this. On serverless we talk to the
// Supabase transaction pooler, which requires prepared statements off and a
// tiny per-instance pool (many short-lived instances share the pooler).
const isServerless = process.env.VERCEL === '1'

const queryClient = postgres(env.DATABASE_URL, {
  // PgBouncer transaction mode can't reuse prepared statements; harmless on a
  // direct connection too, so we set it everywhere for one code path.
  prepare: false,
  max: isServerless ? 1 : 10,
})

export const db = drizzle(queryClient, { schema, casing: 'snake_case' })
export { schema, queryClient }
