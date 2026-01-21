import { NextRequest, NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

const tweetCache = new Map<string, { tweets: any[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;
tweetCache.clear();

async function fetchRealTweets(query: string, maxResults: number = 10): Promise<any[]> {
  if (!BEARER_TOKEN) {
    console.error("Twitter Bearer Token not configured");
    return [];
  }

  const cacheKey = `${query}_${maxResults}`;
  const cached = tweetCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.tweets;
  }

  try {
    const client = new TwitterApi(BEARER_TOKEN);
    const v2Client = client.v2;

      let searchQuery = query
        .replace(/-is:retweet/gi, '')
        .replace(/lang:\w+/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!searchQuery || searchQuery.length < 2) {
        searchQuery = 'solana crypto';
      }

      console.log("Twitter search query:", searchQuery);
      
      const response = await v2Client.search(searchQuery, {
        "tweet.fields": ["created_at", "author_id", "public_metrics"],
        expansions: ["author_id"],
        "user.fields": ["name", "username", "profile_image_url"],
        max_results: Math.min(Math.max(maxResults, 10), 100),
      });

      const tweets = response.data?.data || [];
      const includes = response.includes;

      if (!tweets || tweets.length === 0) {
        return [];
      }

      const usersMap = new Map<string, any>();
      if (includes?.users) {
        for (const user of includes.users) {
          usersMap.set(user.id, user);
        }
      }

      const result = tweets.map((tweet: any) => {
      const author = usersMap.get(tweet.author_id);
      return {
        id: tweet.id,
        text: tweet.text,
        author: {
          id: tweet.author_id || "",
          name: author?.name || "Crypto Trader",
          username: author?.username || "anonymous",
          profileImageUrl: author?.profile_image_url?.replace("_normal", "_bigger") ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${author?.username || tweet.id}&backgroundColor=1e2329`,
        },
        createdAt: tweet.created_at || new Date().toISOString(),
        metrics: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          impressions: tweet.public_metrics?.impression_count || 0,
        },
      };
    });

    tweetCache.set(cacheKey, { tweets: result, timestamp: Date.now() });
    return result;
  } catch (err: any) {
    console.error("Twitter API error:", err.code, err.data || err.message);
    const cached = tweetCache.get(cacheKey);
    if (cached) {
      return cached.tweets;
    }
    return [];
  }
}



export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") || searchParams.get("q") || "solana memecoin";
  const token = searchParams.get("token");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  try {
    const searchTerm = token ? `$${token} OR ${token}` : query;
    let tweets = await fetchRealTweets(searchTerm, limit);
    
    tweets = tweets.slice(0, limit);

    const bullishWords = ['moon', 'pump', 'buy', 'bullish', 'gem', 'ape', '100x', 'alpha', 'send', 'wagmi', 'lfg', 'rocket'];
    const bearishWords = ['dump', 'sell', 'rug', 'scam', 'bearish', 'dead', 'rekt', 'ngmi', 'fud'];

    let bullishCount = 0;
    let bearishCount = 0;
    let totalEngagement = 0;

    for (const tweet of tweets) {
      const text = tweet.text?.toLowerCase() || '';
      bullishCount += bullishWords.filter(w => text.includes(w)).length;
      bearishCount += bearishWords.filter(w => text.includes(w)).length;
      totalEngagement += (tweet.metrics?.likes || 0) + (tweet.metrics?.retweets || 0) * 2 + (tweet.metrics?.replies || 0);
    }

    const total = bullishCount + bearishCount;
    let sentimentScore = 50;
    if (total > 0) {
      sentimentScore = Math.round((bullishCount / total) * 100);
    }

    const sentiment = sentimentScore > 60 ? 'bullish' : sentimentScore < 40 ? 'bearish' : 'neutral';

    return NextResponse.json({
      tweets,
      sentiment: {
        score: sentimentScore,
        label: sentiment,
        bullishCount,
        bearishCount,
      },
      engagement: {
        total: totalEngagement,
        average: tweets.length > 0 ? Math.round(totalEngagement / tweets.length) : 0,
      },
      meta: {
        count: tweets.length,
        query: token || query,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error("Twitter API error:", error);
    
    return NextResponse.json({
      tweets: [],
      sentiment: {
        score: 50,
        label: 'neutral',
        bullishCount: 0,
        bearishCount: 0,
      },
      engagement: {
        total: 0,
        average: 0,
      },
      meta: {
        count: 0,
        query: token || query,
        timestamp: new Date().toISOString(),
        error: true,
      }
    });
  }
}
