"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Users, Zap, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MarketStats {
  totalVolume24h: number;
  totalMarketCap: number;
  topGainers: { symbol: string; change: number; address: string }[];
  topLosers: { symbol: string; change: number; address: string }[];
  avgChange: number;
  activeTokens: number;
}

export function MarketStatsWidget({ className }: { className?: string }) {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/trending");
      const data = await res.json();
      
      const tokens = data.tokens || [];
      const totalVolume = tokens.reduce((sum: number, t: any) => sum + (t.volume24hUSD || 0), 0);
      const totalMcap = tokens.reduce((sum: number, t: any) => sum + (t.marketCap || 0), 0);
      const avgChange = tokens.length > 0 
        ? tokens.reduce((sum: number, t: any) => sum + (t.priceChange24h || 0), 0) / tokens.length 
        : 0;
      
      const sorted = [...tokens].sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0));
      
      setStats({
        totalVolume24h: totalVolume,
        totalMarketCap: totalMcap,
        topGainers: sorted.slice(0, 3).map((t: any) => ({
          symbol: t.symbol,
          change: t.priceChange24h || 0,
          address: t.address,
        })),
        topLosers: sorted.slice(-3).reverse().map((t: any) => ({
          symbol: t.symbol,
          change: t.priceChange24h || 0,
          address: t.address,
        })),
        avgChange,
        activeTokens: tokens.length,
      });
    } catch (err) {
      console.error("Failed to fetch market stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("bg-[#0d1117] border border-[#1e2329] rounded-xl p-4", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#02c076]" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className={cn("bg-[#0d1117] border border-[#1e2329] rounded-xl overflow-hidden", className)}>
      <div className="p-3 border-b border-[#1e2329]">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#02c076]" />
          <span className="text-sm font-medium text-white">Market Overview</span>
        </div>
      </div>

      <div className="p-3 grid grid-cols-2 gap-3">
        <div className="bg-[#1e2329] rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3 h-3 text-[#02c076]" />
            <span className="text-[10px] text-gray-500">24h Volume</span>
          </div>
          <span className="text-sm font-bold text-white">${formatNumber(stats.totalVolume24h)}</span>
        </div>
        
        <div className="bg-[#1e2329] rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className={cn("w-3 h-3", stats.avgChange >= 0 ? "text-green-400" : "text-red-400")} />
            <span className="text-[10px] text-gray-500">Avg Change</span>
          </div>
          <span className={cn("text-sm font-bold", stats.avgChange >= 0 ? "text-green-400" : "text-red-400")}>
            {stats.avgChange >= 0 ? "+" : ""}{stats.avgChange.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="px-3 pb-3 grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-medium text-green-400">Top Gainers</span>
          </div>
          <div className="space-y-1.5">
            {stats.topGainers.map((token) => (
              <div key={token.address} className="flex items-center justify-between">
                <span className="text-xs text-white">{token.symbol}</span>
                <span className="text-xs font-medium text-green-400">+{token.change.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-medium text-red-400">Top Losers</span>
          </div>
          <div className="space-y-1.5">
            {stats.topLosers.map((token) => (
              <div key={token.address} className="flex items-center justify-between">
                <span className="text-xs text-white">{token.symbol}</span>
                <span className="text-xs font-medium text-red-400">{token.change.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
