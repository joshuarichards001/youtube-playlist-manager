import { create } from 'zustand'

interface State {
  playlists: Playlist[];
  setPlaylists: (playlists: Playlist[]) => void;
  accessToken: string | null;
  setAccessToken: (accessToken: string | null) => void;
}

const useStore = create<State>((set) => ({
  playlists: [],
  setPlaylists: (playlists) => set({ playlists }),
  
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
}))

export default useStore;
