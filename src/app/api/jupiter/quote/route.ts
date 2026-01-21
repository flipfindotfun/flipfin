import { NextRequest, NextResponse } from "next/server";

const JUPITER_API_BASE = "https://public.jupiterapi.com";
const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY;
const PLATFORM_FEE_BPS = 50; // 0.5% fee

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inputMint, outputMint, amount, slippageBps } = body;

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
        slippageBps: (slippageBps || 1500).toString(),
        platformFeeBps: PLATFORM_FEE_BPS.toString(),
        restrictIntermediateTokens: "true",
      });

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    
    if (JUPITER_API_KEY) {
      headers["x-api-key"] = JUPITER_API_KEY;
    }

    console.log("Fetching Jupiter quote:", `${JUPITER_API_BASE}/quote?${params}`);

    const response = await fetch(`${JUPITER_API_BASE}/quote?${params}`, {
      method: "GET",
      headers,
    });

    const data = await response.json();
    
    console.log("Jupiter API response:", JSON.stringify(data).slice(0, 500));

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
    const slippageBps = searchParams.get("slippageBps") || "1500";

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
        slippageBps,
        platformFeeBps: PLATFORM_FEE_BPS.toString(),
        restrictIntermediateTokens: "true",
      });

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    
    if (JUPITER_API_KEY) {
      headers["x-api-key"] = JUPITER_API_KEY;
    }

    const response = await fetch(`${JUPITER_API_BASE}/quote?${params}`, {
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
