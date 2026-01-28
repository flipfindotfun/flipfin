import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Connection, PublicKey } from "@solana/web3.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FLIP_CA = "DUkYuJ1gxHSuYh1Dky3CaGtawLCDWsqx7KVgLwCtpump";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const connection = new Connection(RPC_URL);

async function getFlipBalance(walletAddress: string) {
  try {
    const pubkey = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      mint: new PublicKey(FLIP_CA)
    });

    if (tokenAccounts.value.length === 0) return 0;
    return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
  } catch (err) {
    console.error("Error fetching balance:", err);
    return 0;
  }
}

export async function POST(req: Request) {
  try {
    const { proposal_id, wallet_address, choice } = await req.json();

    if (!proposal_id || !wallet_address || !choice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const balance = await getFlipBalance(wallet_address);

    if (balance <= 0) {
      return NextResponse.json({ error: "You must hold $FLIP to vote" }, { status: 403 });
    }

    // Upsert vote
    const { error } = await supabase
      .from("votes")
      .upsert({
        proposal_id,
        voter_address: wallet_address,
        choice,
        weight: balance,
        created_at: new Date().toISOString()
      }, {
        onConflict: "proposal_id, voter_address"
      });

    if (error) throw error;

    return NextResponse.json({ success: true, weight: balance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
