import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

const ohlcvCache = new Map<string, { items: any[]; timestamp: number }>();
const CACHE_DURATION = 30000;

const TIMEFRAME_SECONDS: { [key: string]: number } = {
  "1s": 1,
  "30s": 30,
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const type = searchParams.get("type") || "15m";

  if (!address) {
    return NextResponse.json({ error: "Token address is required" }, { status: 400 });
  }

  const cacheKey = `${address}-${type}`;
  const cached = ohlcvCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      items: cached.items,
      cached: true,
      source: "cache",
    });
  }

  const intervalSeconds = TIMEFRAME_SECONDS[type] || 900;
  const candleCount = type === "1d" ? 30 : type === "4h" ? 42 : type === "1h" ? 48 : type === "1s" ? 120 : type === "30s" ? 120 : 96;
  const timeFrom = Math.floor(Date.now() / 1000) - intervalSeconds * candleCount;
  const timeTo = Math.floor(Date.now() / 1000);

  if (BIRDEYE_API_KEY) {
    try {
      const response = await axios.get(
        `https://public-api.birdeye.so/defi/ohlcv`,
        {
          params: {
            address: address,
            type: type,
            time_from: timeFrom,
            time_to: timeTo,
          },
          headers: {
            "X-API-KEY": BIRDEYE_API_KEY,
            "x-chain": "solana",
          },
          timeout: 10000,
        }
      );

      const data = response.data?.data;

      if (data && data.items && data.items.length > 0) {
        ohlcvCache.set(cacheKey, { items: data.items, timestamp: Date.now() });
        return NextResponse.json({ items: data.items, source: "birdeye" });
      }
    } catch (error: any) {
      console.log("Birdeye OHLCV error:", error.response?.status || error.message);
    }
  }

  let currentPrice = 0;
  let priceChanges = { m5: 0, h1: 0, h6: 0, h24: 0 };

  try {
    const pairRes = await axios.get(
      `https://api.dexscreener.com/tokens/v1/solana/${address}`,
      { timeout: 8000 }
    );

    const pairs = pairRes.data;
    if (Array.isArray(pairs) && pairs.length > 0) {
      const mainPair = pairs.sort(
        (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      )[0];

      currentPrice = parseFloat(mainPair.priceUsd) || 0;
      priceChanges = {
        m5: mainPair.priceChange?.m5 || 0,
        h1: mainPair.priceChange?.h1 || 0,
        h6: mainPair.priceChange?.h6 || 0,
        h24: mainPair.priceChange?.h24 || 0,
      };
    }
  } catch (e) {
    console.log("DexScreener price fetch failed");
  }

  if (currentPrice > 0) {
    const items = generateCandlesFromPrice(currentPrice, priceChanges, type);
    ohlcvCache.set(cacheKey, { items, timestamp: Date.now() });
    return NextResponse.json({ items, source: "dexscreener_derived" });
  }

  if (cached) {
    return NextResponse.json({
      items: cached.items,
      cached: true,
      stale: true,
      source: "stale_cache",
    });
  }

  return NextResponse.json({
    items: [],
    error: "Could not fetch OHLCV data",
  });
}

function generateCandlesFromPrice(
  currentPrice: number,
  changes: { m5: number; h1: number; h6: number; h24: number },
  type: string = "15m"
): any[] {
  const items = [];
  const now = Math.floor(Date.now() / 1000);
  const intervalMap: { [key: string]: number } = {
    "1s": 1,
    "30s": 30,
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
  };
  const interval = intervalMap[type] || 900;
  const candleCount = type === "1d" ? 30 : type === "4h" ? 42 : type === "1h" ? 48 : type === "1s" ? 120 : type === "30s" ? 120 : 96;

  // Calculate historical prices from percentage changes
  const price5mAgo = currentPrice / (1 + (changes.m5 || 0) / 100);
  const price1hAgo = currentPrice / (1 + (changes.h1 || 0) / 100);
  const price6hAgo = currentPrice / (1 + (changes.h6 || 0) / 100);
  const price24hAgo = currentPrice / (1 + (changes.h24 || 0) / 100);

  const pricePoints = [
    { time: now - 86400, price: price24hAgo },
    { time: now - 21600, price: price6hAgo },
    { time: now - 3600, price: price1hAgo },
    { time: now - 300, price: price5mAgo },
    { time: now, price: currentPrice },
  ];

  // Generate smooth candles
  for (let i = candleCount; i >= 0; i--) {
    const candleTime = now - i * interval;
    
    let interpPrice = price24hAgo;
    for (let j = 0; j < pricePoints.length - 1; j++) {
      if (candleTime >= pricePoints[j].time && candleTime <= pricePoints[j + 1].time) {
        const fraction = (candleTime - pricePoints[j].time) / (pricePoints[j + 1].time - pricePoints[j].time || 1);
        interpPrice = pricePoints[j].price + (pricePoints[j + 1].price - pricePoints[j].price) * fraction;
        break;
      }
    }
    if (candleTime > now - 300) {
      interpPrice = currentPrice;
    }

    // Add natural volatility
    const volatility = interpPrice * 0.015;
    const seed = Math.sin(candleTime * 0.001) * 10000;
    const pseudoRandom = (seed - Math.floor(seed));
    const noise = (pseudoRandom - 0.5) * volatility;
    
    const open = Math.max(0.0000000001, interpPrice + noise * 0.5);
    const close = Math.max(0.0000000001, interpPrice + noise);
    const high = Math.max(open, close) * (1 + Math.abs(pseudoRandom) * 0.01);
    const low = Math.min(open, close) * (1 - Math.abs(pseudoRandom) * 0.01);

    items.push({
      unixTime: candleTime,
      o: open,
      h: high,
      l: low,
      c: close,
      v: Math.abs(pseudoRandom) * 100000,
    });
  }

  return items;
}
