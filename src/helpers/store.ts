import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface State {
  playlists: Playlist[];
  setPlaylists: (playlists: Playlist[]) => void;

  selectedPlaylist: Playlist | null;
  setSelectedPlaylist: (selectedPlaylist: Playlist | null) => void;

  videos: Video[];
  setVideos: (videos: Video[]) => void;

  accessToken: string | null;
  setAccessToken: (accessToken: string | null) => void;

  nextPageToken: string;
  setNextPageToken: (nextPageToken: string) => void;

  sort: SortValues;
  setSort: (sort: SortValues) => void;

  user: User;
  setUser: (user: User) => void;
}

const useStore = create<State>(
  // @ts-expect-error-next-line
  devtools((set) => ({
    playlists: [],
    setPlaylists: (playlists) => set({ playlists }),

    selectedPlaylist: null,
    setSelectedPlaylist: (selectedPlaylist) => set({ selectedPlaylist }),

    videos: [],
    setVideos: (videos) => set({ videos }),

    accessToken: null,
    setAccessToken: (accessToken) => set({ accessToken }),

    nextPageToken: null,
    setNextPageToken: (nextPageToken) => set({ nextPageToken }),

    sort: "title",
    setSort: (sort) => set({ sort }),

    user: null,
    setUser: (user) => set({ user }),
  }))
);

export default useStore;
