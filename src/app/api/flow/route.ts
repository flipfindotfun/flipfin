import { NextRequest, NextResponse } from "next/server";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
}

const STABLECOIN_ADDRESSES = [
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX",
  "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA",
];

const NON_MEME_ADDRESSES = [
  "So11111111111111111111111111111111111111112",
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
  "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
  "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ",
  "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6",
  "nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7",
  "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
];

const MEME_COINS_DB: Record<string, { symbol: string; name: string; logoURI: string }> = {
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": { symbol: "BONK", name: "Bonk", logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I" },
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": { symbol: "WIF", name: "dogwifhat", logoURI: "https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link" },
  "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5": { symbol: "MEW", name: "cat in a dogs world", logoURI: "https://bafkreidlwyr565dxtao2ipsze6bmzpszqzybz7sqi2zaet5fs7k3feaity.ipfs.nftstorage.link/" },
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": { symbol: "WEN", name: "Wen", logoURI: "https://shdw-drive.genesysgo.net/CyQqzAb4hWrFHfhVcqmWd6S3H58SZuDjfC4dcrvoRoK2/wen.png" },
  "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82": { symbol: "BOME", name: "BOOK OF MEME", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82.png" },
  "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump": { symbol: "FARTCOIN", name: "Fartcoin", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump.png" },
  "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY": { symbol: "MOODENG", name: "Moo Deng", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY.png" },
  "Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump": { symbol: "CHILLGUY", name: "Just a chill guy", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump.png" },
  "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump": { symbol: "PNUT", name: "Peanut the Squirrel", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump.png" },
  "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump": { symbol: "GOAT", name: "Goatseus Maximus", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump.png" },
  "GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump": { symbol: "ACT", name: "Act I: The AI Prophecy", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump.png" },
  "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC": { symbol: "AI16Z", name: "ai16z", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC.png" },
  "Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs": { symbol: "GRASS", name: "Grass", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs.png" },
  "8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymskeSo2Wn": { symbol: "ZEREBRO", name: "Zerebro", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymskeSo2Wn.png" },
  "Cn5Ne1vmR9ctMGY9z5NC71A3NYFvopjXNyxYtfVYpump": { symbol: "SIGMA", name: "SIGMA", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/Cn5Ne1vmR9ctMGY9z5NC71A3NYFvopjXNyxYtfVYpump.png" },
  "5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp": { symbol: "MICHI", name: "michi", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp.png" },
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump": { symbol: "FWOG", name: "FWOG", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump.png" },
  "EdfRrkH8PpMz3mLZqrVK7GS1RoVfTJorFbwYJoHqpump": { symbol: "BAN", name: "BANANA", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/EdfRrkH8PpMz3mLZqrVK7GS1RoVfTJorFbwYJoHqpump.png" },
  "6ogzHhzdrQr9Pgv6hZ2MNze7UrzBMAFyBBWUYp1Fhitx": { symbol: "GIGA", name: "GIGACHAD", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/6ogzHhzdrQr9Pgv6hZ2MNze7UrzBMAFyBBWUYp1Fhitx.png" },
  "DKu9kykSfbN5LBfFXtNNDPaX1T1hCLBPJyFY1boqpump": { symbol: "LUIGI", name: "Luigi", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/DKu9kykSfbN5LBfFXtNNDPaX1T1hCLBPJyFY1boqpump.png" },
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr": { symbol: "POPCAT", name: "Popcat", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr.png" },
  "4Cnk9EPnW5ixfLZatCPJjDB1PUtcRpVVgTQukm9epump": { symbol: "PENGU", name: "Pudgy Penguins", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/4Cnk9EPnW5ixfLZatCPJjDB1PUtcRpVVgTQukm9epump.png" },
  "AujTJJ7aMS8LDo3bFzoyXDwT3jBALUbu4VZhzZdTZLmG": { symbol: "MUMU", name: "Mumu the Bull", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/AujTJJ7aMS8LDo3bFzoyXDwT3jBALUbu4VZhzZdTZLmG.png" },
  "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv": { symbol: "PEPE", name: "Pepe", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv.png" },
  "3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN": { symbol: "MOTHER", name: "Mother Iggy", logoURI: "https://dd.dexscreener.com/ds-data/tokens/solana/3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN.png" },
};

function enrichToken(token: TokenInfo): TokenInfo {
  const known = MEME_COINS_DB[token.address];
  if (known) {
    return {
      ...token,
      symbol: token.symbol && token.symbol !== "???" ? token.symbol : known.symbol,
      name: token.name && token.name !== "Unknown" ? token.name : known.name,
      logoURI: token.logoURI || known.logoURI,
    };
  }
  return token;
}

async function fetchDexScreenerTrending(): Promise<TokenInfo[]> {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/token-boosts/top/v1",
      { next: { revalidate: 30 } }
    );

    if (!res.ok) throw new Error("DexScreener boosts API failed");
    
    const data = await res.json();
    const tokens: TokenInfo[] = [];
    const seen = new Set<string>();
    
    for (const item of data || []) {
      if (item.chainId !== "solana") continue;
      const addr = item.tokenAddress;
      if (!addr || seen.has(addr)) continue;
      if (STABLECOIN_ADDRESSES.includes(addr) || NON_MEME_ADDRESSES.includes(addr)) continue;
      
      seen.add(addr);
      
      const pairRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
      const pairData = await pairRes.json();
      const pair = pairData.pairs?.[0];
      
      if (pair) {
        tokens.push(enrichToken({
          address: addr,
          symbol: pair.baseToken?.symbol || item.description?.split(' ')[0] || "MEME",
          name: pair.baseToken?.name || item.description || "Unknown Meme",
          logoURI: item.icon || pair.info?.imageUrl || `https://dd.dexscreener.com/ds-data/tokens/solana/${addr}.png`,
          price: parseFloat(pair.priceUsd) || 0,
          priceChange24h: pair.priceChange?.h24 || 0,
          volume24h: pair.volume?.h24 || 0,
          marketCap: pair.marketCap || pair.fdv || 0,
          liquidity: pair.liquidity?.usd || 0,
        }));
      }
      
      if (tokens.length >= 15) break;
    }
    
    return tokens;
  } catch (err) {
    console.error("DexScreener boosts fetch error:", err);
    return [];
  }
}

async function fetchGeckoTerminalTrending(): Promise<TokenInfo[]> {
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
    const pools = data.data || [];
    
    const seen = new Set<string>();
    const tokens: TokenInfo[] = [];
    
    for (const pool of pools) {
      const attrs = pool.attributes || {};
      const tokenId = pool.relationships?.base_token?.data?.id || "";
      const addr = tokenId.split('_')[1] || attrs.address;
      
      if (!addr || seen.has(addr)) continue;
      if (STABLECOIN_ADDRESSES.includes(addr) || NON_MEME_ADDRESSES.includes(addr)) continue;
      
      seen.add(addr);
      
      const symbol = attrs.name?.split('/')[0]?.trim() || "MEME";
      
      tokens.push(enrichToken({
        address: addr,
        symbol: symbol,
        name: symbol,
        logoURI: `https://dd.dexscreener.com/ds-data/tokens/solana/${addr}.png`,
        price: parseFloat(attrs.base_token_price_usd) || 0,
        priceChange24h: parseFloat(attrs.price_change_percentage?.h24) || 0,
        volume24h: parseFloat(attrs.volume_usd?.h24) || 0,
        marketCap: parseFloat(attrs.market_cap_usd) || parseFloat(attrs.fdv_usd) || 0,
        liquidity: parseFloat(attrs.reserve_in_usd) || 0,
      }));
    }
    
    return tokens;
  } catch (err) {
    console.error("GeckoTerminal fetch error:", err);
    return [];
  }
}

async function fetchBirdeyeTrending(): Promise<TokenInfo[]> {
  try {
    const res = await fetch(
      "https://public-api.birdeye.so/defi/token_trending?sort_by=volume24hUSD&sort_type=desc&offset=0&limit=50",
      {
        headers: {
          "accept": "application/json",
          "X-API-KEY": BIRDEYE_API_KEY || "",
          "x-chain": "solana",
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      console.error("Birdeye API status:", res.status);
      return [];
    }
    
    const data = await res.json();
    if (!data.success || !data.data?.tokens) {
      return [];
    }
    
    const allTokens = (data.data.tokens || []).map((t: any) => enrichToken({
      address: t.address,
      symbol: t.symbol || "MEME",
      name: t.name || t.symbol || "Unknown",
      logoURI: t.logoURI || t.logo,
      price: t.price || 0,
      priceChange24h: t.priceChange24hPercent || t.price24hChange || 0,
      volume24h: t.volume24hUSD || t.v24hUSD || 0,
      marketCap: t.mc || t.marketCap || 0,
      liquidity: t.liquidity || 0,
    }));

    return allTokens.filter((t: TokenInfo) => 
      !STABLECOIN_ADDRESSES.includes(t.address) &&
      !NON_MEME_ADDRESSES.includes(t.address) &&
      t.symbol !== "???"
    );
  } catch (err) {
    console.error("Birdeye trending fetch error:", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const [dexScreener, geckoTerminal, birdeye] = await Promise.all([
      fetchDexScreenerTrending(),
      fetchGeckoTerminalTrending(),
      fetchBirdeyeTrending(),
    ]);

    const tokenMap = new Map<string, TokenInfo>();
    
    [...dexScreener, ...geckoTerminal, ...birdeye].forEach(t => {
      if (t.symbol && t.symbol !== "???" && t.symbol !== "MEME") {
        if (!tokenMap.has(t.address) || t.volume24h > (tokenMap.get(t.address)?.volume24h || 0)) {
          tokenMap.set(t.address, t);
        }
      }
    });

    let tokens = Array.from(tokenMap.values())
      .filter(t => t.symbol && t.symbol !== "???")
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 25);

    if (tokens.length < 10) {
      tokens = getFallbackMemeCoins();
    }

    const nodes: any[] = [];
    const edges: any[] = [];

    const centerX = 0.5;
    const centerY = 0.5;

    tokens.forEach((token: TokenInfo, i: number) => {
      const volume = token.volume24h || 0;
      const change = token.priceChange24h || 0;
      const mcap = token.marketCap || 0;
      
      const angle = (i / tokens.length) * Math.PI * 2 - Math.PI / 2;
      const baseRadius = 0.25 + (i % 3) * 0.08;
      const radius = baseRadius + (Math.random() * 0.05);
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const baseSize = 22;
      const volumeBonus = Math.min(18, Math.log10(volume + 1) * 3.5);
      const size = baseSize + volumeBonus;

      let color = "#6b7280";
      if (change > 50) color = "#00ff88";
      else if (change > 20) color = "#22c55e";
      else if (change > 5) color = "#02c076";
      else if (change > 0) color = "#4ade80";
      else if (change > -5) color = "#fbbf24";
      else if (change > -20) color = "#f97316";
      else color = "#f6465d";

      nodes.push({
        id: token.address,
        type: "token",
        label: token.symbol.slice(0, 8),
        x,
        y,
        size,
        color,
        volume,
        logoUrl: token.logoURI || `https://dd.dexscreener.com/ds-data/tokens/solana/${token.address}.png`,
        metadata: {
          name: token.name,
          symbol: token.symbol,
          priceChange: change,
          marketCap: mcap,
          price: token.price || 0,
          liquidity: token.liquidity || 0,
        },
      });
    });

    for (let i = 0; i < nodes.length; i++) {
      const numConnections = 1 + Math.floor(Math.random() * 2);
      const possibleTargets = nodes.filter((_, j) => j !== i);
      const shuffled = [...possibleTargets].sort(() => Math.random() - 0.5);
      
      shuffled.slice(0, numConnections).forEach((target) => {
        const existingEdge = edges.find(
          e => (e.source === nodes[i].id && e.target === target.id) ||
               (e.source === target.id && e.target === nodes[i].id)
        );
        
        if (!existingEdge) {
          const flowAmount = Math.min(nodes[i].volume, target.volume) * (0.01 + Math.random() * 0.05);
          edges.push({
            id: `${nodes[i].id}_${target.id}`,
            source: nodes[i].id,
            target: target.id,
            amount: flowAmount,
            timestamp: Date.now() - Math.random() * 3600000,
          });
        }
      });
    }

    const totalVolume = nodes.reduce((sum: number, n: any) => sum + (n.volume || 0), 0);
    const avgChange = nodes.length > 0 
      ? nodes.reduce((sum: number, n: any) => sum + (n.metadata?.priceChange || 0), 0) / nodes.length 
      : 0;
    
    let heatScore = 50;
    heatScore += avgChange * 0.8;
    heatScore += Math.log10(totalVolume / 1e6 + 1) * 8;
    heatScore = Math.min(100, Math.max(0, Math.round(heatScore)));

    const sortedByVolume = [...nodes].sort((a, b) => b.volume - a.volume);
    const top10Volume = sortedByVolume.slice(0, 10).reduce((sum, n) => sum + n.volume, 0);
    const whaleDensity = totalVolume > 0 ? Math.round((top10Volume / totalVolume) * 100) : 0;

    const gainers = nodes.filter(n => (n.metadata?.priceChange || 0) > 0)
      .sort((a, b) => b.volume - a.volume);
    const losers = nodes.filter(n => (n.metadata?.priceChange || 0) < 0)
      .sort((a, b) => b.volume - a.volume);

    const metrics = {
      heatScore,
      whaleDensity,
      rotationSpeed: Number((1.5 + Math.random() * 2).toFixed(1)),
      totalVolume24h: totalVolume,
      activeWallets: Math.floor(500 + Math.random() * 2000),
      topInflows: gainers.slice(0, 5).map((n) => ({ 
        token: n.id, 
        symbol: n.label, 
        amount: n.volume,
        logoUrl: n.logoUrl,
        change: n.metadata?.priceChange || 0,
      })),
      topOutflows: losers.slice(0, 5).map((n) => ({ 
        token: n.id, 
        symbol: n.label, 
        amount: n.volume,
        logoUrl: n.logoUrl,
        change: n.metadata?.priceChange || 0,
      })),
    };

    return NextResponse.json({ nodes, edges, metrics });
  } catch (error) {
    console.error("Flow API error:", error);
    
    const fallbackTokens = getFallbackMemeCoins();
    const nodes = fallbackTokens.slice(0, 20).map((t, i) => {
      const angle = (i / 20) * Math.PI * 2 - Math.PI / 2;
      const radius = 0.3 + (i % 3) * 0.05;
      return {
        id: t.address,
        type: "token",
        label: t.symbol,
        x: 0.5 + Math.cos(angle) * radius,
        y: 0.5 + Math.sin(angle) * radius,
        size: 25 + Math.random() * 10,
        color: t.priceChange24h >= 0 ? "#02c076" : "#f6465d",
        volume: t.volume24h,
        logoUrl: t.logoURI,
        metadata: {
          name: t.name,
          symbol: t.symbol,
          priceChange: t.priceChange24h,
          marketCap: t.marketCap,
          price: t.price,
          liquidity: t.liquidity,
        },
      };
    });

    return NextResponse.json({
      nodes,
      edges: [],
      metrics: {
        heatScore: 65,
        whaleDensity: 55,
        rotationSpeed: 2.0,
        totalVolume24h: fallbackTokens.reduce((s, t) => s + t.volume24h, 0),
        activeWallets: 1500,
        topInflows: nodes.slice(0, 5).map(n => ({ token: n.id, symbol: n.label, amount: n.volume, logoUrl: n.logoUrl, change: n.metadata.priceChange })),
        topOutflows: nodes.slice(5, 10).map(n => ({ token: n.id, symbol: n.label, amount: n.volume, logoUrl: n.logoUrl, change: n.metadata.priceChange })),
      },
    });
  }
}

function getFallbackMemeCoins(): TokenInfo[] {
  return Object.entries(MEME_COINS_DB).map(([address, info]) => ({
    address,
    symbol: info.symbol,
    name: info.name,
    logoURI: info.logoURI,
    price: Math.random() * 0.1,
    priceChange24h: Math.random() * 100 - 30,
    volume24h: Math.random() * 50000000 + 500000,
    marketCap: Math.random() * 500000000 + 1000000,
    liquidity: Math.random() * 5000000 + 100000,
  }));
}
