import { NextRequest, NextResponse } from "next/server";

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

interface SwapTransaction {
  signature: string;
  timestamp: number;
  type: "buy" | "sell";
  tokenMint: string;
  tokenSymbol: string;
  tokenAmount: number;
  solAmount: number;
  pricePerToken: number;
  tokenImage?: string;
}

interface TokenPnL {
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  totalBought: number;
  totalSold: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  currentHolding: number;
  currentPrice: number;
  currentValue: number;
  totalPnl: number;
  pnlPercent: number;
  trades: SwapTransaction[];
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  const tokenFilter = request.nextUrl.searchParams.get("token");

  if (!wallet) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
  }

  try {
    const transactions = await fetchSwapTransactions(wallet, tokenFilter);
    
    if (tokenFilter) {
      const trades = transactions
        .filter(t => t.tokenMint === tokenFilter)
        .map(t => ({
          tx_hash: t.signature,
          side: t.type,
          amount: t.type === "buy" ? t.solAmount : t.tokenAmount,
          price: t.pricePerToken,
          created_at: new Date(t.timestamp).toISOString(),
        }));
      
      return NextResponse.json({ trades });
    }

    const tokenPnLs = await calculatePnL(transactions, wallet);
    
    const overallPnL = tokenPnLs.reduce((acc, t) => acc + t.totalPnl, 0);
    const totalInvested = tokenPnLs.reduce((acc, t) => acc + (t.avgBuyPrice * t.totalBought), 0);
    const totalRealized = tokenPnLs.reduce((acc, t) => acc + t.realizedPnl, 0);
    const totalUnrealized = tokenPnLs.reduce((acc, t) => acc + t.unrealizedPnl, 0);
    const winningTrades = tokenPnLs.filter(t => t.totalPnl > 0).length;
    const losingTrades = tokenPnLs.filter(t => t.totalPnl < 0).length;

    return NextResponse.json({
      tokens: tokenPnLs.sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl)),
      summary: {
        totalPnl: overallPnL,
        totalRealized,
        totalUnrealized,
        totalInvested,
        winRate: tokenPnLs.length > 0 ? (winningTrades / tokenPnLs.length) * 100 : 0,
        totalTrades: tokenPnLs.length,
        winningTrades,
        losingTrades,
      },
    });
  } catch (error: any) {
    console.error("PnL calculation error:", error);
    return NextResponse.json({ error: error.message || "Failed to calculate PnL" }, { status: 500 });
  }
}

async function fetchSwapTransactions(wallet: string, tokenFilter?: string | null): Promise<SwapTransaction[]> {
  const url = `https://api.helius.xyz/v0/addresses/${wallet}/transactions?api-key=${HELIUS_API_KEY}&type=SWAP&limit=100`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!Array.isArray(data)) {
    console.error("Helius response:", data);
    return [];
  }

  const swaps: SwapTransaction[] = [];

  for (const tx of data) {
    if (tx.type !== "SWAP" || !tx.tokenTransfers || tx.tokenTransfers.length < 2) continue;

    const transfers = tx.tokenTransfers;
    
    let solTransfer = transfers.find((t: any) => 
      t.mint === SOL_MINT || t.mint === "native"
    );
    let tokenTransfer = transfers.find((t: any) => 
      t.mint !== SOL_MINT && t.mint !== "native" && t.mint !== USDC_MINT
    );

    if (!tokenTransfer) continue;

    const isBuy = tokenTransfer.toUserAccount === wallet;
    const solAmount = solTransfer ? Math.abs(solTransfer.tokenAmount) : 0;
    const tokenAmount = Math.abs(tokenTransfer.tokenAmount);

    if (tokenAmount === 0 || solAmount === 0) continue;

    swaps.push({
      signature: tx.signature,
      timestamp: tx.timestamp * 1000,
      type: isBuy ? "buy" : "sell",
      tokenMint: tokenTransfer.mint,
      tokenSymbol: tokenTransfer.symbol || "???",
      tokenAmount,
      solAmount,
      pricePerToken: solAmount / tokenAmount,
    });
  }

  return swaps;
}

