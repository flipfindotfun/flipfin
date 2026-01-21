"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Target,
  Trophy,
  X as XIcon,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Share2
} from "lucide-react";
import { usePnL, TokenPnL } from "@/hooks/use-pnl";
import { useWallet } from "@/lib/wallet-context";
import { cn } from "@/lib/utils";
import { formatNumber, formatPrice, timeAgo } from "@/lib/types";
import Link from "next/link";
import { PnLShareCard } from "./pnl-share-card";

export function PnLDashboard() {
  const { publicKey } = useWallet();
  const { tokens, summary, loading, refetch } = usePnL();
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "winners" | "losers">("all");
  const [showShareCard, setShowShareCard] = useState(false);

  const filteredTokens = tokens.filter(t => {
    if (filter === "winners") return t.totalPnl > 0;
    if (filter === "losers") return t.totalPnl < 0;
    return true;
  });

  if (loading && tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#02c076] mb-4" />
        <p className="text-gray-500 text-sm">Analyzing your trades...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summary && publicKey && showShareCard && (
        <PnLShareCard
          summary={summary}
          topTokens={tokens.filter(t => t.totalPnl > 0).slice(0, 3)}
          walletAddress={publicKey}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {summary && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <PnLStatCard
            label="Total PnL"
            value={summary.totalPnl}
            isSol
            icon={summary.totalPnl >= 0 ? TrendingUp : TrendingDown}
            gradient={summary.totalPnl >= 0 ? "from-emerald-500/20 to-emerald-500/5" : "from-red-500/20 to-red-500/5"}
          />
          <PnLStatCard
            label="Realized"
            value={summary.totalRealized}
            isSol
            icon={Wallet}
            gradient="from-blue-500/20 to-blue-500/5"
          />
          <PnLStatCard
            label="Unrealized"
            value={summary.totalUnrealized}
            isSol
            icon={Activity}
            gradient="from-purple-500/20 to-purple-500/5"
          />
          <PnLStatCard
            label="Win Rate"
            value={summary.winRate}
            suffix="%"
            icon={Trophy}
            gradient="from-amber-500/20 to-amber-500/5"
            subtext={`${summary.winningTrades}W / ${summary.losingTrades}L`}
          />
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === "all" 
                ? "bg-[#1e2329] text-white" 
                : "text-gray-500 hover:text-white"
            )}
          >
            All ({tokens.length})
          </button>
          <button
            onClick={() => setFilter("winners")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
              filter === "winners" 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "text-gray-500 hover:text-emerald-400"
            )}
          >
            <TrendingUp className="w-3 h-3" />
            Winners
          </button>
          <button
            onClick={() => setFilter("losers")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
              filter === "losers" 
                ? "bg-red-500/20 text-red-400" 
                : "text-gray-500 hover:text-red-400"
            )}
          >
            <TrendingDown className="w-3 h-3" />
            Losers
          </button>
        </div>
        <div className="flex items-center gap-2">
          {summary && tokens.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowShareCard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#02c076] to-[#02a566] rounded-lg text-black text-xs font-bold"
            >
              <Share2 className="w-3 h-3" />
              Share PnL
            </motion.button>
          )}
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 hover:bg-[#1e2329] rounded-lg text-gray-500 hover:text-white transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredTokens.map((token, index) => (
            <TokenPnLCard
              key={token.mint}
              token={token}
              index={index}
              expanded={expandedToken === token.mint}
              onToggle={() => setExpandedToken(
                expandedToken === token.mint ? null : token.mint
              )}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredTokens.length === 0 && !loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <BarChart3 className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-500 text-sm">No trades found</p>
          <p className="text-gray-600 text-xs mt-1">Start trading to see your PnL here</p>
        </motion.div>
      )}
    </div>
  );
}

