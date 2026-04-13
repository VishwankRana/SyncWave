import { inferProviderFromUrl } from './providerAdapters.js'

function fallbackTitleFromUrl(url) {
  try {
    const parsed = new URL(url)
    const candidate =
      parsed.searchParams.get('v') ??
      parsed.pathname
        .split('/')
        .filter(Boolean)
        .pop() ??
      parsed.hostname

    return decodeURIComponent(candidate)
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return 'Untitled track'
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function extractTrackMetadata(url) {
  const provider = inferProviderFromUrl(url)

  if (!provider) {
    return null
  }

  const oembedUrl =
    provider === 'youtube'
      ? `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      : `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`

  const metadata = await fetchJsonWithTimeout(oembedUrl)
  const title =
    typeof metadata?.title === 'string' && metadata.title.trim()
      ? metadata.title.trim()
      : fallbackTitleFromUrl(url)

  return {
    provider,
    title,
    url,
  }
}
