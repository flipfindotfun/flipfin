import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const JUPITER_ULTRA_API = "https://api.jup.ag/ultra/v1";
const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY;
const REFERRAL_FEE_BPS = 50;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signedTransaction, requestId, walletAddress, inputAmount, outputAmount, inputMint, outputMint } = body;

    if (!signedTransaction || !requestId) {
      return NextResponse.json(
        { error: "signedTransaction and requestId are required" },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json",
    };
    
    if (JUPITER_API_KEY) {
      headers["x-api-key"] = JUPITER_API_KEY;
    }

    console.log("Executing Jupiter Ultra swap, requestId:", requestId);

    const response = await fetch(`${JUPITER_ULTRA_API}/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        signedTransaction,
        requestId,
      }),
    });

    const data = await response.json();

    console.log("Jupiter Ultra execute response:", JSON.stringify(data));

    if (data.status === "Failed") {
      console.error("Jupiter swap failed:", data);
      return NextResponse.json({ error: data.error || "Swap failed" }, { status: 400 });
    }

    if (data.status === "Success" && walletAddress && outputAmount) {
      try {
        const SOL_MINT = "So11111111111111111111111111111111111111112";
        const isOutputSol = outputMint === SOL_MINT;
        const outputAmountNum = Number(outputAmount);
        const feeAmount = (outputAmountNum * REFERRAL_FEE_BPS) / 10000;
        const feeToken = isOutputSol ? "SOL" : outputMint?.slice(0, 8) || "TOKEN";
        const decimals = isOutputSol ? 9 : 6;
        const feeInToken = feeAmount / Math.pow(10, decimals);

        await supabase.from("collected_fees").insert({
          wallet_address: walletAddress,
          fee_amount: feeInToken,
          fee_token: feeToken,
          status: "collected",
          collected_at: new Date().toISOString(),
          tx_hash: data.signature || null,
        });

        console.log(`Fee recorded: ${feeInToken} ${feeToken} from ${walletAddress}`);
      } catch (feeErr) {
        console.error("Failed to record fee:", feeErr);
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Jupiter swap error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute swap" },
      { status: 500 }
    );
  }
}
