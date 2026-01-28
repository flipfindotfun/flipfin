import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const BIRDEYE_API_URL = "https://public-api.birdeye.so";

let cachedData: { tokens: any[]; timestamp: number; source: string | undefined } | null = null;
const CACHE_DURATION = 30000; // 30 seconds cache

export async function GET() {
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      tokens: cachedData.tokens,
      cached: true,
      timestamp: cachedData.timestamp,
    });
  }

  try {
    // 1. Fetch trending tokens from Birdeye
    const birdeyeRes = await axios.get(`${BIRDEYE_API_URL}/defi/token_trending`, {
      params: { sort_by: "rank", sort_type: "asc", offset: 0, limit: 15 },
      headers: {
        "X-API-KEY": BIRDEYE_API_KEY,
        "x-chain": "solana",
        accept: "application/json",
      },
      timeout: 5000,
    });

    if (!birdeyeRes.data?.success || !birdeyeRes.data?.data?.tokens) {
      throw new Error("Birdeye trending failed");
    }

    const birdeyeTokens = birdeyeRes.data.data.tokens;
    const topAddresses = birdeyeTokens.slice(0, 15).map((t: any) => t.address);

    // 2. Parallel augmentation
    const [dsRes, priceRes] = await Promise.allSettled([
      axios.get(`https://api.dexscreener.com/tokens/v1/solana/${topAddresses.join(",")}`, { timeout: 3000 }),
      axios.get(`${BIRDEYE_API_URL}/defi/multi_price`, {
        params: { list_address: topAddresses.join(",") },
        headers: {
          "X-API-KEY": BIRDEYE_API_KEY,
          "x-chain": "solana",
          accept: "application/json",
        },
        timeout: 3000,
      })
    ]);

    const dsPairs = dsRes.status === "fulfilled" && Array.isArray(dsRes.value.data) ? dsRes.value.data : [];
    const birdeyePrices = priceRes.status === "fulfilled" && priceRes.value.data?.success ? priceRes.value.data.data : {};

    const tokens = birdeyeTokens.map((t: any) => {
      const dsPair = dsPairs.find((p: any) => p.baseToken.address.toLowerCase() === t.address.toLowerCase());
      const bePriceInfo = birdeyePrices[t.address];
      
      // Use price change from DS first, then try to calculate from Birdeye if possible, otherwise use 0
      // Birdeye trending actually includes some fields, let's check t.price_change_24h
      const priceChange = dsPair?.priceChange?.h24 ?? t.price_change_24h ?? 0;

      return {
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals || 9,
        price: dsPair ? parseFloat(dsPair.priceUsd) : (bePriceInfo?.price || t.price || 0),
        priceChange24h: priceChange,
        volume24h: dsPair?.volume?.h24 || t.volume24hUSD || t.v24h_usd || 0,
        liquidity: dsPair?.liquidity?.usd || t.liquidity || 0,
        marketCap: dsPair?.fdv || t.mc || 0,
        logoURI: dsPair?.info?.imageUrl || t.logo_uri || t.logoURI || `https://dd.dexscreener.com/ds-data/tokens/solana/${t.address}.png`,
        rank: t.rank,
        source: dsPair ? "ds-augmented" : "birdeye",
      };
    });

    if (tokens.length > 0) {
      cachedData = { tokens, timestamp: Date.now(), source: "birdeye-augmented" };
      return NextResponse.json({
        success: true,
        tokens,
        source: "birdeye-augmented",
        timestamp: Date.now(),
      });
    }
  } catch (error: any) {
    console.error("Trending API Error:", error.message);
  }

  // Fallback to DexScreener if Birdeye is down
  try {
    const dsResponse = await axios.get("https://api.dexscreener.com/token-profiles/latest/v1", { timeout: 5000 });
    const dsTokens = dsResponse.data || [];
    const solanaAddresses = dsTokens
      .filter((t: any) => t.chainId === "solana")
      .map((t: any) => t.tokenAddress)
      .slice(0, 15);

    if (solanaAddresses.length > 0) {
      const detailsRes = await axios.get(`https://api.dexscreener.com/tokens/v1/solana/${solanaAddresses.join(",")}`, { timeout: 5000 });
      const pairs = Array.isArray(detailsRes.data) ? detailsRes.data : [];
      
      const tokens = pairs
        .filter((p: any) => p.chainId === "solana")
        .map((pair: any) => ({
          address: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          decimals: 9,
          price: parseFloat(pair.priceUsd) || 0,
          priceChange24h: pair.priceChange?.h24 || 0,
          volume24h: pair.volume?.h24 || 0,
          liquidity: pair.liquidity?.usd || 0,
          marketCap: pair.fdv || 0,
          logoURI: pair.info?.imageUrl || `https://dd.dexscreener.com/ds-data/tokens/solana/${pair.baseToken.address}.png`,
          source: "dexscreener-fallback",
        }));

      if (tokens.length > 0) {
        cachedData = { tokens, timestamp: Date.now(), source: "dexscreener-fallback" };
        return NextResponse.json({ success: true, tokens, source: "dexscreener-fallback", timestamp: Date.now() });
      }
    }
  } catch (error: any) {
    console.error("DexScreener Fallback Error:", error.message);
  }

  return NextResponse.json(
    { success: false, error: "Failed to fetch trending tokens", tokens: cachedData?.tokens || [] },
    { status: 200 }
  );
}
