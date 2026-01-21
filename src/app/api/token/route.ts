import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const BIRDEYE_API_URL = "https://public-api.birdeye.so";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Token address required" }, { status: 400 });
  }

  try {
    const [tokenInfo, security, price] = await Promise.all([
      fetchTokenInfo(address),
      fetchTokenSecurity(address),
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
