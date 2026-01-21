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

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("wallet_address", wallet)
    .single();

  if (existingProfile) {
    // Only update referred_by if not set
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

  // Create new profile with referral
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
