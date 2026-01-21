import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "flipfin-admin-secret-key-2024"
);

async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [
      { count: usersCount },
      { count: tradesCount },
      { data: recentUsers },
      { data: topTraders },
      { data: volumeData },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("user_trades").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("wallet_address, created_at, total_points, total_volume")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("profiles")
        .select("wallet_address, total_points, total_volume")
        .order("total_volume", { ascending: false })
        .limit(10),
      supabase
        .from("profiles")
        .select("total_volume")
    ]);

    const totalVolume = volumeData?.reduce((sum, p) => sum + (p.total_volume || 0), 0) || 0;

    return NextResponse.json({
      stats: {
        totalUsers: usersCount || 0,
        totalTrades: tradesCount || 0,
        totalVolume,
      },
      recentUsers: recentUsers || [],
      topTraders: topTraders || [],
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
