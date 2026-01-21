import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Token address is required" }, { status: 400 });
  }

  if (!BIRDEYE_API_KEY) {
    return NextResponse.json({ error: "Birdeye API key not configured" }, { status: 500 });
  }

  try {
    const response = await axios.get(
      `https://public-api.birdeye.so/defi/token_security?address=${address}`,
      {
        headers: {
          "X-API-KEY": BIRDEYE_API_KEY,
          "x-chain": "solana"
        },
        timeout: 10000
      }
    );

    const data = response.data?.data;

    if (!data) {
      return NextResponse.json({ error: "No security data found" }, { status: 404 });
    }

    // Map Birdeye security data to our format
    const security = {
      score: data.renounced ? 90 : 50, // Simplified score logic
      isHoneypot: data.is_honeypot || false,
      isMintable: data.mintable || false,
      isFreezable: data.freezeable || false,
      ownershipRenounced: data.renounced || false,
      liquidityLocked: data.lp_burned || false,
      topHolderPercent: data.top_holders ? data.top_holders.reduce((acc: number, h: any) => acc + h.percent, 0) : 0,
      buyTax: data.buy_tax || 0,
      sellTax: data.sell_tax || 0,
    };

    return NextResponse.json({
      success: true,
      security,
      raw: data
    });
  } catch (error: any) {
    console.error("Error fetching security data:", error.response?.data || error.message);
    return NextResponse.json(
      { error: "Failed to fetch security data" },
      { status: 500 }
    );
  }
}
