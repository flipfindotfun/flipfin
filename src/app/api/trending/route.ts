import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

let cachedData: { tokens: any[]; timestamp: number; source: string } | null = null;
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

  // Try DexScreener first (more reliable, no rate limits)
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

  if (BIRDEYE_API_KEY) {
    try {
      const response = await axios.get(
        "https://public-api.birdeye.so/defi/token_trending",
        {
          params: {
            sort_by: "rank",
            sort_type: "desc",
            offset: 0,
            limit: 20
          },
          headers: {
            "accept": "application/json",
            "X-API-KEY": BIRDEYE_API_KEY,
            "x-chain": "solana"
          },
          timeout: 15000
        }
      );

      if (response.data?.success && response.data?.data?.tokens) {
        const tokens = response.data.data.tokens;
        
        const mappedTokens = tokens.map((t: any) => ({
          address: t.address,
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals || 9,
          price: t.price || 0,
          priceChange24h: t.priceChange24h || 0,
          volume24h: t.volume24hUSD || 0,
          liquidity: t.liquidity || 0,
          marketCap: t.mc || t.volume24hUSD || 0,
          logoURI: t.logoURI,
          rank: t.rank
        }));

        if (mappedTokens.length > 0) {
          cachedData = { tokens: mappedTokens, timestamp: Date.now(), source: "birdeye" };
        }

        return NextResponse.json({
          success: true,
          tokens: mappedTokens,
          source: "birdeye",
          timestamp: Date.now(),
        });
      }
    } catch (error: any) {
      console.error("Birdeye error:", error.response?.status, error.response?.data || error.message);
    }
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
