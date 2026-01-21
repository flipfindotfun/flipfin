import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

export async function GET(request: NextRequest) {
  const userWallet = request.nextUrl.searchParams.get("userWallet");

  if (!userWallet) {
    return NextResponse.json({ error: "User wallet required" }, { status: 400 });
  }

  const { data: trackedWallets, error } = await supabase
    .from("tracked_wallets")
    .select("*")
    .eq("user_wallet", userWallet)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const walletsWithActivity = await Promise.all(
    (trackedWallets || []).map(async (wallet) => {
      const activity = await fetchWalletActivity(wallet.tracked_wallet);
      return { ...wallet, recentActivity: activity };
    })
  );

  return NextResponse.json({ wallets: walletsWithActivity });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userWallet, trackedWallet, label, isCopyTrading } = body;

  if (!userWallet || !trackedWallet) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tracked_wallets")
    .upsert({
      user_wallet: userWallet,
      tracked_wallet: trackedWallet,
      label: label || null,
      is_copy_trading: isCopyTrading || false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_wallet,tracked_wallet" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ wallet: data });
}

export async function DELETE(request: NextRequest) {
  const userWallet = request.nextUrl.searchParams.get("userWallet");
  const trackedWallet = request.nextUrl.searchParams.get("trackedWallet");

  if (!userWallet || !trackedWallet) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabase
    .from("tracked_wallets")
    .delete()
    .eq("user_wallet", userWallet)
    .eq("tracked_wallet", trackedWallet);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function fetchTokenMetadata(mints: string[]): Promise<Map<string, { symbol: string; image?: string }>> {
  const dataMap = new Map<string, { symbol: string; image?: string }>();
  if (!mints.length) return dataMap;
  
  try {
    const mintString = mints.slice(0, 30).join(",");
    const response = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mintString}`);
    const pairs = await response.json();
    
    if (Array.isArray(pairs)) {
      pairs.forEach((pair: any) => {
        if (pair.baseToken && !dataMap.has(pair.baseToken.address)) {
          dataMap.set(pair.baseToken.address, {
            symbol: pair.baseToken.symbol,
            image: pair.info?.imageUrl,
          });
        }
      });
    }
  } catch (err) {
    console.error("Error fetching token metadata:", err);
  }
  
  return dataMap;
}

async function fetchWalletActivity(wallet: string) {
  try {
    const url = `https://api.helius.xyz/v0/addresses/${wallet}/transactions?api-key=${HELIUS_API_KEY}&type=SWAP&limit=10`;
    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data)) return [];

    const activities = data.slice(0, 5).map((tx: any) => {
      const tokenTransfer = tx.tokenTransfers?.find((t: any) => 
        t.mint !== "So11111111111111111111111111111111111111112"
      );
      const isBuy = tokenTransfer?.toUserAccount === wallet;

      return {
        signature: tx.signature,
        timestamp: tx.timestamp * 1000,
        type: isBuy ? "buy" : "sell",
        tokenMint: tokenTransfer?.mint,
        tokenSymbol: "",
        tokenImage: "",
        tokenAmount: Math.abs(tokenTransfer?.tokenAmount || 0),
      };
    });

    const uniqueMints = [...new Set(activities.map(a => a.tokenMint).filter(Boolean))] as string[];
    const tokenDataMap = await fetchTokenMetadata(uniqueMints);

    return activities.map(activity => {
      const tokenData = tokenDataMap.get(activity.tokenMint);
      return {
        ...activity,
        tokenSymbol: tokenData?.symbol || activity.tokenMint?.slice(0, 6) || "Unknown",
        tokenImage: tokenData?.image || "",
      };
    });
  } catch (err) {
    console.error("Error fetching wallet activity:", err);
    return [];
  }
}
