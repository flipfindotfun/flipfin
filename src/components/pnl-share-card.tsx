"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Share2, 
  Download, 
  Copy, 
  Check, 
  TrendingUp, 
  TrendingDown,
  Trophy,
  Flame,
  Zap,
  Star,
  X
} from "lucide-react";
import { PnLSummary, TokenPnL } from "@/hooks/use-pnl";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";

interface PnLShareCardProps {
  summary: PnLSummary;
  topTokens: TokenPnL[];
  walletAddress: string;
  onClose: () => void;
}

export function PnLShareCard({ summary, topTokens, walletAddress, onClose }: PnLShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isPositive = summary.totalPnl >= 0;
  const shortWallet = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // Small delay to ensure all animations and images are ready
      await new Promise(resolve => setTimeout(resolve, 100));
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3, // Higher resolution
        backgroundColor: "#0b0e11",
        cacheBust: true,
        skipFonts: true, // Often solves flickering/font issues
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });
      const link = document.createElement("a");
      link.download = `pnl-${shortWallet}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download:", err);
    }
    setDownloading(false);
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;
    setCopying(true);
    try {
      // Small delay to ensure all animations and images are ready
      await new Promise(resolve => setTimeout(resolve, 100));
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3, // Higher resolution
        backgroundColor: "#0b0e11",
        cacheBust: true,
        skipFonts: true, // Often solves flickering/font issues
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
    setTimeout(() => setCopying(false), 2000);
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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-md w-full"
      >
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 p-2 bg-[#1e2329] rounded-full hover:bg-[#2b3139] transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        <div
          ref={cardRef}
          className={cn(
            "relative overflow-hidden rounded-2xl p-6",
            "bg-gradient-to-br",
            isPositive 
              ? "from-[#0d1117] via-[#0d1a12] to-[#0d1117]" 
              : "from-[#0d1117] via-[#1a0d0d] to-[#0d1117]"
          )}
          style={{ 
            border: `1px solid ${isPositive ? 'rgba(2, 192, 118, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            boxShadow: isPositive 
              ? '0 0 60px rgba(2, 192, 118, 0.15)' 
              : '0 0 60px rgba(239, 68, 68, 0.15)'
          }}
        >
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className={cn(
              "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30",
              isPositive ? "bg-emerald-500" : "bg-red-500"
            )} />
            <div className={cn(
              "absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-20",
              isPositive ? "bg-emerald-500" : "bg-red-500"
            )} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  isPositive ? "bg-emerald-500/20" : "bg-red-500/20"
                )}>
                  {isPositive ? (
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Flame className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Trader</p>
                  <p className="text-sm font-bold text-white">{shortWallet}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Win Rate</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400" />
                  <span className="text-sm font-bold text-white">{summary.winRate.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-xs text-gray-400 mb-1">Total PnL</p>
              <div className="flex items-center justify-center gap-2">
                {isPositive ? (
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-400" />
                )}
                <span className={cn(
                  "text-4xl font-black",
                  isPositive ? "text-emerald-400" : "text-red-400"
                )}>
                  {isPositive ? "+" : ""}{summary.totalPnl.toFixed(4)}
                </span>
                <span className="text-xl text-gray-400">SOL</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatBox 
                label="Realized" 
                value={`${summary.totalRealized >= 0 ? "+" : ""}${summary.totalRealized.toFixed(3)}`}
                positive={summary.totalRealized >= 0}
              />
              <StatBox 
                label="Unrealized" 
                value={`${summary.totalUnrealized >= 0 ? "+" : ""}${summary.totalUnrealized.toFixed(3)}`}
                positive={summary.totalUnrealized >= 0}
              />
              <StatBox 
                label="Trades" 
                value={`${summary.winningTrades}W/${summary.losingTrades}L`}
                neutral
              />
            </div>

            {topTokens.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Top Performers</p>
                <div className="space-y-2">
                  {topTokens.slice(0, 3).map((token, idx) => (
                    <div 
                      key={token.mint}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
                    >
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                        idx === 0 ? "bg-amber-500/20 text-amber-400" :
                        idx === 1 ? "bg-gray-400/20 text-gray-300" :
                        "bg-orange-600/20 text-orange-400"
                      )}>
                        {idx + 1}
                      </span>
                        {token.image ? (
                          <img src={token.image} alt="" className="w-5 h-5 rounded-full" crossOrigin="anonymous" />
                        ) : (

                        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center">
                          <span className="text-[8px] text-gray-400">{token.symbol.slice(0, 2)}</span>
                        </div>
                      )}
                      <span className="text-xs font-medium text-white flex-1">{token.symbol}</span>
                      <span className={cn(
                        "text-xs font-bold",
                        token.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {token.totalPnl >= 0 ? "+" : ""}{token.totalPnl.toFixed(3)} SOL
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/10">
              <Zap className="w-4 h-4 text-[#02c076]" />
              <span className="text-xs text-gray-400">Powered by</span>
              <span className="text-xs font-bold text-white">Flip Finance</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e2329] rounded-xl text-white text-sm font-medium hover:bg-[#2b3139] transition-colors"
          >
            {copying ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Image
              </>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#02c076] to-[#02a566] rounded-xl text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Saving..." : "Download"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatBox({ 
  label, 
  value, 
  positive,
  neutral
}: { 
  label: string; 
  value: string;
  positive?: boolean;
  neutral?: boolean;
}) {
  return (
    <div className="text-center p-2 rounded-lg bg-white/5">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className={cn(
        "text-sm font-bold",
        neutral ? "text-white" : positive ? "text-emerald-400" : "text-red-400"
      )}>
        {value}
      </p>
    </div>
  );
}
