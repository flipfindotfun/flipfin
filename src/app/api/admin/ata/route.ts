import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const ADMIN_TOKEN_COOKIE = "admin_token";
const FEE_WALLET = process.env.FEE_WALLET_ADDRESS;

async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_TOKEN_COOKIE)?.value === "authenticated";
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mintAddress = searchParams.get("mint");

  if (!FEE_WALLET) {
    return NextResponse.json({ error: "Fee wallet not configured" }, { status: 500 });
  }

  if (!mintAddress) {
    return NextResponse.json({ error: "Mint address required" }, { status: 400 });
  }

  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com"
    );

    const mint = new PublicKey(mintAddress);
    const owner = new PublicKey(FEE_WALLET);

    const ata = getAssociatedTokenAddressSync(
      mint,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    let exists = false;
    let balance = "0";

    try {
      const account = await getAccount(connection, ata);
      exists = true;
      balance = account.amount.toString();
    } catch {
      exists = false;
    }

    return NextResponse.json({
      mint: mintAddress,
      ata: ata.toBase58(),
      owner: FEE_WALLET,
      exists,
      balance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!FEE_WALLET) {
    return NextResponse.json({ error: "Fee wallet not configured" }, { status: 500 });
  }

  try {
    const { mintAddress } = await request.json();

    if (!mintAddress) {
      return NextResponse.json({ error: "Mint address required" }, { status: 400 });
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com"
    );

    const mint = new PublicKey(mintAddress);
    const owner = new PublicKey(FEE_WALLET);

    const ata = getAssociatedTokenAddressSync(
      mint,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    let exists = false;
    try {
      await getAccount(connection, ata);
      exists = true;
    } catch {
      exists = false;
    }

    if (exists) {
      return NextResponse.json({
        success: true,
        message: "ATA already exists",
        ata: ata.toBase58(),
        alreadyExists: true,
      });
    }

    const { createAssociatedTokenAccountInstruction } = await import("@solana/spl-token");
    
    const instruction = createAssociatedTokenAccountInstruction(
      owner,
      ata,
      owner,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: owner,
    }).add(instruction);

    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return NextResponse.json({
      success: true,
      ata: ata.toBase58(),
      transaction: Buffer.from(serializedTx).toString("base64"),
      message: "Transaction created. Sign with your wallet to create ATA.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
