"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  Loader2, 
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  ChevronRight
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useApp } from "@/lib/context";
import { useTokenPositions } from "@/hooks/use-token-positions";
import { PnLDashboard } from "@/components/pnl-dashboard";
import { formatNumber, formatPrice, timeAgo } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

type TabType = "holdings" | "pnl" | "history";

export default function PortfolioPage() {
  const { publicKey, balance } = useWallet();
  const { trades, solPrice } = useApp();
  const { positions, loading, refetch } = useTokenPositions();
  const [activeTab, setActiveTab] = useState<TabType>("holdings");

  const solValue = balance * solPrice;
  const tokenValue = positions.reduce((sum, p) => sum + p.value, 0);
  const totalValue = solValue + tokenValue;

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0b0e11] p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1e2329] to-[#2d3748] flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-10 h-10 text-gray-600" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-gray-500 text-sm text-center max-w-sm mb-6">
            Generate or import a wallet to view your portfolio, PnL, and trading history
          </p>
          <Link 
            href="/wallet" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#02c076] to-[#02a566] text-black font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Go to Wallet
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-hidden">
      <div className="flex-none px-4 sm:px-6 py-4 border-b border-[#1e2329]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Portfolio</h1>
            <p className="text-sm text-gray-500">Track your performance</p>
          </div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-right"
          >
            <p className="text-2xl font-bold text-white">${formatNumber(totalValue)}</p>
            <p className="text-xs text-gray-500">Total Value</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <QuickStat 
            label="SOL" 
            value={`${balance.toFixed(3)}`} 
            subValue={`$${solValue.toFixed(2)}`}
            icon={<span className="text-lg">◎</span>}
          />
          <QuickStat 
            label="Tokens" 
            value={`$${formatNumber(tokenValue)}`} 
            subValue={`${positions.length} assets`}
            icon={<PieChart className="w-4 h-4 text-purple-400" />}
          />
          <QuickStat 
            label="Trades" 
            value={trades.length.toString()} 
            subValue="All time"
            icon={<Activity className="w-4 h-4 text-blue-400" />}
          />
        </div>
      </div>

      <div className="flex-none px-4 sm:px-6 py-3 border-b border-[#1e2329]">
        <div className="flex items-center gap-1 p-1 bg-[#0d1117] rounded-xl">
          <TabButton 
            active={activeTab === "pnl"} 
            onClick={() => setActiveTab("pnl")}
            icon={<BarChart3 className="w-4 h-4" />}
          >
            PnL Analysis
          </TabButton>
          <TabButton 
            active={activeTab === "holdings"} 
            onClick={() => setActiveTab("holdings")}
            icon={<Wallet className="w-4 h-4" />}
          >
            Holdings
          </TabButton>
          <TabButton 
            active={activeTab === "history"} 
            onClick={() => setActiveTab("history")}
            icon={<Activity className="w-4 h-4" />}
          >
            History
          </TabButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <AnimatePresence mode="wait">
          {activeTab === "pnl" && (
            <motion.div
              key="pnl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <PnLDashboard />
            </motion.div>
          )}

          {activeTab === "holdings" && (
            <motion.div
              key="holdings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HoldingsTab 
                positions={positions} 
                loading={loading} 
                onRefresh={refetch} 
              />
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HistoryTab trades={trades} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function QuickStat({ 
  label, 
  value, 
  subValue, 
  icon 
}: { 
  label: string; 
  value: string; 
  subValue: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0d1117] border border-[#1e2329] rounded-xl p-3"
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] text-gray-500 uppercase font-medium">{label}</span>
      </div>
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] text-gray-500">{subValue}</p>
    </motion.div>
  );
}

function TabButton({ 
  children, 
  active, 
  onClick,
  icon
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active 
          ? "bg-[#1e2329] text-white" 
          : "text-gray-500 hover:text-gray-300"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

function HoldingsTab({ 
  positions, 
  loading, 
  onRefresh 
}: { 
  positions: any[]; 
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#02c076]" />
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Wallet className="w-12 h-12 text-gray-700 mb-4" />
        <p className="text-gray-500 text-sm">No token holdings</p>
        <Link href="/" className="text-[#02c076] text-sm mt-2 hover:underline">
          Start trading →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 font-medium">
          {positions.length} tokens
        </span>
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-[#1e2329] rounded-lg text-gray-500 hover:text-white"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {positions.map((pos, index) => (
        <motion.div
          key={pos.mint}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link 
            href={`/trade/${pos.mint}`}
            className="flex items-center gap-3 p-4 bg-[#0d1117] border border-[#1e2329] rounded-xl hover:border-[#02c076]/30 transition-colors"
          >
            <div className="relative">
              {pos.logoURI ? (
                <img 
                  src={pos.logoURI} 
                  alt={pos.symbol} 
                  className="w-10 h-10 rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={cn(
                "w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e2329] to-[#2d3748] flex items-center justify-center",
                pos.logoURI && "hidden"
              )}>
                <span className="text-xs font-bold text-gray-400">
                  {pos.symbol.slice(0, 2)}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{pos.symbol}</span>
              </div>
              <span className="text-xs text-gray-500">
                {formatNumber(pos.uiBalance)} tokens
              </span>
            </div>

            <div className="text-right">
              <p className="font-bold text-white text-sm">${pos.value.toFixed(2)}</p>
              <p className={cn(
                "text-xs font-medium",
                pos.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {pos.priceChange24h >= 0 ? "+" : ""}{pos.priceChange24h.toFixed(1)}%
              </p>
            </div>

            <ChevronRight className="w-4 h-4 text-gray-600" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function HistoryTab({ trades }: { trades: any[] }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Activity className="w-12 h-12 text-gray-700 mb-4" />
        <p className="text-gray-500 text-sm">No trade history</p>
        <Link href="/" className="text-[#02c076] text-sm mt-2 hover:underline">
          Start trading →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.slice(0, 20).map((trade, index) => (
        <motion.div
          key={trade.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          <Link 
            href={`/trade/${trade.tokenAddress}`}
            className="flex items-center gap-3 p-3 bg-[#0d1117] border border-[#1e2329] rounded-xl hover:border-[#1e2329] transition-colors"
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              trade.type === "buy" ? "bg-emerald-500/20" : "bg-red-500/20"
            )}>
              {trade.type === "buy" ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{trade.tokenSymbol}</span>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                  trade.type === "buy" 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : "bg-red-500/20 text-red-400"
                )}>
                  {trade.type.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {timeAgo(trade.timestamp)}
              </span>
            </div>

            <div className="text-right">
              <p className="text-sm text-white font-medium">
                {trade.amountIn.toFixed(4)} {trade.type === "buy" ? "SOL" : trade.tokenSymbol}
              </p>
              <p className="text-xs text-gray-500">
                @ ${formatPrice(trade.price)}
              </p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
