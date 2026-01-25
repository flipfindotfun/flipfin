"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Plus,
  Trash2,
  Copy,
  Check,
  Settings,
  TrendingUp,
  TrendingDown,
  Loader2,
  Search,
  Users,
  Zap,
  Shield,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  X,
  User,
  Activity,
  BarChart3,
  DollarSign,
  PieChart
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { cn } from "@/lib/utils";
import { formatNumber, timeAgo } from "@/lib/types";
import Link from "next/link";

interface TrackedWallet {
  id: string;
  user_wallet: string;
  tracked_wallet: string;
  label: string | null;
  is_copy_trading: boolean;
  insta_buy_enabled: boolean;
  insta_buy_amount: number;
  created_at: string;
  recentActivity: {
    signature: string;
    timestamp: number;
    type: "buy" | "sell";
    tokenMint: string;
    tokenSymbol: string;
    tokenImage?: string;
    tokenAmount: number;
  }[];
}

interface WalletStats {
  winRate: number;
  totalPnlUsd: number;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
}

interface CopyTradeSettings {
  enabled: boolean;
  max_sol_per_trade: number;
  copy_percentage: number;
  min_sol_balance: number;
  max_slippage: number;
  only_buys: boolean;
  auto_sell: boolean;
  blacklisted_tokens: string[];
  priority_fee: number;
  delay_seconds: number;
  stop_loss_percent: number;
  take_profit_percent: number;
}

