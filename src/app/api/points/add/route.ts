import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MIN_VOLUME_FOR_VALIDATION = 50;
const REFERRER_BONUS_POINTS = 30;

export async function POST(req: Request) {
  const { wallet, amount, type, description, volume } = await req.json();

  if (!wallet || !amount) {
    return NextResponse.json({ error: "Wallet and amount are required" }, { status: 400 });
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, referred_by")
      .eq("wallet_address", wallet)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const newVolume = Number(profile.total_volume || 0) + Number(volume || amount);
    
    await supabase
      .from("profiles")
      .update({ 
        total_points: Number(profile.total_points) + Number(amount),
        total_volume: newVolume
      })
      .eq("wallet_address", wallet);

    await supabase.from("points_transactions").insert({
      wallet_address: wallet,
      amount: amount,
      type: type,
      description: description
    });

    const { data: referralRecord } = await supabase
      .from("referrals")
      .select("*")
      .eq("referee_wallet", wallet)
      .eq("status", "pending")
      .single();

    if (referralRecord) {
      await supabase
        .from("referrals")
        .update({ referee_volume: newVolume })
        .eq("id", referralRecord.id);

      if (newVolume >= MIN_VOLUME_FOR_VALIDATION && !referralRecord.referrer_points_awarded) {
        await supabase
          .from("referrals")
          .update({ 
            status: "validated",
            validated_at: new Date().toISOString(),
            referrer_points_awarded: true
          })
          .eq("id", referralRecord.id);

        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("total_points")
          .eq("wallet_address", referralRecord.referrer_wallet)
          .single();

        if (referrerProfile) {
          await supabase
            .from("profiles")
            .update({ total_points: Number(referrerProfile.total_points) + REFERRER_BONUS_POINTS })
            .eq("wallet_address", referralRecord.referrer_wallet);

          await supabase.from("points_transactions").insert({
            wallet_address: referralRecord.referrer_wallet,
            amount: REFERRER_BONUS_POINTS,
            type: "referral_validated",
            source_wallet: wallet,
            description: `Referral validated! ${wallet.slice(0, 4)}...${wallet.slice(-4)} reached $${MIN_VOLUME_FOR_VALIDATION} volume`
          });
        }
      }
    }

    if (profile.referred_by) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("wallet_address, total_points, referred_by")
        .eq("referral_code", profile.referred_by)
        .single();

      if (referrer) {
        const directReferralPoints = Number(amount) * 0.20;
        await supabase
          .from("profiles")
          .update({ total_points: Number(referrer.total_points) + directReferralPoints })
          .eq("wallet_address", referrer.wallet_address);

        await supabase.from("points_transactions").insert({
          wallet_address: referrer.wallet_address,
          amount: directReferralPoints,
          type: "referral_direct",
          source_wallet: wallet,
          description: `Referral bonus from ${wallet.slice(0, 4)}...${wallet.slice(-4)}`
        });

        if (referrer.referred_by) {
          const { data: grandReferrer } = await supabase
            .from("profiles")
            .select("wallet_address, total_points")
            .eq("referral_code", referrer.referred_by)
            .single();

          if (grandReferrer) {
            const indirectReferralPoints = Number(amount) * 0.05;
            await supabase
              .from("profiles")
              .update({ total_points: Number(grandReferrer.total_points) + indirectReferralPoints })
              .eq("wallet_address", grandReferrer.wallet_address);

            await supabase.from("points_transactions").insert({
              wallet_address: grandReferrer.wallet_address,
              amount: indirectReferralPoints,
              type: "referral_indirect",
              source_wallet: wallet,
              description: `Indirect referral bonus (level 2) from ${wallet.slice(0, 4)}...${wallet.slice(-4)}`
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
