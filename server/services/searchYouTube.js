import YouTube from 'youtube-sr'

const yt = YouTube.default ?? YouTube

export async function searchYouTube(query, limit = 8) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return []
  }

  try {
    const results = await yt.search(query.trim(), { limit, type: 'video' })

    return results.map((video) => ({
      id: video.id,
      title: video.title ?? 'Untitled',
      url: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnail: video.thumbnail?.url ?? null,
      durationFormatted: video.durationFormatted ?? '',
      provider: 'youtube',
    }))
  } catch (error) {
    console.error('YouTube search failed:', error.message)
    return []
  }
}
