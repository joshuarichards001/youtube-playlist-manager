import { create } from "zustand";
import { devtools } from "zustand/middleware";

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

const useStore = create<State>(
  // @ts-expect-error-next-line
  devtools((set) => ({
    playlists: [],
    setPlaylists: (playlists) => set({ playlists }),

    subscriptions: [],
    setSubscriptions: (subscriptions) => set({ subscriptions }),

    currentView: { type: 'feed' },
    setCurrentView: (currentView) => set({ currentView, videos: [], nextPageToken: null }),

    videos: [],
    setVideos: (videos) => set({ videos }),

    accessToken: null,
    setAccessToken: (accessToken) => set({ accessToken }),

    authLoading: true,
    setAuthLoading: (authLoading) => set({ authLoading }),

    nextPageToken: null,
    setNextPageToken: (nextPageToken) => set({ nextPageToken }),

    sort: "dateAdded",
    setSort: (sort) => set({ sort }),

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
