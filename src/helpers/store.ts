import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { sortVideos } from "./functions";

interface State {
  playlists: Playlist[];
  setPlaylists: (playlists: Playlist[]) => void;

  subscriptions: Subscription[];
  setSubscriptions: (subscriptions: Subscription[]) => void;

  currentView: CurrentView;
  setCurrentView: (view: CurrentView) => void;

  videos: Video[];
  setVideos: (videos: Video[]) => void;

  accessToken: string | null;
  setAccessToken: (accessToken: string | null) => void;

  authLoading: boolean;
  setAuthLoading: (authLoading: boolean) => void;

  nextPageToken: string | null;
  setNextPageToken: (nextPageToken: string | null) => void;

  sort: SortValues;
  setSort: (sort: SortValues) => void;

  user: User;
  setUser: (user: User) => void;

  viewingVideo: Video | null;
  setViewingVideo: (viewingVideo: Video | null) => void;

  videoViewerPip: boolean;
  setVideoViewerPip: (videoViewerPip: boolean) => void;

  gridView: boolean;
  setGridView: (gridView: boolean) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;

  // Desktop (md+) only: hides the sidebar entirely. Persisted per device.
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (sidebarCollapsed: boolean) => void;
}

const SIDEBAR_COLLAPSED_KEY = "yt-sidebar-collapsed";

const readSidebarCollapsed = () => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

// Last-used sort per playlist id, persisted per device.
const PLAYLIST_SORT_KEY = "yt-playlist-sort";
const DEFAULT_PLAYLIST_SORT: SortValues = "dateAdded";

const readPlaylistSorts = (): Record<string, SortValues> => {
  try {
    return JSON.parse(localStorage.getItem(PLAYLIST_SORT_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
};

const savePlaylistSort = (playlistId: string, sort: SortValues) => {
  try {
    const sorts = readPlaylistSorts();
    sorts[playlistId] = sort;
    localStorage.setItem(PLAYLIST_SORT_KEY, JSON.stringify(sorts));
  } catch {
    // storage unavailable; keep in-memory state only
  }
};

const useStore = create<State>(
  // @ts-expect-error-next-line
  devtools((set, get) => ({
    playlists: [],
    setPlaylists: (playlists) => set({ playlists }),

    subscriptions: [],
    setSubscriptions: (subscriptions) => set({ subscriptions }),

    currentView: { type: 'feed' },
    setCurrentView: (currentView) =>
      set({
        currentView,
        videos: [],
        nextPageToken: null,
        ...(currentView.type === "playlist" && {
          sort: readPlaylistSorts()[currentView.playlist.id] ?? DEFAULT_PLAYLIST_SORT,
        }),
      }),

    videos: [],
    setVideos: (videos) => set({ videos }),

    accessToken: null,
    setAccessToken: (accessToken) => set({ accessToken }),

    authLoading: true,
    setAuthLoading: (authLoading) => set({ authLoading }),

    nextPageToken: null,
    setNextPageToken: (nextPageToken) => set({ nextPageToken }),

    sort: "dateAdded",
    setSort: (sort) => {
      const { currentView, videos } = get();
      if (currentView.type === "playlist") savePlaylistSort(currentView.playlist.id, sort);
      set({ sort, videos: sortVideos(videos, sort) });
    },

    user: null,
    setUser: (user) => set({ user }),

    viewingVideo: null,
    setViewingVideo: (viewingVideo) => set({ viewingVideo }),

    videoViewerPip: false,
    setVideoViewerPip: (videoViewerPip) => set({ videoViewerPip }),

    gridView: true,
    setGridView: (gridView) => set({ gridView }),

    sidebarOpen: false,
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

    sidebarCollapsed: readSidebarCollapsed(),
    setSidebarCollapsed: (sidebarCollapsed) => {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
      } catch {
        // storage unavailable; keep in-memory state only
      }
      set({ sidebarCollapsed });
    },
  }))
);

export default useStore;
