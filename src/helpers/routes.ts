// URL <-> CurrentView mapping. HomePage keeps the address bar in sync with
// `currentView` and restores the view on back/forward, so components only
// need to call setCurrentView.

export const pathForView = (view: CurrentView): string | null => {
  switch (view.type) {
    case "feed":
      return "/feed";
    case "recommended":
      return "/recommended";
    case "subscriptions":
      return "/subscriptions";
    case "search":
      return "/search";
    case "history":
      return "/history";
    case "playlist":
      return `/playlist/${view.playlist.id}`;
    case "channel":
      return `/channel/${view.subscription.channelId}`;
    case "none":
      return null;
  }
};

// Returns null for a playlist route whose playlist isn't loaded (yet).
export const viewForPath = (
  pathname: string,
  playlists: Playlist[],
  subscriptions: Subscription[],
): CurrentView | null => {
  const [routeType, routeId] = pathname.split("/").filter(Boolean);

  switch (routeType) {
    case undefined:
    case "feed":
      return { type: "feed" };
    case "recommended":
      return { type: "recommended" };
    case "subscriptions":
      return { type: "subscriptions" };
    case "search":
      return { type: "search" };
    case "history":
      return { type: "history" };
    case "playlist": {
      const playlist = playlists.find((p) => p.id === routeId);
      return playlist ? { type: "playlist", playlist } : null;
    }
    case "channel": {
      if (!routeId) return { type: "feed" };
      const subscription = subscriptions.find((s) => s.channelId === routeId) ?? {
        id: "",
        title: "",
        thumbnail: "",
        channelId: routeId,
      };
      return { type: "channel", subscription };
    }
    default:
      return { type: "feed" };
  }
};
