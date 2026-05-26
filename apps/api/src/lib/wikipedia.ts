const WIKI_TIMEOUT_MS = 2000

export type WikiSummary = {
  title: string | null
  description: string
  pageUrl: string | null
}

/**
 * Fetch a one-paragraph summary from Wikipedia's REST API (spec v1.2 §2.2).
 * Returns null on timeout, error, disambiguation page, or empty extract — the
 * caller treats null as "no description" and the node simply omits that line.
 */
export async function fetchWikipediaSummary(title: string): Promise<WikiSummary | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(WIKI_TIMEOUT_MS),
      headers: { 'User-Agent': 'SystemMap/1.0 (vendor-lookup demo)' },
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      type?: string
      title?: string
      extract?: string
      content_urls?: { desktop?: { page?: string } }
    }
    if (json.type === 'disambiguation') return null
    const description = json.extract?.trim()
    if (!description) return null
    return {
      title: json.title ?? null,
      description,
      pageUrl: json.content_urls?.desktop?.page ?? null,
    }
  } catch {
    return null
  }
}
