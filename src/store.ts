import { create } from 'zustand'

interface State {
  playlists: Playlist[];
  setPlaylists: (playlists: Playlist[]) => void;

  selectedPlaylist: Playlist | null;
  setSelectedPlaylist: (selectedPlaylist: Playlist | null) => void;

  videos: Video[];
  setVideos: (videos: Video[]) => void;

  accessToken: string | null;
  setAccessToken: (accessToken: string | null) => void;
}

const useStore = create<State>((set) => ({
  playlists: [],
  setPlaylists: (playlists) => set({ playlists }),

  selectedPlaylist: null,
  setSelectedPlaylist: (selectedPlaylist) => set({ selectedPlaylist }),

  videos: [],
  setVideos: (videos) => set({ videos }),
  
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
}))

export default useStore;
