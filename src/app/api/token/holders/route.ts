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
      tokenPrice = overviewRes.data?.data?.price || 0;
    } catch (e) {
      console.log("Birdeye overview error");
    }
  }

  if (HELIUS_API_KEY) {
    try {
      const { supply, decimals } = await getTokenSupply(address);
      
      const allAccounts: TokenAccount[] = [];
      let page = 1;
      const maxPages = 10;
      
      while (page <= maxPages) {
        const response = await axios.post(
          `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
          {
            jsonrpc: "2.0",
            id: "helius-holders",
            method: "getTokenAccounts",
            params: {
              page: page,
              limit: 1000,
              displayOptions: {},
              mint: address,
            },
          },
          { timeout: 15000 }
        );

        const accounts = response.data?.result?.token_accounts || [];
        
        if (accounts.length === 0) {
          break;
        }
        
        allAccounts.push(...accounts);
        page++;
        
        if (accounts.length < 1000) {
          break;
        }
      }

      if (allAccounts.length === 0) {
        const fallbackResponse = await axios.post(
          `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
          {
            jsonrpc: "2.0",
            id: "holders",
            method: "getTokenLargestAccounts",
            params: [address],
          },
          { timeout: 15000 }
        );

        const accounts = fallbackResponse.data?.result?.value || [];
        
          const totalSupplyFromAccounts = accounts.reduce((sum: number, acc: any) => 
            sum + (parseFloat(acc.uiAmount) || 0), 0
          );
          const initialSupply = supply > 0 ? supply : totalSupplyFromAccounts;
          const lpAmount = parseFloat(accounts[0]?.uiAmount) || 0;
          const actualSupply = initialSupply - lpAmount;

          const ownerPromises = accounts.slice(1, Math.min(limit + 1, 21)).map(async (acc: any) => {
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

          const mappedHolders = await Promise.all(
            accounts.slice(1, Math.min(limit + 1, 21)).map(async (acc: any, i: number) => {
              const amount = parseFloat(acc.uiAmount) || 0;
              const percentage = actualSupply > 0 ? (amount / actualSupply) * 100 : 0;
              const value = amount * tokenPrice;
              
              let pnl = null;
              if (includePnl && i < 10) {
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
          source: "helius-fallback",
          total: totalHolders || accounts.length
        });
      }

      const totalRawSupply = allAccounts.reduce((sum, acc) => sum + (acc.amount || 0), 0);

      const sortedAccounts = allAccounts
        .filter(acc => acc.amount > 0)
        .sort((a, b) => b.amount - a.amount);

        const lpAmount = sortedAccounts[0]?.amount || 0;
        const circulatingSupply = totalRawSupply - lpAmount;

        const mappedHolders = await Promise.all(
          sortedAccounts.slice(1, limit + 1).map(async (acc, i) => {
            const rawAmount = acc.amount || 0;
            const displayAmount = rawAmount / Math.pow(10, decimals);
            const percentage = circulatingSupply > 0 ? (rawAmount / circulatingSupply) * 100 : 0;
            const value = displayAmount * tokenPrice;
            
            let pnl = null;
            if (includePnl && i < 10) {
              pnl = await fetchHolderPnL(acc.owner, address);
            }
            
            return {
              rank: i + 1,
              address: acc.owner,
              addressShort: shortenAddress(acc.owner),
              balance: displayAmount,
              percentage: percentage,
              value: value,
              txCount: 0,
              pnl: pnl,
            };
          })
        );

        const top10Percent = sortedAccounts.slice(1, 11).reduce((sum, acc) => 
          sum + (circulatingSupply > 0 ? (acc.amount / circulatingSupply) * 100 : 0), 0
        );
        const top100Percent = sortedAccounts.slice(1, 101).reduce((sum, acc) => 
          sum + (circulatingSupply > 0 ? (acc.amount / circulatingSupply) * 100 : 0), 0
        );
        const top500Percent = sortedAccounts.slice(1, 501).reduce((sum, acc) => 
          sum + (circulatingSupply > 0 ? (acc.amount / circulatingSupply) * 100 : 0), 0
        );

      return NextResponse.json({ 
        holders: mappedHolders,
        source: "helius",
        total: totalHolders || sortedAccounts.length,
        distribution: {
          top10: top10Percent,
          top100: top100Percent,
          top500: top500Percent,
          totalTracked: sortedAccounts.length,
        }
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
        const lpPercentage = traders[0]?.percentage || 0;
        const circulatingScale = 100 / (100 - lpPercentage);
        
        const mappedHolders = traders.slice(1, limit + 1).map((t: any, i: number) => ({
          rank: i + 1,
          address: t.owner,
          addressShort: shortenAddress(t.owner),
          balance: t.balance || 0,
          percentage: (t.percentage || 0) * circulatingScale,
          value: t.valueUSD || 0,
          txCount: t.txCount || 0,
          pnl: null,
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
