declare module "*.css";

type User = {
  name: string;
  picture: string;
};

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
  durationSeconds: number;
  viewCount: number;
  releaseDate: string;
  selected: boolean;
};

type YouTubeVideo = {
  id: string;
  snippet: {
    title: string;
    videoOwnerChannelTitle: string;
    thumbnails: { default: { url: string } };
    resourceId: { videoId: string };
    publishedAt: string;
  };
  contentDetails: { duration: string };
  statistics: { viewCount: string };
};

type YouTubeVideoDetails = {
  duration: number;
  releaseDate: string;
  viewCount: number;
};

type SortValues = "title" | "duration" | "viewCount" | "releaseDate";

type CurrentView =
  | { type: 'playlist'; playlist: Playlist }
  | { type: 'channel'; subscription: Subscription }
  | { type: 'subscriptionFeed' }
  | { type: 'none' };

type Subscription = {
  id: string;
  title: string;
  thumbnail: string;
  channelId: string;
};

type YouTubeSubscription = {
  id: string;
  snippet: {
    title: string;
    thumbnails: { default: { url: string } };
    resourceId: { channelId: string };
  };
};
