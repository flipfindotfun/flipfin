import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Connection, PublicKey } from "@solana/web3.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FLIP_CA = "DUkYuJ1gxHSuYh1Dky3CaGtawLCDWsqx7KVgLwCtpump";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const connection = new Connection(RPC_URL);

const MIN_FLIP_FOR_PROPOSAL = 10000; // 10k FLIP to create a proposal

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
    const { title, description, wallet_address, duration_days } = await req.json();

    if (!title || !wallet_address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const balance = await getFlipBalance(wallet_address);

    if (balance < MIN_FLIP_FOR_PROPOSAL) {
      return NextResponse.json({ 
        error: `You need at least ${MIN_FLIP_FOR_PROPOSAL.toLocaleString()} $FLIP to create a proposal` 
      }, { status: 403 });
    }

    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + (duration_days || 7));

    const { data, error } = await supabase
      .from("proposals")
      .insert({
        title,
        description,
        creator_address: wallet_address,
        ends_at: endsAt.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