async function calculatePnL(transactions: SwapTransaction[], wallet: string): Promise<TokenPnL[]> {
  const tokenMap = new Map<string, {
    buys: SwapTransaction[];
    sells: SwapTransaction[];
    symbol: string;
  }>();

  for (const tx of transactions) {
    if (!tokenMap.has(tx.tokenMint)) {
      tokenMap.set(tx.tokenMint, { buys: [], sells: [], symbol: tx.tokenSymbol });
    }
    const entry = tokenMap.get(tx.tokenMint)!;
    if (tx.type === "buy") {
      entry.buys.push(tx);
    } else {
      entry.sells.push(tx);
    }
  }

  const mints = Array.from(tokenMap.keys());
  const tokenData = await fetchTokenPricesAndImages(mints);
  const holdings = await fetchCurrentHoldings(wallet, mints);

  const pnlResults: TokenPnL[] = [];

  for (const [mint, data] of tokenMap) {
    const { buys, sells, symbol } = data;
    const tokenInfo = tokenData.get(mint);
    const holding = holdings.get(mint) || 0;

    const totalBought = buys.reduce((s, b) => s + b.tokenAmount, 0);
    const totalSold = sells.reduce((s, b) => s + b.tokenAmount, 0);
    const totalBuyCost = buys.reduce((s, b) => s + b.solAmount, 0);
    const totalSellRevenue = sells.reduce((s, b) => s + b.solAmount, 0);

    const avgBuyPrice = totalBought > 0 ? totalBuyCost / totalBought : 0;
    const avgSellPrice = totalSold > 0 ? totalSellRevenue / totalSold : 0;

    const currentPrice = tokenInfo?.price || 0;
    const currentValue = holding * currentPrice;

    const realizedPnl = totalSellRevenue - (avgBuyPrice * totalSold);
    const costBasis = avgBuyPrice * holding;
    const unrealizedPnl = currentValue - costBasis;
    const totalPnl = realizedPnl + unrealizedPnl;

    const totalCost = totalBuyCost;
    const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    pnlResults.push({
      mint,
      symbol: tokenInfo?.symbol || symbol,
      name: tokenInfo?.name || symbol,
      image: tokenInfo?.image,
      totalBought,
      totalSold,
      avgBuyPrice,
      avgSellPrice,
      realizedPnl,
      unrealizedPnl,
      currentHolding: holding,
      currentPrice,
      currentValue,
      totalPnl,
      pnlPercent,
      trades: [...buys, ...sells].sort((a, b) => b.timestamp - a.timestamp),
    });
  }

  return pnlResults;
}

async function fetchTokenPricesAndImages(mints: string[]): Promise<Map<string, {
  symbol: string;
  name: string;
  price: number;
  image?: string;
}>> {
  const dataMap = new Map();
  if (mints.length === 0) return dataMap;

  try {
    const batchSize = 30;
    for (let i = 0; i < mints.length; i += batchSize) {
      const batch = mints.slice(i, i + batchSize);
      const mintString = batch.join(",");

      const response = await fetch(
        `https://api.dexscreener.com/tokens/v1/solana/${mintString}`
      );
      const pairs = await response.json();

      if (Array.isArray(pairs)) {
        pairs.forEach((pair: any) => {
          if (pair.baseToken && !dataMap.has(pair.baseToken.address)) {
            dataMap.set(pair.baseToken.address, {
              symbol: pair.baseToken.symbol,
              name: pair.baseToken.name,
              price: parseFloat(pair.priceNative) || 0,
              image: pair.info?.imageUrl,
            });
          }
        });
      }
    }
  } catch (err) {
    console.error("Error fetching token data:", err);
  }

  return dataMap;
}

async function fetchCurrentHoldings(wallet: string, mints: string[]): Promise<Map<string, number>> {
  const holdingsMap = new Map<string, number>();
  
  try {
    const url = `https://api.helius.xyz/v0/addresses/${wallet}/balances?api-key=${HELIUS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.tokens) {
      for (const token of data.tokens) {
        if (mints.includes(token.mint)) {
          holdingsMap.set(token.mint, token.amount / Math.pow(10, token.decimals));
        }
      }
    }
  } catch (err) {
    console.error("Error fetching holdings:", err);
  }

  return holdingsMap;
}
