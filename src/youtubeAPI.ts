import axios from "axios";

export const fetchPlaylistsAPI = async (accessToken: string) => {
  try {
    const result = await axios.get(
      "https://www.googleapis.com/youtube/v3/playlists",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          part: "snippet",
          mine: true,
          maxResults: 100,
        },
      }
    );
    return result.data.items;
  } catch (error) {
    console.error("Error fetching playlists:", error);
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

    return result.data.items;
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
