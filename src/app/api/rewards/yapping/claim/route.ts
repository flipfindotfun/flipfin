import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  const { wallet } = await request.json();

  if (!wallet) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
  }

  try {
    // 1. Get current twitter_points
    const { data: profile } = await supabase
      .from("profiles")
      .select("twitter_points, total_points, claimed_twitter_points")
      .eq("wallet_address", wallet)
      .single();

    if (!profile || !profile.twitter_points || profile.twitter_points <= 0) {
      return NextResponse.json({ error: "No points to claim" }, { status: 400 });
    }

    const pointsToClaim = Number(profile.twitter_points);
    const newTotalPoints = Number(profile.total_points || 0) + pointsToClaim;
    const newClaimedTwitterPoints = Number(profile.claimed_twitter_points || 0) + pointsToClaim;

    // 2. Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        twitter_points: 0,
        total_points: newTotalPoints,
        claimed_twitter_points: newClaimedTwitterPoints
      })
      .eq("wallet_address", wallet);

    if (updateError) throw updateError;

    // 3. Record transaction
    await supabase.from("points_transactions").insert({
      wallet_address: wallet,
      amount: pointsToClaim,
      type: "reward_task",
      description: "Claimed Yapping points"
    });

    return NextResponse.json({
      message: `Successfully claimed ${pointsToClaim} points!`,
      claimed: pointsToClaim,
      newTotal: newTotalPoints
    });

  } catch (error: any) {
    console.error("Error claiming points:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
