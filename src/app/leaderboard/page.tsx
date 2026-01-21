"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { formatNumber } from "@/lib/types";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface LeaderboardEntry {
  wallet_address: string;
  total_profit: number;
  win_rate: number;
  trades_count: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">("all");

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Try to fetch from leaderboards table
      let { data, error } = await supabase
        .from("leaderboards")
        .select("*")
        .order("total_profit", { ascending: false })
        .limit(50);
      
      if (error || !data || data.length === 0) {
        // If no leaderboard data, aggregate from user_trades
        const { data: tradesData, error: tradesError } = await supabase
          .from("user_trades")
          .select("wallet_address, side, amount, price")
          .order("created_at", { ascending: false });

        if (!tradesError && tradesData && tradesData.length > 0) {
          // Aggregate by wallet
          const walletStats = new Map<string, { profit: number; trades: number; wins: number }>();
          
          tradesData.forEach((trade: any) => {
            const existing = walletStats.get(trade.wallet_address) || { profit: 0, trades: 0, wins: 0 };
            const tradeValue = (trade.amount || 0) * (trade.price || 0);
            
            if (trade.side === "sell") {
              existing.profit += tradeValue;
              existing.wins += 1;
            } else {
              existing.profit -= tradeValue;
            }
            existing.trades += 1;
            
            walletStats.set(trade.wallet_address, existing);
          });

          const aggregated: LeaderboardEntry[] = Array.from(walletStats.entries())
            .map(([address, stats]) => ({
              wallet_address: address,
              total_profit: stats.profit,
              win_rate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
              trades_count: stats.trades,
            }))
            .sort((a, b) => b.total_profit - a.total_profit)
            .slice(0, 50);

          setLeaderboard(aggregated);
        } else {
          setLeaderboard([]);
        }
      } else {
        setLeaderboard(data);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setLeaderboard([]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-y-auto">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#1e2329]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Leaderboard</h1>
              <p className="text-sm text-gray-500">Top traders ranked by profit</p>
            </div>
          </div>
          <button 
            onClick={fetchLeaderboard}
            className="p-2 hover:bg-[#1e2329] rounded-lg text-gray-500 hover:text-white"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex gap-1 px-4 sm:px-6 py-3 border-b border-[#1e2329]">
        {(["24h", "7d", "30d", "all"] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded transition-all",
              timeframe === tf
                ? "bg-[#02c076] text-black"
                : "text-gray-500 hover:text-white hover:bg-[#1e2329]"
            )}
          >
            {tf === "all" ? "All Time" : tf.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#02c076]" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <Trophy className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No trading activity yet</p>
          <p className="text-sm">Start trading to appear on the leaderboard!</p>
        </div>
      ) : (
        <>
          {/* Top 3 */}
          {leaderboard.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 p-4 sm:p-6">
              {leaderboard.slice(0, 3).map((trader, i) => (
                <TopTraderCard key={trader.wallet_address} trader={trader} rank={i + 1} />
              ))}
            </div>
          )}

          {/* Table */}
          <div className="flex-1 px-4 sm:px-6 pb-6">
            <div className="bg-[#0d1117] border border-[#1e2329] rounded-lg overflow-hidden">
              <div className="grid grid-cols-5 gap-4 px-4 py-2 text-[10px] font-bold uppercase text-gray-500 border-b border-[#1e2329]">
                <span>Rank</span>
                <span>Wallet</span>
                <span className="text-right">Profit</span>
                <span className="text-right">Win Rate</span>
                <span className="text-right">Trades</span>
              </div>
              {leaderboard.slice(leaderboard.length >= 3 ? 3 : 0).map((trader, i) => (
                <div
                  key={trader.wallet_address}
                  className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-[#1e2329]/50 border-b border-[#1e2329]/50 items-center"
                >
                  <span className="font-bold text-gray-500">{(leaderboard.length >= 3 ? i + 4 : i + 1)}</span>
                  <a 
                    href={`https://solscan.io/account/${trader.wallet_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-[#02c076] hover:underline"
                  >
                    {trader.wallet_address?.slice(0, 6)}...{trader.wallet_address?.slice(-4)}
                  </a>
                  <span className={cn(
                    "text-right font-bold",
                    trader.total_profit >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                  )}>
                    {trader.total_profit >= 0 ? "+" : ""}${formatNumber(Math.abs(trader.total_profit))}
                  </span>
                  <span className="text-right text-gray-400">{(trader.win_rate || 0).toFixed(0)}%</span>
                  <span className="text-right text-gray-500">{trader.trades_count || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TopTraderCard({ trader, rank }: { trader: LeaderboardEntry; rank: number }) {
  const colors = {
    1: { bg: "from-yellow-500/20 to-yellow-600/10", border: "border-yellow-500/30", icon: "text-yellow-500" },
    2: { bg: "from-gray-400/20 to-gray-500/10", border: "border-gray-400/30", icon: "text-gray-400" },
    3: { bg: "from-orange-600/20 to-orange-700/10", border: "border-orange-600/30", icon: "text-orange-600" },
  }[rank] || { bg: "from-gray-700/20 to-gray-800/10", border: "border-gray-700/30", icon: "text-gray-500" };

  return (
    <div className={cn(
      "bg-gradient-to-br border rounded-lg p-4 text-center",
      colors.bg,
      colors.border
    )}>
      <div className={cn("flex items-center justify-center mb-2", colors.icon)}>
        {rank === 1 ? <Trophy className="w-6 h-6" /> : <Medal className="w-6 h-6" />}
      </div>
      <p className="text-[10px] text-gray-500 mb-1">#{rank}</p>
      <a 
        href={`https://solscan.io/account/${trader.wallet_address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-white hover:text-[#02c076] mb-2 block"
      >
        {trader.wallet_address?.slice(0, 4)}...{trader.wallet_address?.slice(-4)}
      </a>
      <p className={cn(
        "text-lg font-bold",
        trader.total_profit >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
      )}>
        {trader.total_profit >= 0 ? "+" : ""}${formatNumber(Math.abs(trader.total_profit))}
      </p>
      <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-gray-500">
        <span>{(trader.win_rate || 0).toFixed(0)}% Win</span>
        <span>{trader.trades_count || 0} Trades</span>
      </div>
    </div>
  );
}
