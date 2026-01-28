import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const BIRDEYE_API_URL = "https://public-api.birdeye.so";

let cachedData: { tokens: any[]; timestamp: number; source: string | undefined } | null = null;
const CACHE_DURATION = 60000;

export async function GET() {
  // Return cached data if fresh
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      tokens: cachedData.tokens,
      cached: true,
      timestamp: cachedData.timestamp,
    });
  }

  // Try Birdeye first (more accurate for Solana)
  try {
    const birdeyeRes = await axios.get(`${BIRDEYE_API_URL}/defi/token_trending`, {
      params: {
        sort_by: "rank",
        sort_type: "asc",
        offset: 0,
        limit: 20,
      },
      headers: {
        "X-API-KEY": BIRDEYE_API_KEY,
        accept: "application/json",
      },
      timeout: 10000,
    });

    if (birdeyeRes.data?.success && birdeyeRes.data?.data?.tokens) {
      const tokens = birdeyeRes.data.data.tokens.map((t: any) => ({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        price: t.price || 0,
        priceChange24h: t.price_change_24h_percent || 0,
        volume24h: t.v24h_usd || 0,
        liquidity: t.liquidity || 0,
        marketCap: t.mc || 0,
        logoURI: t.logo_uri,
        rank: t.rank,
        source: "birdeye",
      }));

      if (tokens.length > 0) {
        cachedData = { tokens, timestamp: Date.now(), source: "birdeye" };
        return NextResponse.json({
          success: true,
          tokens,
          source: "birdeye",
          timestamp: Date.now(),
        });
      }
    }
  } catch (error: any) {
    console.error("Birdeye trending error:", error.message);
  }

  // Try DexScreener as fallback
  try {
    const dsResponse = await axios.get("https://api.dexscreener.com/token-profiles/latest/v1", {
      timeout: 10000,
    });
    
    const dsTokens = dsResponse.data || [];
    const solanaAddresses = dsTokens
      .filter((t: any) => t.chainId === "solana")
      .map((t: any) => t.tokenAddress)
      .slice(0, 30);

    if (solanaAddresses.length > 0) {
      // Get detailed info for these tokens
      const detailsRes = await axios.get(
        `https://api.dexscreener.com/tokens/v1/solana/${solanaAddresses.join(",")}`,
        { timeout: 10000 }
      );

      const pairs = detailsRes.data || [];
      const tokenMap = new Map();

      if (Array.isArray(pairs)) {
        pairs.forEach((pair: any) => {
          if (pair.chainId !== "solana") return;
          
          const existing = tokenMap.get(pair.baseToken.address);
          const liquidity = pair.liquidity?.usd || 0;
          
            if (!existing || liquidity > existing.liquidity) {
              const socials = pair.info?.socials || [];
              const websites = pair.info?.websites || [];
              const twitterSocial = socials.find((s: any) => s.platform === "twitter");
              const telegramSocial = socials.find((s: any) => s.platform === "telegram");
              
              let twitterUrl = null;
              if (twitterSocial?.handle) {
                const handle = twitterSocial.handle.replace('@', '').replace('https://twitter.com/', '').replace('https://x.com/', '');
                twitterUrl = `https://x.com/${handle}`;
              }
              
              let telegramUrl = null;
              if (telegramSocial?.handle) {
                const handle = telegramSocial.handle.replace('@', '').replace('https://t.me/', '');
                telegramUrl = `https://t.me/${handle}`;
              }
              
              tokenMap.set(pair.baseToken.address, {
                  address: pair.baseToken.address,
                  symbol: pair.baseToken.symbol,
                  name: pair.baseToken.name,
                  decimals: 9,
                  price: parseFloat(pair.priceUsd) || 0,
                  priceChange24h: pair.priceChange?.h24 || 0,
                  volume24h: pair.volume?.h24 || 0,
                  liquidity: liquidity,
                  marketCap: pair.fdv || 0,
                  createdAt: pair.pairCreatedAt,
                  logoURI: pair.info?.imageUrl,
                  platform: pair.pairAddress?.toLowerCase().includes('pump') ? "pumpfun" : "raydium",
                  twitter: twitterUrl,
                  telegram: telegramUrl,
                  website: websites[0]?.url || null,
                });
            }
        });
      }

      const tokens = Array.from(tokenMap.values());
      
      if (tokens.length > 0) {
        cachedData = { tokens, timestamp: Date.now() };
        return NextResponse.json({
          success: true,
          tokens,
          source: "dexscreener",
          timestamp: Date.now(),
        });
      }
    }
    } catch (error: any) {
      console.error("DexScreener error:", error.message);
    }

    // Return cached data even if stale, or empty
    if (cachedData) {
    return NextResponse.json({
      success: true,
      tokens: cachedData.tokens,
      cached: true,
      stale: true,
      timestamp: cachedData.timestamp,
    });
  }

  return NextResponse.json(
    { success: false, error: "Failed to fetch tokens", tokens: [] },
    { status: 200 }
  );
}
