import { NextRequest, NextResponse } from "next/server";
import { searchTweets, analyzeTweetSentiment } from "@/lib/twitter";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") || searchParams.get("q") || "solana memecoin";
  const token = searchParams.get("token");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  try {
    const searchTerm = token ? `$${token} OR ${token}` : query;
    const tweets = await searchTweets(searchTerm, limit);
    
    const sentimentResult = analyzeTweetSentiment(tweets);
    const botResult = detectBotActivity(tweets);

    return NextResponse.json({
      tweets: tweets.slice(0, limit),
      sentiment: {
        score: sentimentResult.score,
        label: sentimentResult.sentiment,
        botRatio: botResult.botRatio,
        bullishCount: 0,
        bearishCount: 0,
      },
      engagement: {
        total: sentimentResult.engagement,
        average: tweets.length > 0 ? Math.round(sentimentResult.engagement / tweets.length) : 0,
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
