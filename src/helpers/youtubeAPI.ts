import axios from "axios";
import { convertDurationToSeconds } from "./functions";

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
      .map((video: YouTubeVideo) => video.snippet.resourceId.videoId)
      .join(",");

    const videoDetails = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          part: "contentDetails,snippet,statistics",
          id: videoIds,
        },
      }
    );

    const videoDetailsMap = new Map(
      videoDetails.data.items.map((video: YouTubeVideo) => [
        video.id,
        {
          duration: convertDurationToSeconds(video.contentDetails.duration),
          releaseDate: video.snippet.publishedAt,
          viewCount: Number(video.statistics.viewCount),
        },
      ])
    );

    const videos = result.data.items
      .filter((video: YouTubeVideo) => video.snippet.title !== "Private video")
      .filter((video: YouTubeVideo) => video.snippet.title !== "Deleted video")
      .map((video: YouTubeVideo) => {
        const details = videoDetailsMap.get(
          video.snippet.resourceId.videoId
        ) as YouTubeVideoDetails;

        return {
          id: video.id,
          title: video.snippet.title,
          channel: video.snippet.videoOwnerChannelTitle,
          thumbnail: video.snippet.thumbnails.default?.url,
          resourceId: video.snippet.resourceId.videoId,
          durationSeconds: details.duration,
          releaseDate: details.releaseDate,
          viewCount: details.viewCount,
          selected: false,
        };
      })
      .filter((video: Video | null): video is Video => video !== null);

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
