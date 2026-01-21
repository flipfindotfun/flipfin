import { NextRequest, NextResponse } from "next/server";

const JUPITER_API_BASE = "https://public.jupiterapi.com";
const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY;
const FEE_ACCOUNT = "822nLMadem89qc3dyXrKkarrvKPxV1hZyDZokAQ3Z1FX";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteResponse, userPublicKey } = body;

    if (!quoteResponse || !userPublicKey) {
      return NextResponse.json(
        { error: "quoteResponse and userPublicKey are required" },
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

      const swapRequestBody: Record<string, any> = {
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
        dynamicSlippage: {
          minBps: 50,
          maxBps: 300,
        },
      };

    if (quoteResponse.platformFee && Number(quoteResponse.platformFee.feeBps) > 0) {
      swapRequestBody.feeAccount = FEE_ACCOUNT;
    }

    console.log("Fetching Jupiter swap tx for:", userPublicKey);

    const response = await fetch(`${JUPITER_API_BASE}/swap`, {
      method: "POST",
      headers,
      body: JSON.stringify(swapRequestBody),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Jupiter swap error:", data.error);
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Jupiter swap error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create swap transaction" },
      { status: 500 }
    );
  }
}
