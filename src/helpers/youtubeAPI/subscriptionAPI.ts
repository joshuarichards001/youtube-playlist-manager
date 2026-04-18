import axios from "axios";

export const fetchSubscriptionsAPI = async (
  accessToken: string
): Promise<Subscription[]> => {
  try {
    const subscriptions: Subscription[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const result: { data: { items: YouTubeSubscription[]; nextPageToken?: string } } = await axios.get(
        "https://www.googleapis.com/youtube/v3/subscriptions",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            part: "snippet",
            mine: true,
            maxResults: 50,
            pageToken,
          },
        }
      );

      const items = result.data.items.map((sub: YouTubeSubscription) => ({
        id: sub.id,
        title: sub.snippet.title,
        thumbnail: sub.snippet.thumbnails.default?.url,
        channelId: sub.snippet.resourceId.channelId,
      }));

      subscriptions.push(...items);
      pageToken = result.data.nextPageToken;
    } while (pageToken);

    return subscriptions;
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return [];
  }
};

export const unsubscribeAPI = async (
  accessToken: string,
  subscriptionId: string
): Promise<boolean> => {
  try {
    await axios.delete("https://www.googleapis.com/youtube/v3/subscriptions", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        id: subscriptionId,
      },
    });
    return true;
  } catch (error) {
    console.error("Error unsubscribing:", error);
    return false;
  }
};
