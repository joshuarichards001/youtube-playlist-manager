type Playlist = {
  id: string
  title: string
  videoCount: number
}

type Video = {
  id: string
  snippet: {
    title: string
    videoOwnerChannelTitle: string
    thumbnails: {
      default: {
        url: string
      }
    },
    resourceId: {
      videoId: string
    }
  }
}