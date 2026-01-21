import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const userWallet = request.nextUrl.searchParams.get("userWallet");

  if (!userWallet) {
    return NextResponse.json({ error: "User wallet required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("copy_trade_settings")
    .select("*")
    .eq("user_wallet", userWallet)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const defaultSettings = {
    enabled: false,
    max_sol_per_trade: 0.1,
    copy_percentage: 100,
    min_sol_balance: 0.05,
    max_slippage: 15,
    only_buys: true,
    auto_sell: false,
    blacklisted_tokens: [],
    priority_fee: 0.001,
    delay_seconds: 0,
    stop_loss_percent: 50,
    take_profit_percent: 100,
  };

  return NextResponse.json({ settings: data || defaultSettings });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userWallet, settings } = body;

  if (!userWallet) {
    return NextResponse.json({ error: "User wallet required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("copy_trade_settings")
    .upsert({
      user_wallet: userWallet,
      enabled: settings.enabled ?? false,
      max_sol_per_trade: settings.max_sol_per_trade ?? 0.1,
      copy_percentage: settings.copy_percentage ?? 100,
      min_sol_balance: settings.min_sol_balance ?? 0.05,
      max_slippage: settings.max_slippage ?? 15,
      only_buys: settings.only_buys ?? true,
      auto_sell: settings.auto_sell ?? false,
      blacklisted_tokens: settings.blacklisted_tokens ?? [],
      priority_fee: settings.priority_fee ?? 0.001,
      delay_seconds: settings.delay_seconds ?? 0,
      stop_loss_percent: settings.stop_loss_percent ?? 50,
      take_profit_percent: settings.take_profit_percent ?? 100,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_wallet" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
