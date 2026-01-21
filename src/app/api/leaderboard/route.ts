import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "points";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    if (type === "points") {
      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_address, total_points, total_volume, created_at")
        .order("total_points", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const leaderboard = (data || []).map((item, idx) => ({
        rank: idx + 1,
        wallet: item.wallet_address,
        points: item.total_points || 0,
        volume: item.total_volume || 0,
        joinedAt: item.created_at,
      }));

      return NextResponse.json({ leaderboard, type: "points" });
    }

    if (type === "volume") {
      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_address, total_points, total_volume, created_at")
        .order("total_volume", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const leaderboard = (data || []).map((item, idx) => ({
        rank: idx + 1,
        wallet: item.wallet_address,
        points: item.total_points || 0,
        volume: item.total_volume || 0,
        joinedAt: item.created_at,
      }));

      return NextResponse.json({ leaderboard, type: "volume" });
    }

    if (type === "profit") {
      const { data, error } = await supabase
        .from("leaderboards")
        .select("*")
        .order("total_profit", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const leaderboard = (data || []).map((item, idx) => ({
        rank: idx + 1,
        wallet: item.wallet_address,
        username: item.username,
        profit: item.total_profit || 0,
        winRate: item.win_rate || 0,
        tradesCount: item.trades_count || 0,
        lastTradeAt: item.last_trade_at,
      }));

      return NextResponse.json({ leaderboard, type: "profit" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
