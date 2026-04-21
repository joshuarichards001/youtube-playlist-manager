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

export const subscribeAPI = async (
  accessToken: string,
  channelId: string
): Promise<Subscription | null> => {
  try {
    const result = await axios.post(
      "https://www.googleapis.com/youtube/v3/subscriptions",
      {
        snippet: {
          resourceId: {
            kind: "youtube#channel",
            channelId,
          },
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

    const sub: YouTubeSubscription = result.data;
    return {
      id: sub.id,
      title: sub.snippet.title,
      thumbnail: sub.snippet.thumbnails.default?.url,
      channelId: sub.snippet.resourceId.channelId,
    };
  } catch (error) {
    console.error("Error subscribing:", error);
    return null;
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
