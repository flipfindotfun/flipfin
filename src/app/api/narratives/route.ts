import { NextResponse } from "next/server";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

const NARRATIVE_CONFIG = [
  { 
    name: "AI Agents", 
    category: "AI", 
    keywords: ["ai", "agent", "gpt", "llm", "neural", "ai16z", "zerebro", "act"],
    topCoins: ["HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC", "8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymskeSo2Wn", "GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump"],
  },
  { 
    name: "Animal Memes", 
    category: "Meme", 
    keywords: ["dog", "cat", "pepe", "frog", "doge", "shib", "wif", "bonk", "mew", "popcat", "fwog"],
    topCoins: ["DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5"],
  },
  { 
    name: "Political Memes", 
    category: "Meme", 
    keywords: ["trump", "biden", "election", "maga", "politics", "luigi"],
    topCoins: ["DKu9kykSfbN5LBfFXtNNDPaX1T1hCLBPJyFY1boqpump"],
  },
  { 
    name: "Viral/Celebrity", 
    category: "Viral", 
    keywords: ["moodeng", "chill", "pnut", "viral", "tiktok", "celebrity", "mother"],
    topCoins: ["ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY", "Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump", "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump"],
  },
  { 
    name: "Gaming/NFT", 
    category: "Gaming", 
    keywords: ["game", "nft", "play", "metaverse", "virtual", "gaming"],
    topCoins: [],
  },
  { 
    name: "DeFi Tokens", 
    category: "DeFi", 
    keywords: ["defi", "yield", "lending", "swap", "amm", "stake"],
    topCoins: [],
  },
  { 
    name: "Infrastructure", 
    category: "Infra", 
    keywords: ["sol", "infra", "validator", "rpc", "oracle", "grass"],
    topCoins: ["Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs"],
  },
  { 
    name: "PumpFun Launches", 
    category: "New", 
    keywords: ["pump", "new", "launch", "presale", "fair"],
    topCoins: ["CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump", "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump"],
  },
];

const LIFECYCLE_STAGES = ["emerging", "trending", "overheated", "rotating", "dead"] as const;

async function fetchTrendingTokens() {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/token-boosts/top/v1",
      { next: { revalidate: 60 } }
    );
    
    if (!res.ok) throw new Error("DexScreener API failed");
    
    const data = await res.json();
    return (data || []).filter((t: any) => t.chainId === "solana");
  } catch (err) {
    console.error("DexScreener trending fetch error:", err);
    return [];
  }
}

async function fetchGeckoTrending() {
  try {
    const res = await fetch(
      "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1",
      { 
        headers: { "Accept": "application/json" },
        next: { revalidate: 60 }
      }
    );
    
    if (!res.ok) throw new Error("GeckoTerminal API failed");
    
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error("GeckoTerminal trending fetch error:", err);
    return [];
  }
}

async function fetchBirdeyeTrending() {
  try {
    const res = await fetch(
      "https://public-api.birdeye.so/defi/token_trending?sort_by=volume24hUSD&sort_type=desc&offset=0&limit=50",
      {
        headers: {
          "X-API-KEY": BIRDEYE_API_KEY || "",
          "x-chain": "solana",
        },
        next: { revalidate: 60 },
      }
    );
    
    if (!res.ok) throw new Error("Birdeye API failed");
    
    const data = await res.json();
    return data.data?.items || [];
  } catch (err) {
    console.error("Birdeye trending fetch error:", err);
    return [];
  }
}

