import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MIN_VOLUME_FOR_VALIDATION = 50;
const REFEREE_BONUS_POINTS = 20;
const REFERRER_BONUS_POINTS = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  }

  try {
    const { data: referrals } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_wallet", wallet);

    const { data: myReferral } = await supabase
      .from("referrals")
      .select("*")
      .eq("referee_wallet", wallet)
      .single();

    const pendingCount = referrals?.filter(r => r.status === "pending").length || 0;
    const validatedCount = referrals?.filter(r => r.status === "validated").length || 0;

    return NextResponse.json({
      referrals: referrals || [],
      myReferral,
      stats: {
        total: referrals?.length || 0,
        pending: pendingCount,
        validated: validatedCount
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { wallet, referralCode } = await req.json();

  if (!wallet || !referralCode) {
    return NextResponse.json({ error: "Wallet and referral code required" }, { status: 400 });
  }

  try {
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("*")
      .eq("referee_wallet", wallet)
      .single();

    if (existingReferral) {
      return NextResponse.json({ error: "You have already used a referral code" }, { status: 400 });
    }

    const { data: referrer } = await supabase
      .from("profiles")
      .select("wallet_address, referral_code")
      .ilike("referral_code", referralCode)
      .single();

    if (!referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    if (referrer.wallet_address === wallet) {
      return NextResponse.json({ error: "You cannot use your own referral code" }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from("referrals")
      .insert({
        referrer_wallet: referrer.wallet_address,
        referee_wallet: wallet,
        status: "pending",
        referee_volume: 0,
        referrer_points_awarded: false,
        referee_points_awarded: false
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await supabase
      .from("profiles")
      .update({ referred_by: referrer.referral_code })
      .eq("wallet_address", wallet);

    const { data: refereeProfile } = await supabase
      .from("profiles")
      .select("total_points")
      .eq("wallet_address", wallet)
      .single();

    await supabase
      .from("profiles")
      .update({ total_points: Number(refereeProfile?.total_points || 0) + REFEREE_BONUS_POINTS })
      .eq("wallet_address", wallet);

    await supabase.from("points_transactions").insert({
      wallet_address: wallet,
      amount: REFEREE_BONUS_POINTS,
      type: "referral_signup",
      description: "Bonus points for using a referral code"
    });

    await supabase
      .from("referrals")
      .update({ referee_points_awarded: true })
      .eq("referee_wallet", wallet);

    return NextResponse.json({ 
      success: true, 
      message: `Referral code applied! You earned ${REFEREE_BONUS_POINTS} bonus points.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
