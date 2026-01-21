import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const poolAddress = searchParams.get("pool");

  if (!address && !poolAddress) {
    return NextResponse.json({ error: "Token or pool address is required" }, { status: 400 });
  }

  try {
    let pool = poolAddress;
    
    if (!pool && address) {
      const pairRes = await axios.get(
        `https://api.dexscreener.com/tokens/v1/solana/${address}`,
        { timeout: 10000 }
      );
      const pairs = pairRes.data;
      if (Array.isArray(pairs) && pairs.length > 0) {
        const mainPair = pairs.sort((a: any, b: any) => 
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];
        pool = mainPair.pairAddress;
      }
    }

    if (!pool) {
      return NextResponse.json({ trades: [], error: "Could not find pool address" });
    }

    const geckoRes = await axios.get(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/trades`,
      {
        params: {
          trade_volume_in_usd_greater_than: 0,
        },
        headers: {
          Accept: "application/json",
        },
        timeout: 15000,
      }
    );

    const tradesData = geckoRes.data?.data || [];
    
    const mappedTrades = tradesData.map((trade: any, i: number) => {
      const attrs = trade.attributes || {};
      const isBuy = attrs.kind === "buy";
      
      const blockTimestamp = attrs.block_timestamp 
        ? new Date(attrs.block_timestamp).getTime() / 1000 
        : Date.now() / 1000;
      
      const tokenAmount = isBuy 
        ? parseFloat(attrs.to_token_amount) || 0
        : parseFloat(attrs.from_token_amount) || 0;
      
      const volumeUsd = parseFloat(attrs.volume_in_usd) || 0;
      
      return {
        id: trade.id || i,
        txHash: attrs.tx_hash,
        blockTime: blockTimestamp,
        age: formatAge(blockTimestamp),
        type: isBuy ? "buy" : "sell",
        price: isBuy ? parseFloat(attrs.price_to_in_usd) || 0 : parseFloat(attrs.price_from_in_usd) || 0,
        amount: tokenAmount,
        amountUsd: volumeUsd,
        maker: attrs.tx_from_address ? shortenAddress(attrs.tx_from_address) : "Unknown",
        makerFull: attrs.tx_from_address,
      };
    });

    return NextResponse.json({ 
      trades: mappedTrades,
      source: "geckoterminal",
      pool: pool,
      total: mappedTrades.length 
    });

  } catch (error: any) {
    console.error("GeckoTerminal trades error:", error.response?.data || error.message);
    
    return NextResponse.json({ 
      trades: [],
      error: "Could not fetch trades from GeckoTerminal" 
    });
  }
}

function formatAge(unixTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixTime;
  
  if (diff < 0) return "0s";
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