export default function TrackerPage() {
  const { publicKey } = useWallet();
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [settings, setSettings] = useState<CopyTradeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<TrackedWallet | null>(null);

  const fetchData = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const [walletsRes, settingsRes] = await Promise.all([
        fetch(`/api/tracker?userWallet=${publicKey}`),
        fetch(`/api/copy-trade/settings?userWallet=${publicKey}`)
      ]);
      const walletsData = await walletsRes.json();
      const settingsData = await settingsRes.json();
      setWallets(walletsData.wallets || []);
      setSettings(settingsData.settings);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
    setLoading(false);
  }, [publicKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0b0e11] p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1e2329] to-[#2d3748] flex items-center justify-center mx-auto mb-4">
            <Eye className="w-10 h-10 text-gray-600" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Wallet Tracker</h2>
          <p className="text-gray-500 text-sm text-center max-w-sm mb-6">
            Generate or import a wallet to track other wallets and enable copy trading
          </p>
          <Link 
            href="/wallet" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#02c076] to-[#02a566] text-black font-bold rounded-xl"
          >
            Manage Wallet
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-hidden">
      <div className="flex-none px-4 sm:px-6 py-4 border-b border-[#1e2329]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Wallet Tracker</h1>
            <p className="text-sm text-gray-500">Track & copy trade smart wallets</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#02c076] to-[#02a566] text-black font-bold rounded-xl text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Wallet
            </motion.button>
          </div>
        </div>

        {settings && (
          <div className="mt-4 flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium",
              settings.enabled 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "bg-gray-500/20 text-gray-400"
            )}>
              <Zap className="w-3 h-3" />
              Copy Trading: {settings.enabled ? "Active" : "Disabled"}
            </div>
            <div className="text-xs text-gray-500">
              Max: {settings.max_sol_per_trade} SOL | Slippage: {settings.max_slippage}%
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#02c076]" />
          </div>
        ) : wallets.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <Users className="w-12 h-12 text-gray-700 mb-4" />
            <p className="text-gray-500 text-sm">No wallets tracked yet</p>
            <p className="text-gray-600 text-xs mt-1 mb-4">Add a wallet to start tracking</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-[#02c076] text-sm hover:underline"
            >
              + Add your first wallet
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet, idx) => (
              <WalletCard 
                key={wallet.id} 
                wallet={wallet}
                index={idx}
                onDelete={() => handleDelete(wallet.tracked_wallet)}
                onToggleCopy={() => handleToggleCopy(wallet)}
                onViewProfile={() => setViewingProfile(wallet)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddWalletModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddWallet}
          />
        )}
        {showSettings && settings && (
          <CopyTradeSettingsModal
            settings={settings}
            onClose={() => setShowSettings(false)}
            onSave={handleSaveSettings}
          />
        )}
        {viewingProfile && (
          <WalletProfileModal
            wallet={viewingProfile}
            onClose={() => setViewingProfile(null)}
            onSave={handleUpdateWallet}
          />
        )}
      </AnimatePresence>
    </div>
  );

  async function handleAddWallet(address: string, label: string, copyTrade: boolean) {
    try {
      await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: publicKey,
          trackedWallet: address,
          label,
          isCopyTrading: copyTrade,
          instaBuyEnabled: false,
          instaBuyAmount: 0.1
        })
      });
      fetchData();
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding wallet:", err);
    }
  }

  async function handleUpdateWallet(wallet: TrackedWallet) {
    try {
      await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: publicKey,
          trackedWallet: wallet.tracked_wallet,
          label: wallet.label,
          isCopyTrading: wallet.is_copy_trading,
          instaBuyEnabled: wallet.insta_buy_enabled,
          instaBuyAmount: wallet.insta_buy_amount
        })
      });
      setWallets(w => w.map(x => x.id === wallet.id ? wallet : x));
      setViewingProfile(null);
    } catch (err) {
      console.error("Error updating wallet:", err);
    }
  }

  async function handleDelete(trackedWallet: string) {
    try {
      await fetch(`/api/tracker?userWallet=${publicKey}&trackedWallet=${trackedWallet}`, {
        method: "DELETE"
      });
      setWallets(w => w.filter(x => x.tracked_wallet !== trackedWallet));
    } catch (err) {
      console.error("Error deleting wallet:", err);
    }
  }

  async function handleToggleCopy(wallet: TrackedWallet) {
    try {
      await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: publicKey,
          trackedWallet: wallet.tracked_wallet,
          label: wallet.label,
          isCopyTrading: !wallet.is_copy_trading
        })
      });
      setWallets(w => w.map(x => 
        x.id === wallet.id ? { ...x, is_copy_trading: !x.is_copy_trading } : x
      ));
    } catch (err) {
      console.error("Error toggling copy:", err);
    }
  }

  async function handleSaveSettings(newSettings: CopyTradeSettings) {
    try {
      await fetch("/api/copy-trade/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: publicKey,
          settings: newSettings
        })
      });
      setSettings(newSettings);
      setShowSettings(false);
    } catch (err) {
      console.error("Error saving settings:", err);
    }
  }
}

