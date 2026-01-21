import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Token address required" }, { status: 400 });
  }

  try {
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { timeout: 10000 }
    );

    const pairs = response.data?.pairs || [];
    const solanaPairs = pairs.filter((p: { chainId: string }) => p.chainId === "solana");

    if (solanaPairs.length === 0) {
      return NextResponse.json({ error: "No pairs found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: solanaPairs[0],
      allPairs: solanaPairs,
    });
  } catch (error) {
    console.error("Dexscreener API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch token data" },
      { status: 500 }
    );
  }
}
