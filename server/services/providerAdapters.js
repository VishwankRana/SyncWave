export const providerAdapters = {
  youtube: {
    validateUrl(url) {
      return /youtu\.?be/.test(url)
    },
  },
  soundcloud: {
    validateUrl(url) {
      return /soundcloud\.com/.test(url)
    },
  },
}

export function inferProviderFromUrl(url) {
  if (providerAdapters.youtube.validateUrl(url)) {
    return 'youtube'
  }

  if (providerAdapters.soundcloud.validateUrl(url)) {
    return 'soundcloud'
  }

  return null
}
