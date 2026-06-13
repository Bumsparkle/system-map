// Base URL the web app prepends to API paths.
//
// In production the web app and the Fastify serverless function share one Vercel
// origin, so API calls are relative ('' + '/api/…' → same-origin). In dev the
// API runs separately on :3001. Set VITE_API_URL to point at a different API
// origin (e.g. a standalone API domain); leave it unset for the same-origin and
// local defaults below.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:3001' : '')
