import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "flipfin-admin-secret-key-2024"
);

async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

interface APIHealth {
  name: string;
  endpoint: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  lastChecked: string;
  error?: string;
}

async function checkJsonRpc(name: string, url: string): Promise<APIHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    const responseTime = Date.now() - start;
    const data = await res.json();
    
    const isHealthy = res.ok && (data.result === "ok" || !data.error);
    
    return {
      name,
      endpoint: url.split("?")[0],
      status: isHealthy ? "healthy" : "degraded",
      responseTime,
      lastChecked: new Date().toISOString(),
      error: isHealthy ? undefined : data.error?.message || `HTTP ${res.status}`,
    };
  } catch (error: any) {
    return {
      name,
      endpoint: url.split("?")[0],
      status: "down",
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
      error: error.message,
    };
  }
}

async function checkEndpoint(name: string, url: string, headers?: Record<string, string>): Promise<APIHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(url, {
      headers: headers || {},
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    const responseTime = Date.now() - start;
    
    return {
      name,
      endpoint: url.split("?")[0],
      status: res.ok ? "healthy" : "degraded",
      responseTime,
      lastChecked: new Date().toISOString(),
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (error: any) {
    return {
      name,
      endpoint: url.split("?")[0],
      status: "down",
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
      error: error.message,
    };
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const birdeyeKey = process.env.BIRDEYE_API_KEY;

  const checks = await Promise.all([
    checkEndpoint("Internal - Trending", `${baseUrl}/api/trending`),
    checkEndpoint("Internal - Leaderboard", `${baseUrl}/api/leaderboard?type=points&limit=1`),
    checkEndpoint("Internal - Twitter", `${baseUrl}/api/twitter?query=solana&limit=1`),
    checkEndpoint("Birdeye API", "https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=desc&offset=0&limit=1", {
      "accept": "application/json",
      "X-API-KEY": birdeyeKey || "",
      "x-chain": "solana",
    }),
    checkEndpoint("Jupiter API", "https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112"),
    checkEndpoint("DexScreener API", "https://api.dexscreener.com/latest/dex/search?q=SOL"),
    checkJsonRpc("Helius RPC", `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`),
    checkEndpoint("Supabase", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=wallet_address&limit=1`, {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    }),
  ]);

  const healthyCount = checks.filter((c) => c.status === "healthy").length;
  const degradedCount = checks.filter((c) => c.status === "degraded").length;
  const downCount = checks.filter((c) => c.status === "down").length;

  let overallStatus: "healthy" | "degraded" | "down" = "healthy";
  if (downCount > 2) overallStatus = "down";
  else if (downCount > 0 || degradedCount > 1) overallStatus = "degraded";

  return NextResponse.json({
    overall: overallStatus,
    summary: { healthy: healthyCount, degraded: degradedCount, down: downCount },
    services: checks,
    checkedAt: new Date().toISOString(),
  });
}