function WalletCard({ 
  wallet, 
  index,
  onDelete,
  onToggleCopy,
  onViewProfile
}: { 
  wallet: TrackedWallet;
  index: number;
  onDelete: () => void;
  onToggleCopy: () => void;
  onViewProfile: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const shortAddr = `${wallet.tracked_wallet.slice(0, 6)}...${wallet.tracked_wallet.slice(-4)}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.tracked_wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[#0d1117] border border-[#1e2329] rounded-xl overflow-hidden group cursor-pointer"
      onClick={onViewProfile}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white group-hover:text-[#02c076] transition-colors">
                  {wallet.label || shortAddr}
                </span>
                <div className="flex gap-1">
                  {wallet.is_copy_trading && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-medium">
                      COPY
                    </span>
                  )}
                  {wallet.insta_buy_enabled && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400 font-medium uppercase">
                      Insta: {wallet.insta_buy_amount} SOL
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyAddress();
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
              >
                {shortAddr}
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={onToggleCopy}
              className={cn(
                "p-2 rounded-lg transition-colors",
                wallet.is_copy_trading 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-[#1e2329] text-gray-500 hover:text-white"
              )}
              title={wallet.is_copy_trading ? "Disable copy trading" : "Enable copy trading"}
            >
              <Zap className="w-4 h-4" />
            </button>
            <a
              href={`https://solscan.io/account/${wallet.tracked_wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#1e2329] rounded-lg text-gray-500 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onDelete}
              className="p-2 bg-[#1e2329] rounded-lg text-gray-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {wallet.recentActivity && wallet.recentActivity.length > 0 && (
          <div className="border-t border-[#1e2329] pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500 uppercase font-medium">Trade History</p>
              <span className="text-[10px] text-gray-600">{wallet.recentActivity.length} Swaps</span>
            </div>
            <div className="space-y-2">
              {wallet.recentActivity.slice(0, 3).map((activity) => (
                <div key={activity.signature} className="flex items-center justify-between p-2 rounded-lg bg-[#161a1f] group/item hover:bg-[#1e2329] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      activity.type === "buy" 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-red-500/10 text-red-400"
                    )}>
                      {activity.type === "buy" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white font-bold">
                          {activity.tokenSymbol}
                        </span>
                        {activity.tokenImage && (
                          <img 
                            src={activity.tokenImage} 
                            alt={activity.tokenSymbol}
                            className="w-3.5 h-3.5 rounded-full"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-[10px] font-medium",
                          activity.type === "buy" ? "text-emerald-500" : "text-red-500"
                        )}>
                          {activity.type.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {formatNumber(activity.tokenAmount)} {activity.tokenSymbol}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white font-medium">
                      {timeAgo(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              {wallet.recentActivity.length > 3 && (
                <p className="text-[10px] text-center text-gray-600 font-medium py-1">
                  + {wallet.recentActivity.length - 3} more trades in profile
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function WalletProfileModal({
  wallet,
  onClose,
  onSave
}: {
  wallet: TrackedWallet;
  onClose: () => void;
  onSave: (wallet: TrackedWallet) => void;
}) {
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"trades" | "stats" | "settings">("trades");
  
  // Settings state
  const [label, setLabel] = useState(wallet.label || "");
  const [copyTrade, setCopyTrade] = useState(wallet.is_copy_trading);
  const [instaBuy, setInstaBuy] = useState(wallet.insta_buy_enabled);
  const [instaAmount, setInstaAmount] = useState(wallet.insta_buy_amount || 0.1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/tracker/profile?wallet=${wallet.tracked_wallet}`);
        const data = await res.json();
        setStats(data.stats);
      } catch (err) {
        console.error("Error fetching profile stats:", err);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [wallet.tracked_wallet]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      ...wallet,
      label,
      is_copy_trading: copyTrade,
      insta_buy_enabled: instaBuy,
      insta_buy_amount: instaAmount
    });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0d1117] border border-[#1e2329] rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#1e2329] bg-gradient-to-br from-[#1e2329]/50 to-transparent">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/5 shadow-2xl">
                <User className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {wallet.label || "Smart Wallet"}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-500">
                    {wallet.tracked_wallet.slice(0, 8)}...{wallet.tracked_wallet.slice(-8)}
                  </span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(wallet.tracked_wallet)}
                    className="p-1 hover:bg-[#1e2329] rounded text-gray-600 hover:text-white transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#1e2329] rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-4 mt-8">
            <button 
              onClick={() => setActiveTab("trades")}
              className={cn(
                "pb-2 text-sm font-bold transition-colors relative",
                activeTab === "trades" ? "text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              Trades
              {activeTab === "trades" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#02c076]" />}
            </button>
            <button 
              onClick={() => setActiveTab("stats")}
              className={cn(
                "pb-2 text-sm font-bold transition-colors relative",
                activeTab === "stats" ? "text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              Win Rate & PnL
              {activeTab === "stats" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#02c076]" />}
            </button>
            <button 
              onClick={() => setActiveTab("settings")}
              className={cn(
                "pb-2 text-sm font-bold transition-colors relative",
                activeTab === "settings" ? "text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              Settings
              {activeTab === "settings" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#02c076]" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "trades" && (
            <div className="space-y-3">
              {wallet.recentActivity && wallet.recentActivity.length > 0 ? (
                wallet.recentActivity.map((activity) => (
                  <div key={activity.signature} className="flex items-center justify-between p-4 rounded-xl bg-[#1e2329]/50 border border-[#2b3139] hover:bg-[#1e2329] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        activity.type === "buy" 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : "bg-red-500/10 text-red-400"
                      )}>
                        {activity.type === "buy" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-bold">{activity.tokenSymbol}</span>
                          {activity.tokenImage && (
                            <img src={activity.tokenImage} alt={activity.tokenSymbol} className="w-4 h-4 rounded-full" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-xs font-bold px-1.5 py-0.5 rounded",
                            activity.type === "buy" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                          )}>
                            {activity.type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatNumber(activity.tokenAmount)} {activity.tokenSymbol}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white font-medium">{timeAgo(activity.timestamp)}</div>
                      <a 
                        href={`https://solscan.io/tx/${activity.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-[#02c076] inline-flex items-center gap-1 mt-1"
                      >
                        View Tx <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                  <Activity className="w-12 h-12 mb-4" />
                  <p>No recent trades found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#02c076]" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl bg-[#1e2329]/50 border border-[#2b3139]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <BarChart3 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-sm text-gray-400">Win Rate</span>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-white">{(stats?.winRate || 0).toFixed(1)}%</span>
                        <span className="text-xs text-gray-500 mb-1">avg</span>
                      </div>
                      <div className="mt-4 flex gap-1 h-1.5 rounded-full overflow-hidden bg-[#2b3139]">
                        <div className="bg-emerald-500" style={{ width: `${stats?.winRate}%` }} />
                        <div className="bg-red-500" style={{ width: `${100 - (stats?.winRate || 0)}%` }} />
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-[#1e2329]/50 border border-[#2b3139]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <DollarSign className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-400">Total PnL</span>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          (stats?.totalPnlUsd || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          ${formatNumber(Math.abs(stats?.totalPnlUsd || 0))}
                        </span>
                        <span className="text-xs text-gray-500 mb-1">USD</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase">
                        <span>Realized: ${formatNumber(stats?.realizedPnlUsd || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-[#1e2329]/50 border border-[#2b3139]">
                    <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-purple-400" />
                      Performance Breakdown
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Total Trades</span>
                        <span className="text-white font-bold">{stats?.totalTrades}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Wins</span>
                        <span className="text-emerald-400 font-bold">{stats?.winCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Losses</span>
                        <span className="text-red-400 font-bold">{stats?.lossCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Unrealized Profit</span>
                        <span className={cn(
                          "font-bold",
                          (stats?.unrealizedPnlUsd || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          ${formatNumber(stats?.unrealizedPnlUsd || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <label className="text-xs text-gray-400 block mb-2 font-bold uppercase">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Enter wallet label"
                  className="w-full px-4 py-3 bg-[#1e2329] border border-[#2b3139] rounded-xl text-white text-sm focus:outline-none focus:border-[#02c076]"
                />
              </div>

              <div className="space-y-3">
                <ToggleSetting
                  label="Copy Trading"
                  description="Automatically copy all trades from this wallet"
                  value={copyTrade}
                  onChange={setCopyTrade}
                />

                <ToggleSetting
                  label="Insta-Buy"
                  description="Auto-buy new tokens as soon as they buy them"
                  value={instaBuy}
                  onChange={setInstaBuy}
                />

                {instaBuy && (
                  <div className="p-4 rounded-xl bg-[#1e2329] border border-[#2b3139] shadow-inner">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-white">Insta-Buy Amount</span>
                      <span className="text-sm font-bold text-[#02c076]">{instaAmount} SOL</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[0.1, 0.25, 0.5, 1.0].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setInstaAmount(amt)}
                          className={cn(
                            "py-1.5 rounded-lg text-xs font-bold border transition-colors",
                            instaAmount === amt 
                              ? "bg-[#02c076] border-[#02c076] text-black" 
                              : "bg-[#2b3139] border-[#3b4149] text-gray-400 hover:border-gray-500"
                          )}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min={0.01}
                      max={5}
                      step={0.01}
                      value={instaAmount}
                      onChange={(e) => setInstaAmount(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#2b3139] rounded-lg appearance-none cursor-pointer accent-[#02c076]"
                    />
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-[#02c076] to-[#02a566] text-black font-bold rounded-xl shadow-lg shadow-[#02c076]/10"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Profile Settings"}
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddWalletModal({
  onClose,
  onAdd
}: {
  onClose: () => void;
  onAdd: (address: string, label: string, copyTrade: boolean) => void;
}) {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [copyTrade, setCopyTrade] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!address || address.length < 32) return;
    setLoading(true);
    await onAdd(address, label, copyTrade);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0d1117] border border-[#1e2329] rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Track Wallet</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#1e2329] rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-2">Wallet Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter Solana wallet address"
              className="w-full px-4 py-3 bg-[#1e2329] border border-[#2b3139] rounded-xl text-white text-sm focus:outline-none focus:border-[#02c076]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-2">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Smart Money #1"
              className="w-full px-4 py-3 bg-[#1e2329] border border-[#2b3139] rounded-xl text-white text-sm focus:outline-none focus:border-[#02c076]"
            />
          </div>

          <div 
            onClick={() => setCopyTrade(!copyTrade)}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors",
              copyTrade 
                ? "bg-emerald-500/10 border-emerald-500/30" 
                : "bg-[#1e2329] border-[#2b3139] hover:border-[#3b4149]"
            )}
          >
            <div className="flex items-center gap-3">
              <Zap className={cn("w-5 h-5", copyTrade ? "text-emerald-400" : "text-gray-500")} />
              <div>
                <p className="text-sm font-medium text-white">Enable Copy Trading</p>
                <p className="text-xs text-gray-500">Auto-copy trades from this wallet</p>
              </div>
            </div>
            <div className={cn(
              "w-10 h-6 rounded-full transition-colors relative",
              copyTrade ? "bg-emerald-500" : "bg-[#2b3139]"
            )}>
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                copyTrade ? "translate-x-5" : "translate-x-1"
              )} />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!address || address.length < 32 || loading}
            className="w-full py-3 bg-gradient-to-r from-[#02c076] to-[#02a566] text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Add Wallet"
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CopyTradeSettingsModal({
  settings,
  onClose,
  onSave
}: {
  settings: CopyTradeSettings;
  onClose: () => void;
  onSave: (settings: CopyTradeSettings) => void;
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(localSettings);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0d1117] border border-[#1e2329] rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#02c076]" />
            <h2 className="text-lg font-bold text-white">Copy Trade Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#1e2329] rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-5">
          <ToggleSetting
            label="Enable Copy Trading"
            description="Automatically copy trades from tracked wallets"
            value={localSettings.enabled}
            onChange={(v) => setLocalSettings({ ...localSettings, enabled: v })}
          />

            <div className="border-t border-[#1e2329] pt-4">
              <h3 className="text-sm font-medium text-white mb-4">Trade Limits</h3>

              <div className="space-y-4">
                <SliderSetting
                  label="Max SOL per Trade"
                  value={localSettings.max_sol_per_trade}
                  min={0.01}
                  max={10}
                  step={0.01}
                  suffix=" SOL"
                  onChange={(v) => setLocalSettings({ ...localSettings, max_sol_per_trade: v })}
                />

                <SliderSetting
                  label="Copy Percentage"
                  value={localSettings.copy_percentage}
                  min={10}
                  max={100}
                  step={5}
                  suffix="%"
                  onChange={(v) => setLocalSettings({ ...localSettings, copy_percentage: v })}
                />

                <SliderSetting
                  label="Min SOL Balance"
                  value={localSettings.min_sol_balance}
                  min={0.01}
                  max={1}
                  step={0.01}
                  suffix=" SOL"
                  description="Stop copying if balance falls below"
                  onChange={(v) => setLocalSettings({ ...localSettings, min_sol_balance: v })}
                />

                <SliderSetting
                  label="Max Slippage"
                  value={localSettings.max_slippage}
                  min={1}
                  max={50}
                  step={1}
                  suffix="%"
                  onChange={(v) => setLocalSettings({ ...localSettings, max_slippage: v })}
                />

                <SliderSetting
                  label="Priority Fee"
                  value={localSettings.priority_fee ?? 0.001}
                  min={0}
                  max={0.1}
                  step={0.001}
                  suffix=" SOL"
                  description="Higher fee = faster execution"
                  onChange={(v) => setLocalSettings({ ...localSettings, priority_fee: v })}
                />

                <SliderSetting
                  label="Copy Delay"
                  value={localSettings.delay_seconds ?? 0}
                  min={0}
                  max={30}
                  step={1}
                  suffix="s"
                  description="Wait before copying (0 = instant)"
                  onChange={(v) => setLocalSettings({ ...localSettings, delay_seconds: v })}
                />
              </div>
            </div>

            <div className="border-t border-[#1e2329] pt-4">
              <h3 className="text-sm font-medium text-white mb-4">Risk Management</h3>

              <div className="space-y-4">
                <SliderSetting
                  label="Stop Loss"
                  value={localSettings.stop_loss_percent ?? 50}
                  min={10}
                  max={100}
                  step={5}
                  suffix="%"
                  description="Auto-sell if position drops by this %"
                  onChange={(v) => setLocalSettings({ ...localSettings, stop_loss_percent: v })}
                />

                <SliderSetting
                  label="Take Profit"
                  value={localSettings.take_profit_percent ?? 100}
                  min={20}
                  max={500}
                  step={10}
                  suffix="%"
                  description="Auto-sell if position gains by this %"
                  onChange={(v) => setLocalSettings({ ...localSettings, take_profit_percent: v })}
                />
              </div>
            </div>

          <div className="border-t border-[#1e2329] pt-4">
            <h3 className="text-sm font-medium text-white mb-4">Trade Options</h3>

            <div className="space-y-3">
              <ToggleSetting
                label="Only Copy Buys"
                description="Don't copy sell orders"
                value={localSettings.only_buys}
                onChange={(v) => setLocalSettings({ ...localSettings, only_buys: v })}
              />

              <ToggleSetting
                label="Auto Sell"
                description="Automatically sell when tracked wallet sells"
                value={localSettings.auto_sell}
                onChange={(v) => setLocalSettings({ ...localSettings, auto_sell: v })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              Copy trading involves risk. Only use funds you can afford to lose.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-[#02c076] to-[#02a566] text-black font-bold rounded-xl"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Settings"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ToggleSetting({
  label,
  description,
  value,
  onChange
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div 
      onClick={() => onChange(!value)}
      className="flex items-center justify-between p-3 rounded-xl bg-[#1e2329] cursor-pointer"
    >
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <div className={cn(
        "w-10 h-6 rounded-full transition-colors relative",
        value ? "bg-emerald-500" : "bg-[#2b3139]"
      )}>
        <div className={cn(
          "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
          value ? "translate-x-5" : "translate-x-1"
        )} />
      </div>
    </div>
  );
}

function SliderSetting({
  label,
  value,
  min,
  max,
  step,
  suffix,
  description,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  description?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm text-gray-300">{label}</span>
          {description && <p className="text-[10px] text-gray-500">{description}</p>}
        </div>
        <span className="text-sm font-bold text-white">
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-[#1e2329] rounded-lg appearance-none cursor-pointer accent-[#02c076]"
      />
    </div>
  );
}
