"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";

export interface TokenPnL {
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
  trades: {
    signature: string;
    timestamp: number;
    type: "buy" | "sell";
    tokenMint: string;
    tokenSymbol: string;
    tokenAmount: number;
    solAmount: number;
    pricePerToken: number;
  }[];
}

export interface PnLSummary {
  totalPnl: number;
  totalRealized: number;
  totalUnrealized: number;
  totalInvested: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export function usePnL() {
  const { publicKey } = useWallet();
  const [tokens, setTokens] = useState<TokenPnL[]>([]);
  const [summary, setSummary] = useState<PnLSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPnL = useCallback(async () => {
    if (!publicKey) {
      setTokens([]);
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pnl?wallet=${publicKey}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTokens(data.tokens || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      console.error("PnL fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchPnL();
  }, [fetchPnL]);

  return { tokens, summary, loading, error, refetch: fetchPnL };
}
