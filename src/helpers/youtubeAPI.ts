import axios from "axios";
import { convertDurationToSeconds } from "./functions";

const fetchVideoDetailsAPI = async (
  accessToken: string,
  videoIds: string[]
): Promise<Video[]> => {
  if (videoIds.length === 0) return [];

  const videoDetails = await axios.get(
    "https://www.googleapis.com/youtube/v3/videos",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        part: "contentDetails,snippet,statistics",
        id: videoIds.join(","),
      },
    }
  );

  return videoDetails.data.items.map((video: YouTubeVideo) => ({
    id: video.id,
    title: video.snippet.title,
    channel: video.snippet.videoOwnerChannelTitle,
    thumbnail: video.snippet.thumbnails.default?.url,
    resourceId: video.id,
    durationSeconds: convertDurationToSeconds(video.contentDetails.duration),
    releaseDate: video.snippet.publishedAt,
    viewCount: Number(video.statistics.viewCount),
    selected: false,
  }));
};

export const fetchUserAPI = async (
  accessToken: string
): Promise<User | null> => {
  try {
    const result = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return {
      name: result.data.given_name,
      picture: result.data.picture,
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
};

export const fetchPlaylistsAPI = async (
  accessToken: string
): Promise<Playlist[]> => {
  try {
    const result = await axios.get(
      "https://www.googleapis.com/youtube/v3/playlists",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          part: "snippet,contentDetails",
          mine: true,
          maxResults: 1000,
        },
      }
    );
    return result.data.items.map((playlist: YouTubePlaylist) => ({
      id: playlist.id,
      title: playlist.snippet.title,
      videoCount: playlist.contentDetails.itemCount,
    }));
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return [];
  }
};

export const fetchVideosAPI = async (
  accessToken: string,
  playlist: Playlist,
  pageToken: string | null
): Promise<{ videos: Video[]; nextPageToken: string }> => {
  try {
    const result = await axios.get(
      "https://www.googleapis.com/youtube/v3/playlistItems",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          part: "snippet",
          playlistId: playlist.id,
          maxResults: 50,
          pageToken,
        },
      }
    );

    const videoIds = result.data.items
      .filter((video: YouTubeVideo) => video.snippet.title !== "Private video")
      .filter((video: YouTubeVideo) => video.snippet.title !== "Deleted video")
      .map((video: YouTubeVideo) => video.snippet.resourceId.videoId);

    const videos = await fetchVideoDetailsAPI(accessToken, videoIds);

    return { videos, nextPageToken: result.data.nextPageToken };
  } catch (error) {
    console.error("Error fetching videos:", error);
    return { videos: [], nextPageToken: "" };
  }
};

export const addVideosToPlaylistAPI = async (
  accessToken: string,
  videoIds: string[],
  playlistId: string
) => {
  try {
    for (const videoId of videoIds) {
      await axios.post(
        "https://www.googleapis.com/youtube/v3/playlistItems",
        {
          snippet: {
            playlistId,
            resourceId: {
              kind: "youtube#video",
              videoId: videoId,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          params: {
            part: "snippet",
          },
        }
      );
    }
  } catch (error) {
    console.error("Error adding videos to playlist:", error);
  }
};

export const deleteVideosFromPlaylistAPI = async (
  accessToken: string,
  videoItemIds: string[]
) => {
  try {
    for (const videoItemId of videoItemIds) {
      await axios.delete(
        "https://www.googleapis.com/youtube/v3/playlistItems",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            id: videoItemId,
          },
        }
      );
    }
  } catch (error) {
    console.error("Error deleting videos from playlist:", error);
  }
};

export const deletePlaylistAPI = async (
  accessToken: string,
  playlistId: string
) => {
  try {
    await axios.delete("https://www.googleapis.com/youtube/v3/playlists", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        id: playlistId,
      },
    });
    console.log(`Playlist with ID ${playlistId} deleted successfully.`);
  } catch (error) {
    console.error("Error deleting playlist:", error);
  }
};

