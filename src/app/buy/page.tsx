"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/header";
import { 
  Zap, 
  Shield, 
  TrendingUp, 
  Rocket, 
  Coins, 
  ArrowRight, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
  Users,
  Sparkles,
  ChevronRight,
  Flame,
  MousePointer2,
  Settings,
  ArrowDownUp
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useJupiter } from "@/hooks/use-jupiter";
import { formatNumber, formatPrice, shortenAddress } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/context";
import { useTokenPosition } from "@/hooks/use-token-positions";

const FLIP_CA = "DUkYuJ1gxHSuYh1Dky3CaGtawLCDWsqx7KVgLwCtpump";
const SOL_MINT = "So11111111111111111111111111111111111111112";

function formatCompactPrice(price: number) {
  if (!price) return "$0.00";
  if (price >= 0.01) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  
  const priceStr = price.toFixed(10);
  const match = priceStr.match(/^0\.0+(?=[1-9])/);
  if (!match) return `$${price.toFixed(6)}`;
  
  const zeroCount = match[0].length - 2;
  const remaining = priceStr.slice(match[0].length);
  return (
    <span>
      $0.0<sub className="bottom-0 text-[10px] mx-px">{zeroCount}</sub>{remaining.slice(0, 4)}
    </span>
  );
}

function GlowOrb({ className }: { className?: string }) {
  return (
    <div className={cn("absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 pointer-events-none", className)} />
  );
}

