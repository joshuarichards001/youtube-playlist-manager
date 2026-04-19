import axios from "axios";
import { convertDurationToSeconds } from "../functions";


export const fetchVideoCommentsAPI = async (
  accessToken: string,
  videoId: string
): Promise<VideoComment[]> => {
  try {
    const result = await axios.get(
      "https://www.googleapis.com/youtube/v3/commentThreads",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          part: "snippet",
          videoId,
          maxResults: 5,
          order: "relevance",
        },
      }
    );

    return result.data.items.map(
      (item: {
        id: string;
        snippet: {
          topLevelComment: {
            snippet: {
              authorDisplayName: string;
              authorProfileImageUrl: string;
              textDisplay: string;
              likeCount: number;
              publishedAt: string;
            };
          };
        };
      }) => ({
        id: item.id,
        authorName: item.snippet.topLevelComment.snippet.authorDisplayName,
        authorProfileImage:
          item.snippet.topLevelComment.snippet.authorProfileImageUrl,
        text: item.snippet.topLevelComment.snippet.textDisplay,
        likeCount: item.snippet.topLevelComment.snippet.likeCount,
        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
      })
    );
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
};

export const fetchVideoDetailsAPI = async (
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
    channel: video.snippet.channelTitle,
    channelId: video.snippet.channelId,
    thumbnail: video.snippet.thumbnails.high?.url,
    resourceId: video.id,
    durationSeconds: convertDurationToSeconds(video.contentDetails.duration),
    releaseDate: video.snippet.publishedAt,
    viewCount: Number(video.statistics.viewCount),
    selected: false,
  }));
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

    const validItems: YouTubeVideo[] = result.data.items
      .filter((video: YouTubeVideo) => video.snippet.title !== "Private video")
      .filter((video: YouTubeVideo) => video.snippet.title !== "Deleted video");

    const videoIdToItemId = new Map<string, string>();
    for (const item of validItems) {
      videoIdToItemId.set(item.snippet.resourceId.videoId, item.id);
    }

    const videoIds = validItems.map((video) => video.snippet.resourceId.videoId);
    const hydrated = await fetchVideoDetailsAPI(accessToken, videoIds);
    const videos = hydrated.map((video) => ({
      ...video,
      id: videoIdToItemId.get(video.resourceId) ?? video.id,
    }));

    return { videos, nextPageToken: result.data.nextPageToken };
  } catch (error) {
    console.error("Error fetching videos:", error);
    return { videos: [], nextPageToken: "" };
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
