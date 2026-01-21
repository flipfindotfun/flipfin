import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const limit = parseInt(searchParams.get("limit") || "30");

  if (!address) {
    return NextResponse.json({ error: "Token address is required" }, { status: 400 });
  }

  if (HELIUS_API_KEY) {
    try {
      const response = await axios.get(
        `https://api.helius.xyz/v0/addresses/${address}/transactions`,
        {
          params: {
            "api-key": HELIUS_API_KEY,
            type: "SWAP",
            limit: Math.min(limit, 50),
          },
          timeout: 15000,
        }
      );

      const txs = response.data || [];
      
      const mappedTrades = txs.map((tx: any, i: number) => {
        const tokenTransfers = tx.tokenTransfers || [];
        const nativeTransfers = tx.nativeTransfers || [];
        
        const tokenTransfer = tokenTransfers.find((t: any) => t.mint === address);
        const solTransfer = nativeTransfers.find((t: any) => Math.abs(t.amount) > 0);
        
        const isBuy = tokenTransfer?.toUserAccount && tokenTransfers.some((t: any) => 
          t.mint === address && t.toUserAccount
        );
        
        const tokenAmount = Math.abs(tokenTransfer?.tokenAmount || 0);
        const solAmount = Math.abs((solTransfer?.amount || 0) / 1e9);
        
        return {
          id: tx.signature || i,
          txHash: tx.signature,
          blockTime: tx.timestamp,
          age: formatAge(tx.timestamp),
          type: isBuy ? "buy" : "sell",
          price: tokenAmount > 0 ? (solAmount / tokenAmount) : 0,
          amount: tokenAmount,
          amountUsd: solAmount * 240,
          mcap: "-",
          maker: tx.feePayer ? shortenAddress(tx.feePayer) : "Unknown",
          makerFull: tx.feePayer,
        };
      }).filter((t: any) => t.amount > 0);

      return NextResponse.json({ 
        trades: mappedTrades,
        source: "helius",
        total: mappedTrades.length 
      });
    } catch (error: any) {
      console.error("Helius trades error:", error.response?.data || error.message);
    }
  }

  if (BIRDEYE_API_KEY) {
    try {
      const response = await axios.get(
        `https://public-api.birdeye.so/defi/txs/token`,
        {
          params: {
            address: address,
            tx_type: "swap",
            limit: limit,
          },
          headers: {
            "X-API-KEY": BIRDEYE_API_KEY,
            "x-chain": "solana",
          },
          timeout: 10000,
        }
      );

      const trades = response.data?.data?.items || [];
      
      const mappedTrades = trades.map((t: any, i: number) => ({
        id: t.txHash || i,
        txHash: t.txHash,
        blockTime: t.blockUnixTime,
        age: formatAge(t.blockUnixTime),
        type: t.side?.toLowerCase() || (t.from?.symbol === "SOL" ? "buy" : "sell"),
        price: t.price || 0,
        amount: t.amount || 0,
        amountUsd: t.volumeUSD || 0,
        mcap: formatNumber(t.mc || 0),
        maker: t.owner ? shortenAddress(t.owner) : "Unknown",
        makerFull: t.owner,
      }));

      return NextResponse.json({ 
        trades: mappedTrades,
        source: "birdeye",
        total: trades.length 
      });
    } catch (error: any) {
      console.error("Birdeye trades error:", error.response?.data || error.message);
    }
  }

  try {
    const pairRes = await axios.get(
      `https://api.dexscreener.com/tokens/v1/solana/${address}`,
      { timeout: 10000 }
    );

    const pairs = pairRes.data;
    if (Array.isArray(pairs) && pairs.length > 0) {
      const mainPair = pairs.sort((a: any, b: any) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      )[0];

      const currentPrice = parseFloat(mainPair.priceUsd) || 0;
      
      return NextResponse.json({
        trades: [],
        pairInfo: {
          price: currentPrice,
          priceChange24h: mainPair.priceChange?.h24 || 0,
          volume24h: mainPair.volume?.h24 || 0,
          liquidity: mainPair.liquidity?.usd || 0,
        },
        source: "dexscreener",
        message: "Real-time trades require Helius/Birdeye API"
      });
    }
  } catch (error: any) {
    console.error("DexScreener error:", error.message);
  }

  return NextResponse.json({ 
    trades: [],
    error: "Could not fetch trades" 
  });
}

function formatAge(unixTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixTime;
  
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