export const fetchChannelVideosAPI = async (
  accessToken: string,
  channelId: string,
  pageToken: string | null
): Promise<{ videos: Video[]; nextPageToken: string }> => {
  try {
    const searchResult = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          part: "snippet",
          channelId,
          order: "date",
          type: "video",
          maxResults: 50,
          pageToken,
        },
      }
    );

    const videoIds = searchResult.data.items
      .map((item: { id: { videoId: string } }) => item.id.videoId);

    if (videoIds.length === 0) {
      return { videos: [], nextPageToken: "" };
    }

    const videos = await fetchVideoDetailsAPI(accessToken, videoIds);

    return { videos, nextPageToken: searchResult.data.nextPageToken || "" };
  } catch (error) {
    console.error("Error fetching channel videos:", error);
    return { videos: [], nextPageToken: "" };
  }
};

export const fetchSubscriptionsAPI = async (
  accessToken: string
): Promise<Subscription[]> => {
  try {
    const subscriptions: Subscription[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const result: { data: { items: YouTubeSubscription[]; nextPageToken?: string } } = await axios.get(
        "https://www.googleapis.com/youtube/v3/subscriptions",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            part: "snippet",
            mine: true,
            maxResults: 50,
            pageToken,
          },
        }
      );

      const items = result.data.items.map((sub: YouTubeSubscription) => ({
        id: sub.id,
        title: sub.snippet.title,
        thumbnail: sub.snippet.thumbnails.default?.url,
        channelId: sub.snippet.resourceId.channelId,
      }));

      subscriptions.push(...items);
      pageToken = result.data.nextPageToken;
    } while (pageToken);

    return subscriptions;
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return [];
  }
};

export const createPlaylistAPI = async (
  accessToken: string,
  playlistName: string
) => {
  try {
    const result = await axios.post(
      "https://www.googleapis.com/youtube/v3/playlists",
      {
        snippet: {
          title: playlistName,
          description: "A new playlist created via API",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        params: {
          part: "snippet",
        },
      }
    );
    console.log(`Playlist with name ${playlistName} created successfully.`);
    return result.data;
  } catch (error) {
    console.error("Error creating playlist:", error);
    return null;
  }
};

type RSSFeedItem = {
  title: string;
  link: string;
  author: string;
  pubDate: string;
  enclosure?: { link: string };
};

type RSSFeedResponse = {
  status: string;
  items: RSSFeedItem[];
};

const extractVideoIdFromLink = (link: string): string => {
  const match = link.match(/[?&]v=([^&]+)/);
  return match ? match[1] : "";
};

export const unsubscribeAPI = async (
  accessToken: string,
  subscriptionId: string
): Promise<boolean> => {
  try {
    await axios.delete("https://www.googleapis.com/youtube/v3/subscriptions", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        id: subscriptionId,
      },
    });
    return true;
  } catch (error) {
    console.error("Error unsubscribing:", error);
    return false;
  }
};

export const fetchSubscriptionsFeedAPI = async (
  accessToken: string,
  subscriptions: Subscription[]
): Promise<Video[]> => {
  try {
    const feedPromises = subscriptions.map(async (subscription) => {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${subscription.channelId}`;
      const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

      try {
        const response = await axios.get<RSSFeedResponse>(proxyUrl);

        if (response.data.status !== "ok") {
          console.warn(`Failed to fetch feed for ${subscription.title}`);
          return [];
        }

        return response.data.items.map((item) => ({
          videoId: extractVideoIdFromLink(item.link),
          pubDate: item.pubDate,
        }));
      } catch (error) {
        console.warn(`Error fetching feed for ${subscription.title}:`, error);
        return [];
      }
    });

    const allFeeds = await Promise.all(feedPromises);
    const allVideoRefs = allFeeds.flat();

    // Sort by published date (newest first) and take top 50
    const sortedVideoRefs = allVideoRefs
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 50);

    const videoIds = sortedVideoRefs.map((ref) => ref.videoId);
    const videos = await fetchVideoDetailsAPI(accessToken, videoIds);

    return videos;
  } catch (error) {
    console.error("Error fetching subscriptions feed:", error);
    return [];
  }
};
