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
  channelId: string;
  thumbnail: string;
  resourceId: string;
  durationSeconds: number;
  viewCount: number;
  releaseDate: string;
  dateAdded: string;
  selected: boolean;
};

type YouTubeVideo = {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    thumbnails: {
      default: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
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

type SortValues = "title" | "duration" | "viewCount" | "releaseDate" | "dateAdded";

type VideoComment = {
  id: string;
  authorName: string;
  authorProfileImage: string;
  text: string;
  likeCount: number;
  publishedAt: string;
};

type CurrentView =
  | { type: 'playlist'; playlist: Playlist }
  | { type: 'channel'; subscription: Subscription }
  | { type: 'feed' }
  | { type: 'none' };

type FeedVideo = {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  thumbnail: string;
  releaseDate: string;
  viewCount: number;
};

type SubscriptionFeed = {
  generatedAt: string;
  videos: FeedVideo[];
};

type ChannelEntry = {
  id: string;
  title: string;
};

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
