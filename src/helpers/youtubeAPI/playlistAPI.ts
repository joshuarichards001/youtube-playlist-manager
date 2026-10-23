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
          maxResults: 1000,
        },
      }
    );
    return result.data.items.map(mapPlaylist);
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return [];
  }
};

// The Data API has no "playlists I saved" endpoint. The closest supported route
// is the channel sections that make up the user's own channel page: YouTube puts
// saved playlists in a multiplePlaylists section there, so the ids show up in
// contentDetails.playlists alongside the user's own. Anything already returned by
// fetchPlaylistsAPI is theirs, so what's left is what they saved.
export const fetchSavedPlaylistsAPI = async (
  accessToken: string,
  ownedPlaylistIds: string[]
): Promise<Playlist[]> => {
  try {
    const result = await axios.get(
      "https://www.googleapis.com/youtube/v3/channelSections",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          part: "contentDetails",
          mine: true,
        },
      }
    );

    const owned = new Set(ownedPlaylistIds);
    const savedIds = new Set<string>();
    for (const section of (result.data.items ?? []) as YouTubeChannelSection[]) {
      for (const id of section.contentDetails?.playlists ?? []) {
        if (!owned.has(id)) savedIds.add(id);
      }
    }

    if (savedIds.size === 0) return [];

    const playlists = await fetchPlaylistsByIdAPI(accessToken, [...savedIds]);
    return playlists.map((playlist) => ({ ...playlist, saved: true }));
  } catch (error) {
    console.error("Error fetching saved playlists:", error);
    return [];
  }
};

// playlists.list caps `id` at 50 per request, so page through in chunks.
export const fetchPlaylistsByIdAPI = async (
  accessToken: string,
  playlistIds: string[]
): Promise<Playlist[]> => {
  const chunks: string[][] = [];
  for (let i = 0; i < playlistIds.length; i += 50) {
    chunks.push(playlistIds.slice(i, i + 50));
  }

  try {
    const results = await Promise.all(
      chunks.map((chunk) =>
        axios.get("https://www.googleapis.com/youtube/v3/playlists", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            part: "snippet,contentDetails",
            id: chunk.join(","),
            maxResults: 50,
          },
        })
      )
    );

    return results.flatMap((result) =>
      (result.data.items ?? []).map(mapPlaylist)
    );
  } catch (error) {
    console.error("Error fetching playlists by id:", error);
    return [];
  }
};

const mapPlaylist = (playlist: YouTubePlaylist): Playlist => ({
  id: playlist.id,
  title: playlist.snippet.title,
  channelTitle: playlist.snippet.channelTitle,
  videoCount: playlist.contentDetails.itemCount,
});

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
