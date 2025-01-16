import axios from "axios";

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
          maxResults: 100,
        },
      }
    );
    return result.data.items.map((playlist: any) => ({
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
  playlist: Playlist
) => {
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
          maxResults: 100,
        },
      }
    );

    return result.data.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      channel: video.snippet.videoOwnerChannelTitle,
      thumbnail: video.snippet.thumbnails.default.url,
      resourceId: video.snippet.resourceId.videoId,
    }));
  } catch (error) {
    console.error("Error fetching videos:", error);
  }
};

export const addVideoToPlaylistAPI = async (
  accessToken: string,
  videoId: string,
  playlistId: string
) => {
  try {
    axios.post(
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
  } catch (error) {
    console.error("Error adding video to playlist:", error);
  }
};

export const deleteVideoFromPlaylistAPI = async (
  accessToken: string,
  videoItemId: string
) => {
  try {
    axios.delete("https://www.googleapis.com/youtube/v3/playlistItems", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        id: videoItemId,
      },
    });
  } catch (error) {
    console.error("Error deleting video from playlist:", error);
  }
};