function PnLStatCard({ 
  label, 
  value, 
  icon: Icon, 
  gradient,
  isSol,
  suffix,
  subtext
}: { 
  label: string; 
  value: number; 
  icon: any;
  gradient: string;
  isSol?: boolean;
  suffix?: string;
  subtext?: string;
}) {
  const isPositive = value >= 0;
  const displayValue = isSol 
    ? `${isPositive ? "+" : ""}${value.toFixed(4)} SOL`
    : `${value.toFixed(1)}${suffix || ""}`;

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-[#1e2329] p-4",
        "bg-gradient-to-br",
        gradient
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <Icon className={cn(
          "w-4 h-4",
          isSol && (isPositive ? "text-emerald-400" : "text-red-400"),
          !isSol && "text-gray-400"
        )} />
      </div>
      <p className={cn(
        "text-lg font-bold",
        isSol && (isPositive ? "text-emerald-400" : "text-red-400"),
        !isSol && "text-white"
      )}>
        {displayValue}
      </p>
      {subtext && (
        <p className="text-[10px] text-gray-500 mt-1">{subtext}</p>
      )}
    </motion.div>
  );
}

function TokenPnLCard({ 
  token, 
  index,
  expanded,
  onToggle
}: { 
  token: TokenPnL;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isPositive = token.totalPnl >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={cn(
        "bg-[#0d1117] border rounded-xl overflow-hidden transition-colors",
        isPositive ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-red-500/20 hover:border-red-500/40"
      )}
    >
      <div 
        onClick={onToggle}
        className="flex items-center gap-3 p-4 cursor-pointer"
      >
        <div className="relative">
          {token.image ? (
            <img 
              src={token.image} 
              alt={token.symbol}
              className="w-10 h-10 rounded-xl object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e2329] to-[#2d3748] flex items-center justify-center">
              <span className="text-xs font-bold text-gray-400">
                {token.symbol.slice(0, 2)}
              </span>
            </div>
          )}
          <div className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center",
            isPositive ? "bg-emerald-500" : "bg-red-500"
          )}>
            {isPositive ? (
              <TrendingUp className="w-2.5 h-2.5 text-white" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5 text-white" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{token.symbol}</span>
            {token.currentHolding > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400 font-medium">
                HOLDING
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">
              {token.trades.length} trades
            </span>
            <span className="text-gray-600">•</span>
            <span className={cn(
              "text-xs font-medium",
              isPositive ? "text-emerald-400" : "text-red-400"
            )}>
              {token.pnlPercent >= 0 ? "+" : ""}{token.pnlPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="text-right">
          <p className={cn(
            "font-bold text-sm",
            isPositive ? "text-emerald-400" : "text-red-400"
          )}>
            {isPositive ? "+" : ""}{token.totalPnl.toFixed(4)} SOL
          </p>
          {token.currentHolding > 0 && (
            <p className="text-[10px] text-gray-500">
              Holding: {formatNumber(token.currentHolding)}
            </p>
          )}
        </div>

        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </motion.div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[#1e2329]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
                <MiniStat label="Avg Buy" value={`${token.avgBuyPrice.toExponential(2)} SOL`} />
                <MiniStat label="Avg Sell" value={`${token.avgSellPrice.toExponential(2)} SOL`} />
                <MiniStat 
                  label="Realized" 
                  value={`${token.realizedPnl >= 0 ? "+" : ""}${token.realizedPnl.toFixed(4)}`}
                  valueClass={token.realizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}
                />
                <MiniStat 
                  label="Unrealized" 
                  value={`${token.unrealizedPnl >= 0 ? "+" : ""}${token.unrealizedPnl.toFixed(4)}`}
                  valueClass={token.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}
                />
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">Recent Trades</span>
                  <Link 
                    href={`/trade/${token.mint}`}
                    className="text-xs text-[#02c076] hover:underline flex items-center gap-1"
                  >
                    Trade <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {token.trades.slice(0, 5).map((trade) => (
                    <div 
                      key={trade.signature}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-[#1e2329]/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          trade.type === "buy" 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-red-500/20 text-red-400"
                        )}>
                          {trade.type.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-300">
                          {formatNumber(trade.tokenAmount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400">
                          {trade.solAmount.toFixed(4)} SOL
                        </span>
                        <span className="text-[10px] text-gray-600 ml-2">
                          {timeAgo(trade.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MiniStat({ 
  label, 
  value, 
  valueClass = "text-white" 
}: { 
  label: string; 
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <span className="text-[10px] text-gray-500 block">{label}</span>
      <span className={cn("text-xs font-medium", valueClass)}>{value}</span>
    </div>
  );
}
