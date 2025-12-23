import axios from "axios";
import { fetchVideoDetailsAPI } from "./videoAPI";

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

// RSS Feed types and helpers
type RSSFeedItem = {
  title: string;
  link: string;
  author: string;
  pubDate: string;
  enclosure?: { link: string };
};

type RSSFeedResponse = {
  status: string;
  items: RSSFeedItem[];
};

const extractVideoIdFromLink = (link: string): string => {
  const match = link.match(/[?&]v=([^&]+)/);
  return match ? match[1] : "";
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Feed caching
const FEED_CACHE_KEY = 'subscriptionFeedCache';
const FEED_CACHE_EXPIRY_KEY = 'subscriptionFeedCacheExpiry';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

type CachedFeedData = {
  videoRefs: { videoId: string; pubDate: string }[];
};

const getCachedFeed = (): CachedFeedData | null => {
  try {
    const expiry = localStorage.getItem(FEED_CACHE_EXPIRY_KEY);
    if (!expiry || Date.now() > parseInt(expiry, 10)) {
      return null;
    }
    const cached = localStorage.getItem(FEED_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const setCachedFeed = (data: CachedFeedData): void => {
  try {
    localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(FEED_CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION_MS));
  } catch (error) {
    console.warn('Failed to cache feed data:', error);
  }
};

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

const fetchSingleFeed = async (
  subscription: Subscription
): Promise<{ videoId: string; pubDate: string }[]> => {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${subscription.channelId}`;
  const apiKey = import.meta.env.RSS_2_JSON_API_KEY;
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}${apiKey ? `&api_key=${apiKey}` : ''}`;

  const response = await axios.get<RSSFeedResponse>(proxyUrl);

  if (response.data.status !== "ok") {
    console.warn(`Failed to fetch feed for ${subscription.title}`);
    return [];
  }

  return response.data.items.map((item) => ({
    videoId: extractVideoIdFromLink(item.link),
    pubDate: item.pubDate,
  }));
};

export const fetchSubscriptionsFeedAPI = async (
  accessToken: string,
  subscriptions: Subscription[]
): Promise<Video[]> => {
  try {
    // Check for cached feed data first
    const cachedData = getCachedFeed();
    let allVideoRefs: { videoId: string; pubDate: string }[];

    if (cachedData) {
      allVideoRefs = cachedData.videoRefs;
    } else {
      allVideoRefs = [];
      const batchSize = 3;
      const delayBetweenBatches = 1000; // 1 second between batches

      // Process subscriptions in batches to avoid rate limiting
      for (let i = 0; i < subscriptions.length; i += batchSize) {
        const batch = subscriptions.slice(i, i + batchSize);
        try {
          const batchResults = await Promise.all(batch.map(fetchSingleFeed));
          allVideoRefs.push(...batchResults.flat());
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            throw new RateLimitError('RSS feed rate limit exceeded. Please try again later.');
          }
          throw error;
        }

        // Add delay between batches (but not after the last batch)
        if (i + batchSize < subscriptions.length) {
          await delay(delayBetweenBatches);
        }
      }

      // Cache the fetched data
      setCachedFeed({ videoRefs: allVideoRefs });
    }

    // Sort by published date (newest first) and take top 50
    const sortedVideoRefs = allVideoRefs
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 50);

    const videoIds = sortedVideoRefs.map((ref) => ref.videoId);
    const videos = await fetchVideoDetailsAPI(accessToken, videoIds);

    return videos;
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    console.error("Error fetching subscriptions feed:", error);
    return [];
  }
};
