import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLATFORM_FEE_BPS = 50;

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, tx_hash, input_amount, output_amount, input_token, output_token, side } = await request.json();

    if (!wallet_address || !tx_hash) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const feeAmount = (Number(input_amount) * PLATFORM_FEE_BPS) / 10000;
    const feeInSol = input_token === "SOL" ? feeAmount : 0;

    const { data: trade, error: tradeError } = await supabase
      .from("user_trades")
      .insert({
        wallet_address,
        token_address: side === "buy" ? output_token : input_token,
        token_symbol: side === "buy" ? output_token : input_token,
        side,
        amount: side === "buy" ? output_amount : input_amount,
        price: 0,
        tx_hash,
      })
      .select()
      .single();

    if (tradeError) {
      console.error("Trade insert error:", tradeError);
    }

    if (feeInSol > 0 || feeAmount > 0) {
      const { error: feeError } = await supabase.from("collected_fees").insert({
        wallet_address,
        fee_amount: feeInSol > 0 ? feeInSol : feeAmount,
        fee_token: feeInSol > 0 ? "SOL" : input_token,
        trade_id: trade?.id || null,
        status: "pending",
      });

      if (feeError) {
        console.error("Fee record error:", feeError);
      }
    }

    const { error: profileError } = await supabase.rpc("increment_profile_stats", {
      p_wallet: wallet_address,
      p_points: 10,
      p_volume: Number(input_amount) || 0,
    });

    if (profileError) {
      await supabase
        .from("profiles")
        .update({
          total_points: supabase.rpc("coalesce", { value: "total_points", default_val: 0 }),
          total_volume: supabase.rpc("coalesce", { value: "total_volume", default_val: 0 }),
        })
        .eq("wallet_address", wallet_address);
    }

    await supabase.from("system_logs").insert({
      level: "info",
      message: `Trade confirmed: ${side} ${input_amount} ${input_token} -> ${output_amount} ${output_token}`,
      metadata: { wallet_address, tx_hash, fee: feeAmount },
      source: "trade-confirm",
    });

    return NextResponse.json({
      success: true,
      trade_id: trade?.id,
      fee_recorded: feeAmount > 0,
    });
  } catch (error: any) {
    console.error("Trade confirm error:", error);

    await supabase.from("system_logs").insert({
      level: "error",
      message: `Trade confirm failed: ${error.message}`,
      metadata: { error: error.message },
      source: "trade-confirm",
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
