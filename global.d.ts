type Playlist = {
  id: string;
  title: string;
  videoCount: number;
};

type YouTubePlaylist = {
  id: string;
  snippet: { title: string };
  contentDetails: { itemCount: number };
};

type Video = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  resourceId: string;
  duration: string;
};

type YouTubeVideo = {
  id: string;
  snippet: {
    title: string;
    videoOwnerChannelTitle: string;
    thumbnails: { default: { url: string } };
    resourceId: { videoId: string };
  };
};