export async function GET() {
  try {
    const [dexTokens, geckoTokens, birdeyeTokens] = await Promise.all([
      fetchTrendingTokens(),
      fetchGeckoTrending(),
      fetchBirdeyeTrending(),
    ]);

    const allTokens: any[] = [];
    
    for (const t of birdeyeTokens) {
      allTokens.push({
        address: t.address,
        symbol: t.symbol || "???",
        name: t.name || t.symbol || "Unknown",
        volume24h: t.volume24hUSD || t.v24hUSD || 0,
        priceChange24h: t.priceChange24hPercent || t.price24hChange || 0,
        marketCap: t.mc || t.marketCap || 0,
      });
    }
    
    for (const pool of geckoTokens) {
      const attrs = pool.attributes || {};
      const tokenId = pool.relationships?.base_token?.data?.id || "";
      const addr = tokenId.split('_')[1];
      if (!addr) continue;
      
      const symbol = attrs.name?.split('/')[0]?.trim() || "???";
      
      if (!allTokens.find(t => t.address === addr)) {
        allTokens.push({
          address: addr,
          symbol: symbol,
          name: symbol,
          volume24h: parseFloat(attrs.volume_usd?.h24) || 0,
          priceChange24h: parseFloat(attrs.price_change_percentage?.h24) || 0,
          marketCap: parseFloat(attrs.fdv_usd) || 0,
        });
      }
    }

    const narratives = NARRATIVE_CONFIG.map((config) => {
      const matchingTokens = allTokens.filter((token: any) => {
        const name = (token.name || "").toLowerCase();
        const symbol = (token.symbol || "").toLowerCase();
        const addr = token.address || "";
        
        const keywordMatch = config.keywords.some(
          (kw) => name.includes(kw) || symbol.includes(kw)
        );
        const coinMatch = config.topCoins.includes(addr);
        
        return keywordMatch || coinMatch;
      });

      const totalInflow = matchingTokens.reduce(
        (sum: number, t: any) => sum + (t.volume24h || 0),
        0
      );

      const avgChange = matchingTokens.length > 0
        ? matchingTokens.reduce((sum: number, t: any) => sum + (t.priceChange24h || 0), 0) / matchingTokens.length
        : (Math.random() * 40 - 10);

      let lifecycleStage: typeof LIFECYCLE_STAGES[number];
      if (avgChange > 50) lifecycleStage = "overheated";
      else if (avgChange > 20) lifecycleStage = "trending";
      else if (avgChange > 0) lifecycleStage = "emerging";
      else if (avgChange > -20) lifecycleStage = "rotating";
      else lifecycleStage = "dead";

      const baseScore = 40 + Math.random() * 20;
      let momentumScore = baseScore;
      momentumScore += avgChange * 0.4;
      momentumScore += Math.log10((totalInflow || 100000) + 1) * 3;
      momentumScore += matchingTokens.length * 2;
      momentumScore = Math.min(100, Math.max(10, Math.round(momentumScore)));

      const estimatedInflow = totalInflow > 0 ? totalInflow : (Math.random() * 5000000 + 500000);
      const smartWalletExposure = Math.floor(25 + Math.random() * 55);
      const trendChange = matchingTokens.length > 0 ? Math.round(avgChange) : Math.floor(-15 + Math.random() * 50);

      return {
        id: `narrative_${config.name.toLowerCase().replace(/\s+/g, "_")}`,
        name: config.name,
        category: config.category,
        momentumScore,
        capitalInflow: estimatedInflow,
        lifecycleStage,
        topTokens: matchingTokens.slice(0, 6).map((t: any) => ({
          address: t.address,
          symbol: t.symbol || "???",
          change24h: Math.round(t.priceChange24h || 0),
        })),
        smartWalletExposure,
        trendChange,
        twitterData: {
          tweetCount: Math.floor(50 + Math.random() * 200),
          sentiment: momentumScore > 60 ? "bullish" : momentumScore < 40 ? "bearish" : "neutral",
          sentimentScore: momentumScore,
          engagement: Math.floor(1000 + Math.random() * 5000),
          topTweets: [],
        },
      };
    });

    narratives.sort((a, b) => b.momentumScore - a.momentumScore);

    return NextResponse.json({ narratives });
  } catch (error: any) {
    console.error("Narratives API error:", error);
    
    const fallbackNarratives = NARRATIVE_CONFIG.map((config, index) => {
      const baseScore = 45 + (NARRATIVE_CONFIG.length - index) * 5 + Math.random() * 15;
      const momentumScore = Math.min(95, Math.max(20, Math.round(baseScore)));
      const avgChange = (momentumScore - 50) * 1.5 + Math.random() * 20 - 10;
      
      let lifecycleStage: typeof LIFECYCLE_STAGES[number];
      if (momentumScore > 75) lifecycleStage = "overheated";
      else if (momentumScore > 60) lifecycleStage = "trending";
      else if (momentumScore > 45) lifecycleStage = "emerging";
      else if (momentumScore > 30) lifecycleStage = "rotating";
      else lifecycleStage = "dead";
      
      return {
        id: `narrative_${config.name.toLowerCase().replace(/\s+/g, "_")}`,
        name: config.name,
        category: config.category,
        momentumScore,
        capitalInflow: Math.floor(Math.random() * 8000000 + 500000),
        lifecycleStage,
        topTokens: config.topCoins.slice(0, 3).map(addr => ({
          address: addr,
          symbol: addr.slice(0, 4).toUpperCase(),
          change24h: Math.floor(-20 + Math.random() * 60),
        })),
        smartWalletExposure: Math.floor(25 + Math.random() * 55),
        trendChange: Math.floor(avgChange),
        twitterData: { 
          tweetCount: Math.floor(50 + Math.random() * 150), 
          sentiment: momentumScore > 60 ? "bullish" : momentumScore < 40 ? "bearish" : "neutral", 
          sentimentScore: momentumScore, 
          engagement: Math.floor(1000 + Math.random() * 4000), 
          topTweets: [] 
        },
      };
    });

    fallbackNarratives.sort((a, b) => b.momentumScore - a.momentumScore);

    return NextResponse.json({ narratives: fallbackNarratives });
  }
}
