import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface State {
  playlists: Playlist[];
  setPlaylists: (playlists: Playlist[]) => void;

  selectedPlaylist: Playlist | null;
  setSelectedPlaylist: (selectedPlaylist: Playlist | null) => void;

  subscriptions: Subscription[];
  setSubscriptions: (subscriptions: Subscription[]) => void;

  selectedSubscription: Subscription | null;
  setSelectedSubscription: (selectedSubscription: Subscription | null) => void;

  videos: Video[];
  setVideos: (videos: Video[]) => void;

  accessToken: string | null;
  setAccessToken: (accessToken: string | null) => void;

  nextPageToken: string | null;
  setNextPageToken: (nextPageToken: string | null) => void;

  sort: SortValues;
  setSort: (sort: SortValues) => void;

  user: User;
  setUser: (user: User) => void;

  viewingVideo: Video | null;
  setViewingVideo: (viewingVideo: Video | null) => void;

  showSubscriptionFeed: boolean;
  setShowSubscriptionFeed: (showSubscriptionFeed: boolean) => void;
}

const useStore = create<State>(
  // @ts-expect-error-next-line
  devtools((set) => ({
    playlists: [],
    setPlaylists: (playlists) => set({ playlists }),

    selectedPlaylist: null,
    setSelectedPlaylist: (selectedPlaylist) => set({ selectedPlaylist }),

    subscriptions: [],
    setSubscriptions: (subscriptions) => set({ subscriptions }),

    selectedSubscription: null,
    setSelectedSubscription: (selectedSubscription) => set({ selectedSubscription }),

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

    viewingVideo: null,
    setViewingVideo: (viewingVideo) => set({ viewingVideo }),

    showSubscriptionFeed: false,
    setShowSubscriptionFeed: (showSubscriptionFeed) => set({ showSubscriptionFeed }),
  }))
);

export default useStore;
