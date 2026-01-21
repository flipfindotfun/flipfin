import { NextRequest, NextResponse } from "next/server";
import { analyzeToken, analyzeNarrative, generateMarketPulse } from "@/lib/groq";
import { searchTweets } from "@/lib/twitter";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data, token } = body;

    if (token) {
      const prompt = `You are a crypto analyst. Give a brief, balanced DYOR (Do Your Own Research) assessment for this token. Be cautious but not harsh. Mention both potential risks and opportunities.

Token: ${token.symbol} (${token.name})
Price: $${token.price}
24h Change: ${token.priceChange24h?.toFixed(2)}%
Volume 24h: $${token.volume24h?.toLocaleString()}
Liquidity: $${token.liquidity?.toLocaleString()}
Market Cap: $${token.marketCap?.toLocaleString()}
Holders: ${token.holders || "Unknown"}
Top 10 Holders: ${token.top10Percent?.toFixed(1)}%

Provide a 2-3 sentence analysis. Include: risk level (low/medium/high), key concern, and potential. Be balanced - mention if it could moon but also risks. Keep it concise.`;

      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        max_tokens: 200,
        temperature: 0.7,
      });

      const analysis = response.choices[0]?.message?.content || "Unable to analyze token at this time.";
      return NextResponse.json({ analysis });
    }

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
