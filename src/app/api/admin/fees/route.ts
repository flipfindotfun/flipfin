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

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  try {
    let query = supabase
      .from("collected_fees")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: fees, error } = await query.limit(100);
    if (error) throw error;

    const { data: pendingSum } = await supabase
      .from("collected_fees")
      .select("fee_amount")
      .eq("status", "pending");

    const { data: collectedSum } = await supabase
      .from("collected_fees")
      .select("fee_amount")
      .eq("status", "collected");

    const pendingTotal = (pendingSum || []).reduce((sum, f) => sum + Number(f.fee_amount), 0);
    const collectedTotal = (collectedSum || []).reduce((sum, f) => sum + Number(f.fee_amount), 0);

      return NextResponse.json({
        fees: fees || [],
        summary: {
          pendingTotal,
          collectedTotal,
          pendingCount: (pendingSum || []).length,
          collectedCount: (collectedSum || []).length,
          feeWallet: process.env.FEE_WALLET_ADDRESS || "Not configured",
        },
      });
  } catch (error: any) {
    console.error("Fees fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, fee_amount, fee_token, trade_id } = await request.json();

    if (!wallet_address || !fee_amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("collected_fees")
      .insert({
        wallet_address,
        fee_amount,
        fee_token: fee_token || "SOL",
        trade_id: trade_id || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, fee: data });
  } catch (error: any) {
    console.error("Fee record error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, fee_ids, tx_hash } = await request.json();

    if (action === "collect") {
      if (!fee_ids || !Array.isArray(fee_ids) || fee_ids.length === 0) {
        return NextResponse.json({ error: "No fees selected" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("collected_fees")
        .update({
          status: "collected",
          collected_at: new Date().toISOString(),
          tx_hash: tx_hash || null,
        })
        .in("id", fee_ids)
        .eq("status", "pending")
        .select();

      if (error) throw error;

      await supabase.from("system_logs").insert({
        level: "info",
        message: `Admin collected ${data?.length || 0} fees`,
        metadata: { fee_ids, tx_hash, admin_email: admin.email },
        source: "admin-fees",
      });

      return NextResponse.json({ success: true, collected: data?.length || 0 });
    }

    if (action === "collect_all") {
      const { data: pendingFees } = await supabase
        .from("collected_fees")
        .select("id")
        .eq("status", "pending");

      if (!pendingFees || pendingFees.length === 0) {
        return NextResponse.json({ error: "No pending fees" }, { status: 400 });
      }

      const ids = pendingFees.map((f) => f.id);

      const { data, error } = await supabase
        .from("collected_fees")
        .update({
          status: "collected",
          collected_at: new Date().toISOString(),
          tx_hash: tx_hash || null,
        })
        .in("id", ids)
        .select();

      if (error) throw error;

      await supabase.from("system_logs").insert({
        level: "info",
        message: `Admin collected all ${data?.length || 0} pending fees`,
        metadata: { count: data?.length, tx_hash, admin_email: admin.email },
        source: "admin-fees",
      });

      return NextResponse.json({ success: true, collected: data?.length || 0 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Fee collection error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
