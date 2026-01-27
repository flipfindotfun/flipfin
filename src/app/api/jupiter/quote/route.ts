import { NextRequest, NextResponse } from "next/server";

const JUPITER_ULTRA_API = "https://api.jup.ag/ultra/v1";
const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY;
const REFERRAL_ACCOUNT = process.env.JUPITER_REFERRAL_ACCOUNT || "";
const REFERRAL_FEE_BPS = 50; // 0.5% fee (50-255 bps allowed)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inputMint, outputMint, amount, taker, slippageBps } = body;

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: "inputMint, outputMint, and amount are required" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: Math.floor(amount).toString(),
    });

    if (taker) {
      params.append("taker", taker);
    }

    if (slippageBps) {
      params.append("slippageBps", slippageBps.toString());
    }

    if (REFERRAL_ACCOUNT) {
      params.append("referralAccount", REFERRAL_ACCOUNT);
      params.append("referralFee", REFERRAL_FEE_BPS.toString());
    }

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    
    if (JUPITER_API_KEY) {
      headers["x-api-key"] = JUPITER_API_KEY;
    }

    console.log("Fetching Jupiter Ultra order:", `${JUPITER_ULTRA_API}/order?${params}`);

    const response = await fetch(`${JUPITER_ULTRA_API}/order?${params}`, {
      method: "GET",
      headers,
    });

    const data = await response.json();
    
    console.log("Jupiter Ultra API response:", JSON.stringify(data).slice(0, 500));

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Jupiter quote error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get swap quote" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inputMint = searchParams.get("inputMint");
    const outputMint = searchParams.get("outputMint");
    const amount = searchParams.get("amount");
    const taker = searchParams.get("taker");
    const slippageBps = searchParams.get("slippageBps");

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: "inputMint, outputMint, and amount are required" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
    });

    if (taker) {
      params.append("taker", taker);
    }

    if (slippageBps) {
      params.append("slippageBps", slippageBps);
    }

    if (REFERRAL_ACCOUNT) {
      params.append("referralAccount", REFERRAL_ACCOUNT);
      params.append("referralFee", REFERRAL_FEE_BPS.toString());
    }

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    
    if (JUPITER_API_KEY) {
      headers["x-api-key"] = JUPITER_API_KEY;
    }

    const response = await fetch(`${JUPITER_ULTRA_API}/order?${params}`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Jupiter quote error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get swap quote" },
      { status: 500 }
    );
  }
}
