import { fetchVideosAPI } from "./youtubeAPI/videoAPI";

export const downloadBackup = async (
  accessToken: string,
  playlists: Playlist[],
  subscriptions: Subscription[]
) => {
  const playlistsBackup = await Promise.all(
    playlists.map(async (playlist) => {
      const videos: { name: string; link: string }[] = [];
      let pageToken: string | null = null;
      do {
        const result = await fetchVideosAPI(accessToken, playlist, pageToken);
        for (const video of result.videos) {
          videos.push({
            name: video.title,
            link: `https://www.youtube.com/watch?v=${video.resourceId}`,
          });
        }
        pageToken = result.nextPageToken || null;
      } while (pageToken);

      return {
        name: playlist.title,
        link: `https://www.youtube.com/playlist?list=${playlist.id}`,
        videos,
      };
    })
  );

  const backup = {
    subscriptions: subscriptions.map((sub) => ({
      name: sub.title,
      link: `https://www.youtube.com/channel/${sub.channelId}`,
    })),
    playlists: playlistsBackup,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "youtube-backup.json";
  a.click();
  URL.revokeObjectURL(url);
};
