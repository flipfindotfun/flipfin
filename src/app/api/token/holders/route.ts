import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

interface TokenAccount {
  address: string;
  owner: string;
  amount: number;
  delegated_amount: number;
  frozen: boolean;
}

interface HolderPnL {
  totalPnl: number;
  pnlPercent: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

async function getTokenDecimals(mint: string): Promise<number> {
  if (!HELIUS_API_KEY) return 9;
  
  try {
    const response = await axios.post(
      `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: "2.0",
        id: "decimals",
        method: "getAccountInfo",
        params: [mint, { encoding: "jsonParsed" }],
      },
      { timeout: 5000 }
    );
    
    return response.data?.result?.value?.data?.parsed?.info?.decimals || 9;
  } catch {
    return 9;
  }
}

async function getTokenSupply(mint: string): Promise<{ supply: number; decimals: number }> {
  if (!HELIUS_API_KEY) return { supply: 0, decimals: 9 };
  
  try {
    const response = await axios.post(
      `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: "2.0",
        id: "supply",
        method: "getTokenSupply",
        params: [mint],
      },
      { timeout: 5000 }
    );
    
    const result = response.data?.result?.value;
    return {
      supply: parseFloat(result?.uiAmountString || "0"),
      decimals: result?.decimals || 9,
    };
  } catch {
    return { supply: 0, decimals: 9 };
  }
}

