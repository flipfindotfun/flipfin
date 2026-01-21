import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const limit = parseInt(searchParams.get("limit") || "30");

  if (!address) {
    return NextResponse.json({ error: "Token address is required" }, { status: 400 });
  }

  let totalHolders = 0;

  if (BIRDEYE_API_KEY) {
    try {
      const overviewRes = await axios.get(
        `https://public-api.birdeye.so/defi/token_overview`,
        {
          params: { address },
          headers: {
            "X-API-KEY": BIRDEYE_API_KEY,
            "x-chain": "solana",
          },
          timeout: 8000,
        }
      );
      totalHolders = overviewRes.data?.data?.holder || 0;
    } catch (e) {
      console.log("Birdeye overview error");
    }
  }

  if (HELIUS_API_KEY) {
    try {
      const response = await axios.post(
        `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
        {
          jsonrpc: "2.0",
          id: "holders",
          method: "getTokenLargestAccounts",
          params: [address],
        },
        { timeout: 15000 }
      );

      const accounts = response.data?.result?.value || [];
      
      const totalSupply = accounts.reduce((sum: number, acc: any) => 
        sum + (parseFloat(acc.uiAmount) || 0), 0
      );

      const ownerPromises = accounts.slice(0, Math.min(limit, 20)).map(async (acc: any) => {
        try {
          const ownerRes = await axios.post(
            `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
            {
              jsonrpc: "2.0",
              id: "owner",
              method: "getAccountInfo",
              params: [acc.address, { encoding: "jsonParsed" }],
            },
            { timeout: 5000 }
          );
          return ownerRes.data?.result?.value?.data?.parsed?.info?.owner || acc.address;
        } catch {
          return acc.address;
        }
      });

      const owners = await Promise.all(ownerPromises);

      const mappedHolders = accounts.slice(0, Math.min(limit, 20)).map((acc: any, i: number) => {
        const amount = parseFloat(acc.uiAmount) || 0;
        const percentage = totalSupply > 0 ? (amount / totalSupply) * 100 : 0;
        
        return {
          rank: i + 1,
          address: owners[i],
          addressShort: shortenAddress(owners[i]),
          balance: amount,
          percentage: percentage,
          value: 0,
          txCount: 0,
        };
      });

      return NextResponse.json({ 
        holders: mappedHolders,
        source: "helius",
        total: totalHolders || accounts.length
      });
    } catch (error: any) {
      console.error("Helius holders error:", error.message);
    }
  }

  if (BIRDEYE_API_KEY) {
    try {
      const response = await axios.get(
        `https://public-api.birdeye.so/defi/v2/tokens/${address}/top_traders`,
        {
          params: { limit },
          headers: {
            "X-API-KEY": BIRDEYE_API_KEY,
            "x-chain": "solana",
          },
          timeout: 10000,
        }
      );

      const traders = response.data?.data?.items || [];
      
      const mappedHolders = traders.map((t: any, i: number) => ({
        rank: i + 1,
        address: t.owner,
        addressShort: shortenAddress(t.owner),
        balance: t.balance || 0,
        percentage: t.percentage || 0,
        value: t.valueUSD || 0,
        txCount: t.txCount || 0,
      }));

      return NextResponse.json({ 
        holders: mappedHolders,
        source: "birdeye",
        total: totalHolders || traders.length 
      });
    } catch (error: any) {
      console.error("Birdeye holders error:", error.response?.data || error.message);
    }
  }

  return NextResponse.json({ 
    holders: [],
    total: totalHolders,
    error: "Could not fetch holders" 
  });
}

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
