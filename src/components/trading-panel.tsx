"use client";

import { useState } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Shield,
  ExternalLink,
  Copy,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Zap,
  Users,
  BarChart3,
  Clock,
} from "lucide-react";
import { useApp } from "@/lib/context";
import { useWallet } from "@/lib/wallet-context";
import { useJupiter } from "@/hooks/use-jupiter";
import { formatNumber, formatPrice, shortenAddress } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { DxChart } from "@/components/dx-chart";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export function TradingPanel() {
  const { selectedToken, setSelectedToken, settings, updateSettings, addTrade } = useApp();
  const { publicKey, wallet, balance } = useWallet();
  const { getQuote, swap, loading: isSwapping, PLATFORM_FEE_BPS } = useJupiter();
  
  const [buyAmount, setBuyAmount] = useState("0.1");
  const [isTrading, setIsTrading] = useState(false);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [timeframe, setTimeframe] = useState("5M");

  if (!selectedToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6 text-center bg-[#0b0e11]">
        <div className="w-16 h-16 rounded-2xl bg-[#1e2329] flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-[#02c076]" />
        </div>
        <h3 className="text-white font-semibold text-base mb-2">Select a Token</h3>
        <p className="text-xs text-gray-500">Click any token to view chart and trade</p>
      </div>
    );
  }

  const isPositive = selectedToken.priceChange24h >= 0;

  const handleTrade = async (side: 'buy' | 'sell') => {
    if (!publicKey || !wallet) {
      toast.error("Generate or import a wallet first");
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

        const slippageBps = Math.max(settings.slippagePercent * 100, 1500);
        
        const quote = await getQuote(inputMint, outputMint, rawAmount, slippageBps);
        if (!quote || quote.error) throw new Error(quote?.error || "Failed to get quote");

        const signature = await swap(quote);
      
        if (signature) {
          // Track points and volume
          fetch("/api/points/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet: publicKey,
              amount: amount, // 1$ = 1 point (simplified, usually volume based)
              volume: amount * (side === 'buy' ? selectedToken.price : selectedToken.price), // Approx USD volume
              type: "trade",
              description: `${side === 'buy' ? 'Bought' : 'Sold'} ${selectedToken.symbol}`
            })
          }).catch(err => console.error("Error adding points:", err));

          await supabase.from('user_trades').insert({
          wallet_address: publicKey,
          token_address: selectedToken.address,
          token_symbol: selectedToken.symbol,
          side: side,
          amount: amount,
          price: selectedToken.price,
          tx_hash: signature
        });
        
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
      toast.error(error.message || "Trade failed");
    } finally {
      setIsTrading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(selectedToken.address);
    toast.success("Address copied!");
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e11]">
      {/* Token Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e2329]">
        {selectedToken.logoURI ? (
          <img src={selectedToken.logoURI} alt={selectedToken.symbol} className="w-9 h-9 rounded-lg" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-[#1e2329] flex items-center justify-center text-xs font-bold text-gray-400">
            {selectedToken.symbol.slice(0, 2)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{selectedToken.symbol}</span>
            <span className="text-gray-500 text-xs truncate">{selectedToken.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="font-mono">{shortenAddress(selectedToken.address, 4)}</span>
            <button onClick={copyAddress} className="hover:text-[#02c076]">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
        <button onClick={() => setSelectedToken(null)} className="p-1.5 hover:bg-[#1e2329] rounded-lg lg:hidden">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-1 px-3 py-2 border-b border-[#1e2329] bg-[#0d1117]">
        <StatItem label="Price" value={`$${formatPrice(selectedToken.price)}`} />
        <StatItem label="Mkt Cap" value={`$${formatNumber(selectedToken.marketCap)}`} />
        <StatItem label="Liquidity" value={`$${formatNumber(selectedToken.liquidity)}`} />
        <StatItem label="Supply" value={formatNumber(selectedToken.marketCap / (selectedToken.price || 1))} />
      </div>

      {/* Chart */}
      <div className="h-[200px] sm:h-[240px] border-b border-[#1e2329]">
        <DxChart symbol={selectedToken.symbol} tokenAddress={selectedToken.address} marketCap={selectedToken.marketCap} currentPrice={selectedToken.price} />
      </div>


      {/* Trade Panel */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Buy/Sell Tabs */}
        <div className="flex rounded-lg overflow-hidden border border-[#1e2329]">
          <button
            onClick={() => setActiveTab("buy")}
            className={cn(
              "flex-1 py-2.5 text-sm font-bold transition-all",
              activeTab === "buy" ? "bg-[#02c076] text-black" : "bg-[#1e2329] text-gray-400 hover:text-white"
            )}
          >
            Buy
          </button>
          <button
            onClick={() => setActiveTab("sell")}
            className={cn(
              "flex-1 py-2.5 text-sm font-bold transition-all",
              activeTab === "sell" ? "bg-[#f6465d] text-white" : "bg-[#1e2329] text-gray-400 hover:text-white"
            )}
          >
            Sell
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Amount</span>
            <span className="text-[10px] text-[#02c076]">Bal: {balance.toFixed(3)} SOL</span>
          </div>
          <div className="relative">
            <Input
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              className="bg-[#1e2329] border-[#2b3139] h-10 pr-14 font-mono text-sm"
              placeholder="0.0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">SOL</span>
          </div>
          <div className="flex gap-1 mt-1.5">
            {[0.01, 0.02, 0.5, 1].map((amt) => (
              <button
                key={amt}
                onClick={() => setBuyAmount(amt.toString())}
                className="flex-1 py-1.5 text-[10px] font-bold bg-[#1e2329] hover:bg-[#2b3139] rounded border border-[#2b3139] text-gray-400 hover:text-white transition-all"
              >
                {amt}
              </button>
            ))}
          </div>
        </div>

        {/* Slippage */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Slippage</span>
            <span className="text-[10px] text-[#02c076] font-mono">{settings.slippagePercent}%</span>
          </div>
          <div className="flex gap-1">
            {[0.5, 1, 5, 15].map((slip) => (
              <button
                key={slip}
                onClick={() => updateSettings({ slippagePercent: slip })}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-bold rounded border transition-all",
                  settings.slippagePercent === slip
                    ? "bg-[#02c076] text-black border-[#02c076]"
                    : "bg-[#1e2329] text-gray-400 border-[#2b3139] hover:text-white"
                )}
              >
                {slip}%
              </button>
            ))}
          </div>
        </div>

        {/* Platform Fee */}
        <div className="flex items-center justify-between text-[10px] px-1 text-gray-500">
          <span>Platform Fee</span>
          <span className="text-[#02c076]">{PLATFORM_FEE_BPS / 100}%</span>
        </div>

        {/* Trade Button */}
        <Button
          onClick={() => handleTrade(activeTab)}
          disabled={isTrading || isSwapping || !publicKey}
          className={cn(
            "w-full h-11 font-bold text-sm",
            activeTab === "buy"
              ? "bg-[#02c076] hover:bg-[#02a566] text-black"
              : "bg-[#f6465d] hover:bg-[#d9304a] text-white"
          )}
        >
          {(isTrading || isSwapping) ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            `${activeTab === "buy" ? "Buy" : "Sell"} ${selectedToken.symbol}`
          )}
        </Button>

        {!publicKey && (
          <p className="text-center text-[10px] text-yellow-500/80">
            Generate or import wallet to trade
          </p>
        )}

        {/* Token Info */}
        <div className="pt-2 border-t border-[#1e2329] space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Top 10 Holders</span>
            <span className="text-[#02c076]">{selectedToken.security?.topHolderPercent || 0}%</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <SecurityBadge label="Mint Off" safe={!selectedToken.security?.isMintable} />
            <SecurityBadge label="Freeze Off" safe={!selectedToken.security?.isFreezable} />
          </div>
        </div>

        {/* External Links */}
        <div className="grid grid-cols-2 gap-1.5 pt-2">
          <a
            href={`https://dexscreener.com/solana/${selectedToken.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold bg-[#1e2329] hover:bg-[#2b3139] rounded text-gray-400 hover:text-white transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            DexScreener
          </a>
          <a
            href={`https://birdeye.so/token/${selectedToken.address}?chain=solana`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold bg-[#1e2329] hover:bg-[#2b3139] rounded text-gray-400 hover:text-white transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Birdeye
          </a>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] text-gray-500 uppercase">{label}</p>
      <p className="text-[11px] font-bold text-white truncate">{value}</p>
    </div>
  );
}

function SecurityBadge({ label, safe }: { label: string; safe: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[9px] font-bold",
      safe ? "bg-[#02c076]/10 text-[#02c076]" : "bg-[#f6465d]/10 text-[#f6465d]"
    )}>
      {safe ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {label}
    </div>
  );
}