async function fetchHolderPnL(wallet: string, tokenMint: string): Promise<HolderPnL | null> {
  if (!HELIUS_API_KEY) return null;
  
  try {
    const url = `https://api.helius.xyz/v0/addresses/${wallet}/transactions?api-key=${HELIUS_API_KEY}&type=SWAP&limit=50`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await response.json();
    
    if (!Array.isArray(data)) return null;

    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    
    let totalBuyCost = 0;
    let totalSellRevenue = 0;
    let totalBought = 0;
    let totalSold = 0;

    for (const tx of data) {
      if (tx.type !== "SWAP" || !tx.tokenTransfers || tx.tokenTransfers.length < 2) continue;

      const transfers = tx.tokenTransfers;
      const solTransfer = transfers.find((t: any) => t.mint === SOL_MINT || t.mint === "native");
      const tokenTransfer = transfers.find((t: any) => t.mint === tokenMint);

      if (!tokenTransfer || !solTransfer) continue;

      const isBuy = tokenTransfer.toUserAccount === wallet;
      const solAmount = Math.abs(solTransfer.tokenAmount);
      const tokenAmount = Math.abs(tokenTransfer.tokenAmount);

      if (tokenAmount === 0 || solAmount === 0) continue;

      if (isBuy) {
        totalBuyCost += solAmount;
        totalBought += tokenAmount;
      } else {
        totalSellRevenue += solAmount;
        totalSold += tokenAmount;
      }
    }

    if (totalBought === 0 && totalSold === 0) return null;

    const avgBuyPrice = totalBought > 0 ? totalBuyCost / totalBought : 0;
    const realizedPnl = totalSellRevenue - (avgBuyPrice * totalSold);
    const unrealizedPnl = 0;
    const totalPnl = realizedPnl + unrealizedPnl;
    const pnlPercent = totalBuyCost > 0 ? (totalPnl / totalBuyCost) * 100 : 0;

    return {
      totalPnl,
      pnlPercent,
      realizedPnl,
      unrealizedPnl,
    };
  } catch (error) {
    return null;
  }
}

  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const limit = parseInt(searchParams.get("limit") || "50");
    const includePnl = searchParams.get("pnl") === "true";
  
    if (!address) {
      return NextResponse.json({ error: "Token address is required" }, { status: 400 });
    }
  
    let totalHolders = 0;
    let tokenPrice = 0;
    let tokenSupply = 0;
    let tokenDecimals = 9;
  
    // 1. Fetch price and basic info from DexScreener first (free and fast)
    try {
      const dexRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${address}`, { timeout: 5000 });
      const pairs = dexRes.data?.pairs || [];
      if (pairs.length > 0) {
        tokenPrice = parseFloat(pairs[0].priceUsd || "0");
      }
    } catch (e) {
      console.log("DexScreener price error");
    }

    // 2. Try Birdeye for more detailed info if available
    if (BIRDEYE_API_KEY) {
      try {
        const marketRes = await axios.get(
          `https://public-api.birdeye.so/defi/v3/token/market-data`,
          {
            params: { address },
            headers: {
              "X-API-KEY": BIRDEYE_API_KEY,
              "x-chain": "solana",
            },
            timeout: 5000,
          }
        );
        if (marketRes.data?.data) {
          tokenPrice = marketRes.data.data.price || tokenPrice;
          tokenSupply = marketRes.data.data.circulatingSupply || marketRes.data.data.totalSupply || 0;
        }

        // Try to get holder count from metadata or overview
        const metaRes = await axios.get(
          `https://public-api.birdeye.so/defi/v3/token/meta-data/single`,
          {
            params: { address },
            headers: {
              "X-API-KEY": BIRDEYE_API_KEY,
              "x-chain": "solana",
            },
            timeout: 5000,
          }
        );
        totalHolders = metaRes.data?.data?.holder || 0;
      } catch (e) {
        console.log("Birdeye v3 meta/market error");
      }
    }

    // 3. Try Helius for Holders (Optimized)
    if (HELIUS_API_KEY) {
      try {
        // If we don't have supply yet, get it
        if (tokenSupply === 0) {
          const supplyInfo = await getTokenSupply(address);
          tokenSupply = supplyInfo.supply;
          tokenDecimals = supplyInfo.decimals;
        }

        // Use getTokenLargestAccounts as it's much faster and less likely to 429
        const response = await axios.post(
          `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
          {
            jsonrpc: "2.0",
            id: "holders",
            method: "getTokenLargestAccounts",
            params: [address],
          },
          { timeout: 10000 }
        );

        const accounts = response.data?.result?.value || [];
        
        if (accounts.length > 0) {
          // Resolve owners for the top accounts
          // Limit to top 20 to avoid rate limits
          const topAccounts = accounts.slice(0, Math.min(limit, 20));
          
          const ownerPromises = topAccounts.map(async (acc: any) => {
            try {
              const ownerRes = await axios.post(
                `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
                {
                  jsonrpc: "2.0",
                  id: "owner",
                  method: "getAccountInfo",
                  params: [acc.address, { encoding: "jsonParsed" }],
                },
                { timeout: 3000 }
              );
              return ownerRes.data?.result?.value?.data?.parsed?.info?.owner || acc.address;
            } catch {
              return acc.address; // Fallback to account address if owner resolution fails
            }
          });

          const owners = await Promise.all(ownerPromises);

          const mappedHolders = await Promise.all(
            topAccounts.map(async (acc: any, i: number) => {
              const amount = parseFloat(acc.uiAmount) || 0;
              const percentage = tokenSupply > 0 ? (amount / tokenSupply) * 100 : 0;
              const value = amount * tokenPrice;
              
              // Only fetch PnL for top 5 to avoid 429
              let pnl = null;
              if (includePnl && i < 5) {
                pnl = await fetchHolderPnL(owners[i], address);
              }
              
              return {
                rank: i + 1,
                address: owners[i],
                addressShort: shortenAddress(owners[i]),
                balance: amount,
                percentage: percentage,
                value: value,
                txCount: 0,
                pnl: pnl,
              };
            })
          );

          return NextResponse.json({ 
            holders: mappedHolders,
            source: "helius-top",
            total: totalHolders || accounts.length,
            tokenPrice
          });
        }
      } catch (error: any) {
        console.error("Helius holders error:", error.message);
      }
    }

    // 4. Final Fallback to Birdeye v3 Holders
    if (BIRDEYE_API_KEY) {
      try {
        const response = await axios.get(
          `https://public-api.birdeye.so/defi/v3/token/holder`,
          {
            params: { address, offset: 0, limit: limit },
            headers: {
              "X-API-KEY": BIRDEYE_API_KEY,
              "x-chain": "solana",
            },
            timeout: 10000,
          }
        );

        const items = response.data?.data?.items || response.data?.data || [];
        const mappedHolders = items.map((t: any, i: number) => ({
          rank: i + 1,
          address: t.owner_address || t.owner || "",
          addressShort: shortenAddress(t.owner_address || t.owner || ""),
          balance: t.ui_amount || t.uiAmount || 0,
          percentage: (t.ui_amount / tokenSupply) * 100 || 0,
          value: (t.ui_amount || 0) * tokenPrice,
          txCount: 0,
          pnl: null,
        }));

        return NextResponse.json({ 
          holders: mappedHolders,
          source: "birdeye-v3",
          total: totalHolders || items.length,
          tokenPrice
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