export default function BuyPage() {
  const { publicKey, wallet, balance } = useWallet();
  const { getQuote, swap, loading: isSwapping } = useJupiter();
  const { settings, addTrade } = useApp();
  const { position, loading: positionLoading, refetch: refetchPosition } = useTokenPosition(FLIP_CA);
  
  const [tokenData, setTokenData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  
  // Buy state
  const [buyAmount, setBuyAmount] = useState("0.1");
  const [buyMode, setBuyMode] = useState<"custom" | "percent">("custom");
  const [buyPercent, setBuyPercent] = useState(25);
  
  // Sell state
  const [sellAmount, setSellAmount] = useState("");
  const [sellMode, setSellMode] = useState<"percent" | "custom">("percent");
  const [sellPercent, setSellPercent] = useState(100);
  
  const [outAmount, setOutAmount] = useState<string>("0.00");
  const [isTrading, setIsTrading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState(settings.slippagePercent || 15);

  const lastParamsRef = useRef<any>(null);

  useEffect(() => {
    let retryDelay = 10000;
    let timer: NodeJS.Timeout;

    async function fetchTokenData() {
      try {
        const res = await fetch(`/api/token?address=${FLIP_CA}`);
        if (res.status === 429) {
          retryDelay = Math.min(retryDelay * 2, 60000);
          return;
        }
        
        const data = await res.json();
        if (data.success && data.data) {
          setTokenData(data.data);
          retryDelay = 10000;
        }
      } catch (err) {
        console.error("Error fetching token data:", err);
      }
    }

    fetchTokenData();
    timer = setInterval(fetchTokenData, 30000); // Increased to 30s
    
    return () => clearInterval(timer);
  }, []);

    const fetchQuote = useCallback(async () => {
      let inputMint: string;
      let outputMint: string;
      let rawAmount: number;
      let inAmountVal: number = 0;

      if (activeTab === 'buy') {
        if (buyMode === 'percent') {
          inAmountVal = (balance * buyPercent) / 100;
        } else {
          inAmountVal = parseFloat(buyAmount);
        }
        
        if (isNaN(inAmountVal) || inAmountVal <= 0) {
          setOutAmount("0.00");
          setQuoteError(null);
          return;
        }
        inputMint = SOL_MINT;
        outputMint = FLIP_CA;
        rawAmount = Math.floor(inAmountVal * 1e9);
      } else {
        if (!position || position.uiBalance <= 0) {
          setOutAmount("0.00");
          setQuoteError("No tokens to sell");
          return;
        }
        
        if (sellMode === 'percent') {
          inAmountVal = (position.uiBalance * sellPercent) / 100;
        } else {
          inAmountVal = parseFloat(sellAmount);
        }

        if (isNaN(inAmountVal) || inAmountVal <= 0) {
          setOutAmount("0.00");
          setQuoteError(null);
          return;
        }
        inputMint = FLIP_CA;
        outputMint = SOL_MINT;
        rawAmount = Math.floor(inAmountVal * Math.pow(10, position.decimals || 6));
      }

      // De-dupe identical requests
      const currentParams = { inputMint, outputMint, rawAmount, activeTab };
      if (JSON.stringify(lastParamsRef.current) === JSON.stringify(currentParams)) return;
      lastParamsRef.current = currentParams;

      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const quote = await getQuote(inputMint, outputMint, rawAmount, slippage);
        if (quote && !quote.error) {
          const outDecimals = activeTab === 'buy' ? (tokenData?.decimals || 6) : 9;
          setOutAmount((parseFloat(quote.outAmount) / Math.pow(10, outDecimals)).toString());
        } else {
          setOutAmount("0.00");
          setQuoteError(quote?.error || "No route found");
        }
      } catch (err: any) {
        console.error("Quote error:", err);
        setOutAmount("0.00");
        setQuoteError(err.message || "Failed to get quote");
      } finally {
        setQuoteLoading(false);
      }
    }, [buyAmount, buyMode, buyPercent, sellAmount, sellMode, sellPercent, activeTab, balance, position, getQuote]);


  useEffect(() => {
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  const handleCopy = () => {
    navigator.clipboard.writeText(FLIP_CA);
    setCopied(true);
    toast.success("Contract address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrade = async () => {
    if (!publicKey || !wallet) {
      toast.error("Generate or import a wallet first");
      return;
    }

    setIsTrading(true);
    try {
      let inputMint: string;
      let outputMint: string;
      let rawAmount: number;
      let inAmountVal: number;

      if (activeTab === 'buy') {
        inAmountVal = buyMode === 'percent' ? (balance * buyPercent) / 100 : parseFloat(buyAmount);
        if (isNaN(inAmountVal) || inAmountVal <= 0) throw new Error("Invalid amount");
        if (inAmountVal > balance) throw new Error("Insufficient SOL balance");
        inputMint = SOL_MINT;
        outputMint = FLIP_CA;
        rawAmount = Math.floor(inAmountVal * 1e9);
      } else {
        if (!position || position.uiBalance <= 0) throw new Error("No tokens to sell");
        inAmountVal = sellMode === 'percent' ? (position.uiBalance * sellPercent) / 100 : parseFloat(sellAmount);
        if (isNaN(inAmountVal) || inAmountVal <= 0) throw new Error("Invalid amount");
        if (inAmountVal > position.uiBalance) throw new Error("Insufficient token balance");
        inputMint = FLIP_CA;
        outputMint = SOL_MINT;
        rawAmount = Math.floor(inAmountVal * Math.pow(10, position.decimals || 6));
      }
      
      toast.loading("Getting final quote...");
      const quote = await getQuote(inputMint, outputMint, rawAmount, slippage);
      if (!quote || quote.error) throw new Error(quote?.error || "Failed to get quote");

      toast.dismiss();
      toast.loading("Executing swap...");
      const signature = await swap(quote);
      toast.dismiss();
      
      if (signature) {
        toast.success(`${activeTab === 'buy' ? 'Bought' : 'Sold'} $FLIP successfully!`);
        
        await supabase.from('user_trades').insert({
          wallet_address: publicKey,
          token_address: FLIP_CA,
          token_symbol: "FLIP",
          side: activeTab,
          amount: inAmountVal,
          price: tokenData?.price || 0,
          tx_hash: signature
        });
        
        addTrade({
          id: signature,
          tokenAddress: FLIP_CA,
          tokenSymbol: "FLIP",
          type: activeTab,
          amountIn: inAmountVal,
          amountOut: parseFloat(quote.outAmount) / (activeTab === 'buy' ? 1e6 : 1e9),
          price: tokenData?.price || 0,
          timestamp: Date.now(),
          signature: signature,
          status: 'confirmed'
        });

        refetchPosition();
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Trade failed");
    } finally {
      setIsTrading(false);
    }
  };

  const percentOptions = [25, 50, 70, 100];

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-hidden">
      <Header />
      
      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
        <GlowOrb className="bg-[#02c076] -left-32 top-0" />
        <GlowOrb className="bg-purple-600 -right-32 bottom-0" />

          <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              
              {/* Left Side: Marketing/Bias - 7 Cols */}
              <div className="lg:col-span-7 space-y-6 pt-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#02c076]/10 border border-[#02c076]/20 text-[#02c076] text-[10px] font-black tracking-widest uppercase animate-pulse">
                  <Rocket className="w-3 h-3" />
                  Live on Solana
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-4xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter">
                    ELEVATE YOUR <span className="text-[#02c076]">EDGE</span> <br />
                    BEFORE THE <br />
                    MARKET <span className="text-purple-500">FLIPS</span>.
                  </h1>
                  <p className="text-lg text-gray-400 max-w-lg leading-relaxed font-medium">
                    Flip Finance ($FLIP) is the elite execution layer for professional traders on Solana. 
                    Gain the competitive edge with the fastest trading infrastructure in the ecosystem.
                  </p>
                </div>

                {/* Stats Grid - Professional Look */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-4 rounded-2xl bg-[#1e2329]/40 border border-[#2b3139] backdrop-blur-md overflow-hidden">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1.5 tracking-wider">Price</p>
                    <p className="text-lg font-black text-white tracking-tight truncate" title={tokenData ? `$${formatPrice(tokenData.price)}` : ""}>
                      {tokenData ? formatCompactPrice(tokenData.price) : "$0.0..."}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1e2329]/40 border border-[#2b3139] backdrop-blur-md overflow-hidden">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1.5 tracking-wider">Market Cap</p>
                    <p className="text-lg font-black text-[#02c076] tracking-tight truncate">
                      ${tokenData ? formatNumber(tokenData.price * 1000000000) : "0.0"}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1e2329]/40 border border-[#2b3139] backdrop-blur-md overflow-hidden">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1.5 tracking-wider">24h Change</p>
                    <p className={cn(
                      "text-lg font-black tracking-tight truncate",
                      (tokenData?.priceChange24h || 0) >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                    )}>
                      {tokenData ? (tokenData.priceChange24h > 0 ? "+" : "") + tokenData.priceChange24h.toFixed(2) + "%" : "0.00%"}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#1e2329]/40 border border-[#2b3139] backdrop-blur-md overflow-hidden">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1.5 tracking-wider">Liquidity</p>
                    <p className="text-lg font-black text-white tracking-tight truncate">BURNED</p>
                  </div>
                </div>

                {/* CA Section */}
                <div className="space-y-2 max-w-md">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contract Address</p>
                    <a 
                      href={`https://solscan.io/token/${FLIP_CA}`} 
                      target="_blank" 
                      className="text-[10px] text-[#02c076] hover:underline flex items-center gap-1 font-bold"
                    >
                      Solscan <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-black/60 rounded-2xl border border-[#2b3139] group hover:border-[#02c076]/40 transition-all shadow-inner">
                    <code className="flex-1 text-[11px] text-gray-300 font-mono break-all leading-tight">{FLIP_CA}</code>
                    <button 
                      onClick={handleCopy}
                      className="p-2 hover:bg-[#1e2329] rounded-xl transition-colors shadow-sm"
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-[#02c076]" /> : <Copy className="w-4 h-4 text-gray-500 group-hover:text-white" />}
                    </button>
                  </div>
                </div>

                {/* Bottom Features */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                      { 
                        icon: Shield, 
                        title: "Vested Allocation", 
                        desc: "Streamflow Vested",
                        link: "https://app.streamflow.finance/contract/solana/mainnet/8k1iqUtjTC8fmfPmnavFMFqX5zW2F9ctAR42jdsERd9Y"
                      },
                      { icon: Users, title: "1B Total Supply", desc: "No Mint Authority" }
                    ].map((f, i) => (
                  <a 
                    key={i} 
                    href={f.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={cn(
                      "p-5 rounded-2xl bg-[#1e2329]/20 border border-[#2b3139] flex flex-col gap-3 transition-all",
                      f.link && "hover:border-[#02c076]/30 hover:bg-[#1e2329]/30 cursor-pointer group"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#02c076] transition-colors">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-black text-white text-xs uppercase tracking-wider">{f.title}</h5>
                      <p className="text-[11px] text-gray-500 font-medium">{f.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Right Side: Focused Swap - 5 Cols */}
            <div className="lg:col-span-5 relative lg:sticky lg:top-8">
              <div className="absolute inset-0 bg-gradient-to-br from-[#02c076]/20 to-purple-600/20 rounded-[32px] blur-3xl opacity-30 -z-10" />
              
              <div className="bg-[#1e2329]/95 backdrop-blur-2xl border border-[#2b3139] rounded-[32px] p-6 lg:p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#02c076] to-emerald-500 p-2.5 flex items-center justify-center shadow-xl shadow-[#02c076]/20 ring-1 ring-white/20">
                      <img src="/logo.png" alt="FLIP" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight">Trade $FLIP</h2>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Jupiter Aggregator</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className={cn(
                        "p-2 rounded-xl border transition-all",
                        showSettings ? "bg-[#02c076]/10 border-[#02c076]/50 text-[#02c076]" : "bg-black/40 border-[#2b3139] text-gray-500 hover:text-white"
                      )}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <div className="flex rounded-xl overflow-hidden border border-[#2b3139] bg-black/50 p-1">
                      <button
                        onClick={() => setActiveTab("buy")}
                        className={cn(
                          "px-5 py-2 text-xs font-black rounded-lg transition-all",
                          activeTab === "buy" ? "bg-[#02c076] text-black shadow-lg" : "text-gray-500 hover:text-white"
                        )}
                      >
                        BUY
                      </button>
                      <button
                        onClick={() => setActiveTab("sell")}
                        className={cn(
                          "px-5 py-2 text-xs font-black rounded-lg transition-all",
                          activeTab === "sell" ? "bg-[#f6465d] text-white shadow-lg" : "text-gray-500 hover:text-white"
                        )}
                      >
                        SELL
                      </button>
                    </div>
                  </div>
                </div>

                {showSettings && (
                  <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-[#2b3139] space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Slippage Tolerance</span>
                      <span className="text-xs font-black text-[#02c076]">{slippage / 10}%</span>
                    </div>
                    <div className="flex gap-2">
                      {[10, 50, 150, 300].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSlippage(s)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[10px] font-black border transition-all",
                            slippage === s ? "bg-[#02c076] border-[#02c076] text-black" : "bg-black/40 border-[#2b3139] text-gray-500 hover:text-white"
                          )}
                        >
                          {s / 10}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Amount Input */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {activeTab === 'buy' ? 'Pay with SOL' : 'Sell $FLIP'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-bold">
                          Bal: {activeTab === 'buy' ? balance.toFixed(4) : (position?.uiBalance.toFixed(2) || "0.00")}
                        </span>
                        {activeTab === 'sell' && positionLoading && <Loader2 className="w-2.5 h-2.5 animate-spin text-gray-600" />}
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5 mb-2">
                      <button
                        onClick={() => activeTab === 'buy' ? setBuyMode("percent") : setSellMode("percent")}
                        className={cn(
                          "flex-1 py-1.5 text-[10px] font-black rounded-lg border transition-all",
                          (activeTab === 'buy' ? buyMode : sellMode) === "percent" 
                            ? (activeTab === 'buy' ? "bg-[#02c076]/20 border-[#02c076] text-[#02c076]" : "bg-[#f6465d]/20 border-[#f6465d] text-[#f6465d]")
                            : "bg-black/20 border-[#2b3139] text-gray-500"
                        )}
                      >
                        PERCENT %
                      </button>
                      <button
                        onClick={() => activeTab === 'buy' ? setBuyMode("custom") : setSellMode("custom")}
                        className={cn(
                          "flex-1 py-1.5 text-[10px] font-black rounded-lg border transition-all",
                          (activeTab === 'buy' ? buyMode : sellMode) === "custom"
                            ? (activeTab === 'buy' ? "bg-[#02c076]/20 border-[#02c076] text-[#02c076]" : "bg-[#f6465d]/20 border-[#f6465d] text-[#f6465d]")
                            : "bg-black/20 border-[#2b3139] text-gray-500"
                        )}
                      >
                        CUSTOM
                      </button>
                    </div>

                    {(activeTab === 'buy' ? buyMode : sellMode) === 'percent' ? (
                      <div className="grid grid-cols-4 gap-2">
                        {percentOptions.map((pct) => (
                          <button
                            key={pct}
                            onClick={() => activeTab === 'buy' ? setBuyPercent(pct) : setSellPercent(pct)}
                            className={cn(
                              "py-3 rounded-xl border text-xs font-black transition-all",
                              (activeTab === 'buy' ? buyPercent : sellPercent) === pct 
                                ? (activeTab === 'buy' ? "bg-[#02c076] border-[#02c076] text-black shadow-lg" : "bg-[#f6465d] border-[#f6465d] text-white shadow-lg")
                                : "bg-black/40 border-[#2b3139] text-gray-500 hover:border-gray-500"
                            )}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          type="number"
                          value={activeTab === 'buy' ? buyAmount : sellAmount}
                          onChange={(e) => activeTab === 'buy' ? setBuyAmount(e.target.value) : setSellAmount(e.target.value)}
                          className="h-16 bg-black/50 border-[#2b3139] rounded-2xl text-2xl font-black text-white focus:ring-2 focus:ring-[#02c076]/30 pr-24 shadow-inner"
                          placeholder="0.0"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 bg-[#2b3139] rounded-xl border border-white/5">
                          <img 
                            src={activeTab === 'buy' 
                              ? "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                              : "/logo.png"
                            } 
                            className="w-5 h-5 rounded-full" 
                          />
                          <span className="font-black text-white text-[11px] tracking-wider">{activeTab === 'buy' ? 'SOL' : 'FLIP'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Swap Icon */}
                  <div className="flex justify-center -my-3 relative z-10">
                    <div className="p-2 rounded-2xl bg-[#0b0e11] border border-[#2b3139] text-gray-500 shadow-xl">
                      <ArrowDownUp className="w-5 h-5" />
                    </div>
                  </div>

                    {/* Receive Input */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">You Receive</label>
                        {quoteError && <span className="text-[9px] text-[#f6465d] font-bold uppercase animate-pulse">{quoteError}</span>}
                      </div>
                      <div className={cn(
                        "h-16 bg-black/20 border-2 border-dashed rounded-2xl flex items-center justify-between px-5 transition-colors",
                        quoteError ? "border-[#f6465d]/50 bg-[#f6465d]/5" : "border-[#2b3139] hover:border-[#2b3139]/80"
                      )}>

                      <span className={cn(
                        "text-2xl font-black transition-all",
                        quoteLoading ? "text-gray-700 blur-[1px]" : "text-white/80"
                      )}>
                        {quoteLoading ? "CALCULATING..." : formatNumber(parseFloat(outAmount), 2)}
                      </span>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2b3139]/40 rounded-xl border border-white/5">
                        <img 
                          src={activeTab === 'buy' ? "/logo.png" : "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"} 
                          className="w-5 h-5 rounded-full" 
                        />
                        <span className="font-black text-white text-[11px] tracking-wider">{activeTab === 'buy' ? 'FLIP' : 'SOL'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info Table */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-[#2b3139] space-y-2.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-black uppercase tracking-widest">Price Impact</span>
                      <span className="text-[#02c076] font-black tracking-tight">{"< 0.12%"}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-black uppercase tracking-widest">Est. Network Fee</span>
                      <span className="text-gray-300 font-black tracking-tight">~0.000005 SOL</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleTrade}
                      disabled={isTrading || isSwapping || !publicKey}
                      className={cn(
                        "w-full h-16 rounded-2xl font-black text-base transition-all duration-500 shadow-2xl relative overflow-hidden group",
                        activeTab === "buy"
                          ? "bg-[#02c076] hover:bg-[#03e28c] text-black"
                          : "bg-[#f6465d] hover:bg-[#ff556c] text-white"
                      )}
                    >
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]" />
                      {isTrading || isSwapping ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>PROCESSING SWAP...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {activeTab === "buy" 
                            ? `BUY ${buyMode === 'percent' ? buyPercent + '%' : buyAmount + ' SOL'}`
                            : `SELL ${sellMode === 'percent' ? sellPercent + '%' : sellAmount + ' FLIP'}`
                          }
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </Button>

                    {!publicKey && (
                      <p className="text-[10px] text-center text-yellow-500 font-black uppercase tracking-[0.2em] animate-pulse">
                        CONNECT WALLET TO ACTIVATE TRADING
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
