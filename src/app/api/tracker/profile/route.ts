import { NextRequest, NextResponse } from "next/server";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
  }

  try {
    // Fetch PnL and Win Rate from Birdeye
    const response = await fetch(
      `https://public-api.birdeye.so/wallet/v2/pnl/summary?wallet=${wallet}`,
      {
        headers: {
          "X-API-KEY": BIRDEYE_API_KEY || "",
          "x-chain": "solana"
        }
      }
    );

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json({ 
        error: data.message || "Failed to fetch profile stats",
        stats: {
          winRate: 0,
          totalPnlUsd: 0,
          realizedPnlUsd: 0,
          unrealizedPnlUsd: 0,
          totalTrades: 0,
          winCount: 0,
          lossCount: 0
        }
      });
    }

    const stats = {
      winRate: data.data?.insights?.counts?.win_rate || 0,
      totalPnlUsd: data.data?.pnl?.total_usd || 0,
      realizedPnlUsd: data.data?.pnl?.realized_profit_usd || 0,
      unrealizedPnlUsd: data.data?.pnl?.unrealized_usd || 0,
      totalTrades: (data.data?.insights?.counts?.total_win || 0) + (data.data?.insights?.counts?.total_loss || 0),
      winCount: data.data?.insights?.counts?.total_win || 0,
      lossCount: data.data?.insights?.counts?.total_loss || 0,
    };

    return NextResponse.json({ stats });
  } catch (err) {
    console.error("Error fetching wallet profile:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
