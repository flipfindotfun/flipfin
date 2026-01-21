import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("wallet_address", wallet)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { wallet, tokenAddress, symbol, name, imageUrl } = await req.json();

  if (!wallet || !tokenAddress) {
    return NextResponse.json({ error: "Wallet and token address are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("favorites")
    .upsert({
      wallet_address: wallet,
      token_address: tokenAddress,
      symbol,
      name,
      image_url: imageUrl,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const tokenAddress = searchParams.get("tokenAddress");

  if (!wallet || !tokenAddress) {
    return NextResponse.json({ error: "Wallet and token address are required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("wallet_address", wallet)
    .eq("token_address", tokenAddress);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
