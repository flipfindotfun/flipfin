import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const BIRDEYE_API_URL = "https://public-api.birdeye.so";
const GECKO_API_URL = "https://api.geckoterminal.com/api/v2";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Token address required" }, { status: 400 });
  }

  try {
    const [geckoData, security] = await Promise.all([
      fetchGeckoTerminal(address),
      fetchTokenSecurity(address),
    ]);

    if (geckoData) {
      return NextResponse.json({
        success: true,
        data: {
          ...geckoData,
          security,
        },
      });
    }

    const [tokenInfo, price] = await Promise.all([
      fetchTokenInfo(address),
      fetchTokenPrice(address),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...tokenInfo,
        security,
        price,
      },
    });
  } catch (error) {
    console.error("Error fetching token data:", error);
    return NextResponse.json(
      { error: "Failed to fetch token data" },
      { status: 500 }
    );
  }
}

async function fetchGeckoTerminal(address: string) {
  try {
    const response = await axios.get(
      `${GECKO_API_URL}/networks/solana/tokens/${address}`,
      {
        params: {
          include: "top_pools",
          include_composition: false,
          include_inactive_source: false,
        },
        headers: {
          accept: "application/json",
        },
        timeout: 10000,
      }
    );

    const data = response.data?.data;
    const pools = response.data?.included || [];
    const topPool = pools[0]?.attributes;

    if (!data?.attributes) return null;

    const attrs = data.attributes;
    const priceChanges = topPool?.price_change_percentage || {};
    const txns = topPool?.transactions || {};
    const volume = topPool?.volume_usd || {};

    return {
      address: attrs.address,
      name: attrs.name,
      symbol: attrs.symbol,
      decimals: attrs.decimals,
      logoURI: attrs.image_url,
      price: parseFloat(attrs.price_usd) || 0,
      priceUsd: attrs.price_usd,
      fdv: parseFloat(attrs.fdv_usd) || 0,
      mc: attrs.market_cap_usd ? parseFloat(attrs.market_cap_usd) : null,
      liquidity: parseFloat(attrs.total_reserve_in_usd) || 0,
      v24hUSD: parseFloat(volume.h24) || 0,
      v24hChangePercent: null,
      priceChange1m: parseFloat(priceChanges.m5) || 0,
      priceChange5m: parseFloat(priceChanges.m5) || 0,
      priceChange15m: parseFloat(priceChanges.m15) || 0,
      priceChange30m: parseFloat(priceChanges.m30) || 0,
      priceChange1h: parseFloat(priceChanges.h1) || 0,
      priceChange6h: parseFloat(priceChanges.h6) || 0,
      priceChange24h: parseFloat(priceChanges.h24) || 0,
      buy1h: txns.h1?.buys || 0,
      sell1h: txns.h1?.sells || 0,
      buy24h: txns.h24?.buys || 0,
      sell24h: txns.h24?.sells || 0,
      uniqueWallet24h: (txns.h24?.buyers || 0) + (txns.h24?.sellers || 0),
      totalSupply: attrs.normalized_total_supply,
      launchpad: attrs.launchpad_details,
      topPools: pools.map((p: any) => ({
        address: p.attributes?.address,
        name: p.attributes?.name,
        dex: p.relationships?.dex?.data?.id,
        liquidity: parseFloat(p.attributes?.reserve_in_usd) || 0,
        volume24h: parseFloat(p.attributes?.volume_usd?.h24) || 0,
      })),
      source: "geckoterminal",
    };
  } catch (error) {
    console.error("GeckoTerminal fetch error:", error);
    return null;
  }
}

async function fetchTokenInfo(address: string) {
  try {
    const response = await axios.get(
      `${BIRDEYE_API_URL}/defi/token_overview`,
      {
        params: { address },
        headers: {
          accept: "application/json",
          "X-API-KEY": BIRDEYE_API_KEY,
        },
        timeout: 10000,
      }
    );
    return response.data?.data || null;
  } catch {
    return null;
  }
}

async function fetchTokenSecurity(address: string) {
  try {
    const response = await axios.get(
      `${BIRDEYE_API_URL}/defi/token_security`,
      {
        params: { address },
        headers: {
          accept: "application/json",
          "X-API-KEY": BIRDEYE_API_KEY,
        },
        timeout: 10000,
      }
    );
    return response.data?.data || null;
  } catch {
    return null;
  }
}

async function fetchTokenPrice(address: string) {
  try {
    const response = await axios.get(
      `${BIRDEYE_API_URL}/defi/price`,
      {
        params: { address },
        headers: {
          accept: "application/json",
          "X-API-KEY": BIRDEYE_API_KEY,
        },
        timeout: 10000,
      }
    );
    return response.data?.data || null;
  } catch {
    return null;
  }
}
