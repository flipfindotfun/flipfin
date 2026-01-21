import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
  }

  // Get profile
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("wallet_address", wallet)
    .single();

  // If no profile, create one
  if (!profile && !error) {
    const referralCode = nanoid(8);
    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        wallet_address: wallet,
        referral_code: referralCode,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    profile = newProfile;
  } else if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If still no profile, it might be the case where it was just created or there's an issue
  if (!profile) {
     const referralCode = nanoid(8);
     const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        wallet_address: wallet,
        referral_code: referralCode,
      })
      .select()
      .single();
      
      if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });
      profile = newProfile;
  }

  // Get referral count
  const { count: referralCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("referred_by", profile.referral_code);

  return NextResponse.json({
    ...profile,
    referral_count: referralCount || 0,
  });
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  
  const { wallet, referredBy } = body;

  if (!wallet) {
    return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("wallet_address", wallet)
    .single();

  if (existingProfile) {
    if (!existingProfile.referred_by && referredBy && referredBy !== existingProfile.referral_code) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ referred_by: referredBy })
        .eq("wallet_address", wallet);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ ...existingProfile, referred_by: referredBy });
    }
    return NextResponse.json(existingProfile);
  }

  const referralCode = nanoid(8);
  const { data: newProfile, error: createError } = await supabase
    .from("profiles")
    .insert({
      wallet_address: wallet,
      referral_code: referralCode,
      referred_by: referredBy || null,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json(newProfile);
}

export async function PUT(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  
  const { wallet, newReferralCode } = body;

  if (!wallet || !newReferralCode) {
    return NextResponse.json({ error: "Wallet and new referral code required" }, { status: 400 });
  }

  if (newReferralCode.length < 4 || newReferralCode.length > 12) {
    return NextResponse.json({ error: "Referral code must be 4-12 characters" }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9]+$/.test(newReferralCode)) {
    return NextResponse.json({ error: "Referral code must be alphanumeric only" }, { status: 400 });
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("wallet_address", wallet)
    .single();

  if (!existingProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (existingProfile.referral_code_changed_at) {
    return NextResponse.json({ error: "You can only change your referral code once" }, { status: 400 });
  }

  const { data: codeExists } = await supabase
    .from("profiles")
    .select("wallet_address")
    .ilike("referral_code", newReferralCode)
    .single();

  if (codeExists) {
    return NextResponse.json({ error: "This referral code is already taken" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ 
      referral_code: newReferralCode,
      referral_code_changed_at: new Date().toISOString()
    })
    .eq("wallet_address", wallet);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    message: "Referral code updated successfully",
    referral_code: newReferralCode
  });
}
