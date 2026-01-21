import { NextRequest, NextResponse } from "next/server";
import { analyzeToken, analyzeNarrative, generateMarketPulse } from "@/lib/groq";
import { searchTweets } from "@/lib/twitter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === "token") {
      const tweets = await searchTweets(
        `(${data.symbol} OR $${data.symbol}) crypto solana -is:retweet lang:en`,
        15
      );
      
      const analysis = await analyzeToken(
        {
          symbol: data.symbol,
          name: data.name || data.symbol,
          price: data.price || 0,
          priceChange24h: data.priceChange24h || 0,
          volume24h: data.volume24h || 0,
          marketCap: data.marketCap || 0,
          holders: data.holders,
          topHolderPercent: data.topHolderPercent,
        },
        tweets.map((t) => ({ text: t.text, likes: t.metrics.likes }))
      );

      return NextResponse.json({ analysis, tweetCount: tweets.length });
    }

    if (type === "narrative") {
      const tweets = await searchTweets(
        `${data.name} crypto solana -is:retweet lang:en`,
        20
      );
      
      const analysis = await analyzeNarrative(
        data.name,
        data.tokens || [],
        tweets.map((t) => ({ text: t.text, likes: t.metrics.likes }))
      );

      return NextResponse.json({ analysis, tweetCount: tweets.length });
    }

    if (type === "market-pulse") {
      const pulse = await generateMarketPulse(
        data.topGainers || [],
        data.topLosers || [],
        data.totalVolume || 0,
        data.dominantNarrative
      );

      return NextResponse.json({ pulse });
    }

    return NextResponse.json({ error: "Invalid analysis type" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
