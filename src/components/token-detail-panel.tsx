"use client";

import { useState, useEffect } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Copy,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronDown,
  Zap,
} from "lucide-react";
import { useApp } from "@/lib/context";
import { useWallet } from "@/lib/wallet-context";
import { useJupiter } from "@/hooks/use-jupiter";
import { formatNumber, formatPrice, timeAgo, shortenAddress } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { TradingViewChart } from "@/components/trading-view-chart";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export function TokenDetailPanel() {
  const { selectedToken, setSelectedToken, settings, updateSettings, addTrade } = useApp();
  const { publicKey, wallet, balance } = useWallet();
  const { getQuote, swap, loading: isSwapping, PLATFORM_FEE_BPS } = useJupiter();
  
  const [buyAmount, setBuyAmount] = useState(settings.buyAmountSOL.toString());
  const [isTrading, setIsTrading] = useState(false);
  const [activeTradeTab, setActiveTradeTab] = useState<"buy" | "sell">("buy");

  if (!selectedToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 sm:p-8 text-center bg-[#0a0a0a]">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#00d991]/20 to-[#8b5cf6]/20 flex items-center justify-center mb-4 sm:mb-6">
          <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-[#00d991]" />
        </div>
        <h3 className="text-white font-bold text-base sm:text-lg mb-2">Select a Token</h3>
        <p className="text-xs sm:text-sm text-gray-500 max-w-[200px]">Click any token from the list to view charts and start trading</p>
      </div>
    );
  }

  const isPositive = selectedToken.priceChange24h >= 0;

  const handleTrade = async (side: 'buy' | 'sell') => {
    if (!publicKey || !wallet) {
      toast.error("Please generate or import a wallet first");
      return;
    }

    setIsTrading(true);
    try {
      const amount = parseFloat(buyAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Invalid amount");
        return;
      }

      const inputMint = side === 'buy' ? SOL_MINT : selectedToken.address;
      const outputMint = side === 'buy' ? selectedToken.address : SOL_MINT;
      const rawAmount = side === 'buy' ? Math.floor(amount * 1e9) : 0;

      const quote = await getQuote(inputMint, outputMint, rawAmount, settings.slippagePercent * 100);
      if (!quote || quote.error) throw new Error(quote?.error || "Failed to get quote");

      const signature = await swap(quote);
      
      if (signature) {
        const tradeData = {
          wallet_address: publicKey,
          token_address: selectedToken.address,
          token_symbol: selectedToken.symbol,
          side: side,
          amount: amount,
          price: selectedToken.price,
          tx_hash: signature
        };

        await supabase.from('user_trades').insert(tradeData);
        
        addTrade({
          id: signature,
          tokenAddress: selectedToken.address,
          tokenSymbol: selectedToken.symbol,
          type: side,
          amountIn: amount,
          amountOut: parseFloat(quote.outAmount) / Math.pow(10, selectedToken.decimals),
          price: selectedToken.price,
          timestamp: Date.now(),
          signature: signature,
          status: 'confirmed'
        });
      }
    } catch (error: any) {
      console.error("Trade failed:", error);
      toast.error(error.message || "Trade failed");
    } finally {
      setIsTrading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(selectedToken.address);
    toast.success("Address copied!");
  };

  const securityScore = selectedToken.security?.score || 0;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {selectedToken.logoURI ? (
            <img src={selectedToken.logoURI} alt={selectedToken.symbol} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#111] flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#00d991] to-[#8b5cf6] flex items-center justify-center text-black font-bold text-xs sm:text-sm flex-shrink-0">
              {selectedToken.symbol.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm sm:text-base truncate">{selectedToken.symbol}</span>
              <span className="text-gray-500 text-xs sm:text-sm">/SOL</span>
              <span className={cn(
                "text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded",
                isPositive ? "bg-[#00d991]/10 text-[#00d991]" : "bg-red-500/10 text-red-500"
              )}>
                {isPositive ? "+" : ""}{selectedToken.priceChange24h.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500">
              <span className="font-mono truncate">{shortenAddress(selectedToken.address, 4)}</span>
              <button onClick={copyAddress} className="hover:text-[#00d991] flex-shrink-0">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => setSelectedToken(null)}
          className="p-1.5 sm:p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors flex-shrink-0 lg:hidden"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Chart */}
        <div className="h-[200px] sm:h-[280px] lg:h-[320px] border-b border-[#1a1a1a] bg-[#0a0a0a]">
          <TradingViewChart symbol={selectedToken.symbol} tokenAddress={selectedToken.address} />
        </div>

        {/* Price & Stats */}
        <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-[#1a1a1a] bg-[#0d0d0d]">
          <div className="flex items-baseline gap-2 sm:gap-3 mb-3 sm:mb-4">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono">${formatPrice(selectedToken.price)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatBox label="MCap" value={`$${formatNumber(selectedToken.marketCap)}`} />
            <StatBox label="Liq" value={`$${formatNumber(selectedToken.liquidity)}`} />
            <StatBox label="Vol 24h" value={`$${formatNumber(selectedToken.volume24h)}`} />
          </div>
        </div>

        {/* Security */}
        <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00d991]" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Security</span>
            </div>
            <div className={cn(
              "px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold",
              securityScore >= 70 ? "bg-[#00d991]/20 text-[#00d991]" : 
              securityScore >= 40 ? "bg-yellow-500/20 text-yellow-500" : "bg-red-500/20 text-red-500"
            )}>
              {securityScore}/100
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <SecurityItem label="No Honeypot" safe={!selectedToken.security?.isHoneypot} />
            <SecurityItem label="Mint Off" safe={!selectedToken.security?.isMintable} />
            <SecurityItem label="Freeze Off" safe={!selectedToken.security?.isFreezable} />
            <SecurityItem label="LP Locked" safe={selectedToken.security?.liquidityLocked || false} />
          </div>
        </div>

        {/* Trade Panel */}
        <div className="px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            <button
              onClick={() => setActiveTradeTab("buy")}
              className={cn(
                "flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all",
                activeTradeTab === "buy" 
                  ? "bg-[#00d991] text-black" 
                  : "bg-[#1a1a1a] text-gray-400 hover:text-white"
              )}
            >
              BUY
            </button>
            <button
              onClick={() => setActiveTradeTab("sell")}
              className={cn(
                "flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all",
                activeTradeTab === "sell" 
                  ? "bg-red-500 text-white" 
                  : "bg-[#1a1a1a] text-gray-400 hover:text-white"
              )}
            >
              SELL
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <label className="text-[10px] sm:text-xs font-bold uppercase text-gray-500">Amount</label>
                <span className="text-[10px] sm:text-xs text-[#00d991]">Bal: {balance.toFixed(3)} SOL</span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="bg-[#111] border-[#262626] h-10 sm:h-11 pl-3 sm:pl-4 pr-14 sm:pr-16 font-mono text-sm sm:text-base"
                  placeholder="0.0"
                />
                <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold text-gray-500">SOL</span>
              </div>
              <div className="flex gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
                {[0.1, 0.5, 1, 2].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBuyAmount(amt.toString())}
                    className="flex-1 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold bg-[#1a1a1a] hover:bg-[#262626] rounded border border-[#262626] transition-colors"
                  >
                    {amt}
                  </button>
                ))}
                <button
                  onClick={() => setBuyAmount((balance * 0.9).toFixed(3))}
                  className="flex-1 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold bg-[#1a1a1a] hover:bg-[#262626] rounded border border-[#262626] transition-colors text-[#00d991]"
                >
                  MAX
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <label className="text-[10px] sm:text-xs font-bold uppercase text-gray-500">Slippage</label>
                <span className="text-[10px] sm:text-xs font-mono text-[#00d991]">{settings.slippagePercent}%</span>
              </div>
              <div className="flex gap-1 sm:gap-1.5">
                {[5, 10, 15, 25, 50].map((slip) => (
                  <button
                    key={slip}
                    onClick={() => updateSettings({ slippagePercent: slip })}
                    className={cn(
                      "flex-1 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold rounded border transition-colors",
                      settings.slippagePercent === slip
                        ? "bg-[#00d991] text-black border-[#00d991]"
                        : "bg-[#1a1a1a] text-gray-400 border-[#262626] hover:text-white"
                    )}
                  >
                    {slip}%
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] sm:text-xs text-gray-500 flex items-center justify-between px-1">
              <span>Platform Fee</span>
              <span className="text-[#00d991]">{PLATFORM_FEE_BPS / 100}%</span>
            </div>

            <Button
              onClick={() => handleTrade(activeTradeTab)}
              disabled={isTrading || isSwapping || !publicKey}
              className={cn(
                "w-full h-11 sm:h-12 text-sm sm:text-base font-bold uppercase tracking-wide",
                activeTradeTab === "buy"
                  ? "bg-[#00d991] hover:bg-[#00c282] text-black"
                  : "bg-red-500 hover:bg-red-600 text-white"
              )}
            >
              {(isTrading || isSwapping) ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                activeTradeTab === "buy" ? `Buy ${selectedToken.symbol}` : `Sell ${selectedToken.symbol}`
              )}
            </Button>

            {!publicKey && (
              <p className="text-center text-[10px] sm:text-xs text-yellow-500/80">
                Generate or import wallet to trade
              </p>
            )}
          </div>
        </div>

        {/* External Links */}
        <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-[#1a1a1a] grid grid-cols-2 gap-1.5 sm:gap-2">
          <a
            href={`https://dexscreener.com/solana/${selectedToken.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 text-[10px] sm:text-xs font-bold bg-[#1a1a1a] hover:bg-[#262626] rounded-lg border border-[#262626] transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            DexScreener
          </a>
          <a
            href={`https://birdeye.so/token/${selectedToken.address}?chain=solana`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 text-[10px] sm:text-xs font-bold bg-[#1a1a1a] hover:bg-[#262626] rounded-lg border border-[#262626] transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Birdeye
          </a>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 sm:p-2.5 bg-[#111] rounded-lg border border-[#1a1a1a]">
      <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase mb-0.5">{label}</p>
      <p className="text-xs sm:text-sm font-mono font-bold text-white truncate">{value}</p>
    </div>
  );
}

function SecurityItem({ label, safe }: { label: string; safe: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1.5 rounded border text-[9px] sm:text-[10px] font-bold",
        safe ? "bg-[#00d991]/5 border-[#00d991]/20 text-[#00d991]" : "bg-red-500/5 border-red-500/20 text-red-400"
      )}
    >
      {safe ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {label}
    </div>
  );
}
