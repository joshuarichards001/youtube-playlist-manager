type Playlist = {
  id: string
  snippet: {
    title: string
  }
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
    }
  }
}