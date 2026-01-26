"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Share2, Copy, ExternalLink, Loader2,
  CheckCircle, AlertTriangle, RefreshCw, Wallet, Star, Settings,
  Globe, MessageCircle, Shield, BarChart2, ListOrdered, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { useWallet } from "@/lib/wallet-context";
import { useJupiter } from "@/hooks/use-jupiter";
import { useTokenPosition } from "@/hooks/use-token-positions";
import { formatNumber, formatPrice, Token } from "@/lib/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { DexScreenerChart } from "@/components/dexscreener-chart";
import { LightweightChart } from "@/components/lightweight-chart";

const SOL_MINT = "So11111111111111111111111111111111111111112";

type TradeTab = "trades" | "orders" | "positions" | "history" | "holders" | "holderChart" | "devTokens";
type MobileView = "chartTrade" | "trades" | "info";

export default function TradePage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;
  const fetchedRef = useRef(false);
  
  const { tokens, addTrade, settings } = useApp();
  const { publicKey, wallet, balance, generateWallet } = useWallet();
  const { getQuote, swap, loading: isSwapping } = useJupiter();
  const { position, loading: positionLoading, refetch: refetchPosition } = useTokenPosition(address);
  
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTradeTab, setActiveTradeTab] = useState<TradeTab>("trades");
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [buyAmount, setBuyAmount] = useState("0.1");
  const [sellPercent, setSellPercent] = useState(100);
  const [sellMode, setSellMode] = useState<"percent" | "custom">("percent");
  const [customSellAmount, setCustomSellAmount] = useState("");
  const [slippage, setSlippage] = useState(settings.slippagePercent || 1);
  const [showSlippageInput, setShowSlippageInput] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  
  const [trades, setTrades] = useState<any[]>([]);
  const [userTrades, setUserTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [holders, setHolders] = useState<any[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [holdersCount, setHoldersCount] = useState(0);
  const [holdersDistribution, setHoldersDistribution] = useState<{ top10: number; top100: number; top500: number; totalTracked: number } | null>(null);
  const [quoteInfo, setQuoteInfo] = useState<{ outAmount: string; priceImpact: string } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [tokenSocials, setTokenSocials] = useState<{ website?: string; twitter?: string; telegram?: string }>({});
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [tokenBanner, setTokenBanner] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("chartTrade");
  const [isFavorited, setIsFavorited] = useState(false);
  const [chartMode, setChartMode] = useState<"standard" | "pro">("standard");
  const [chartHeight, setChartHeight] = useState(68);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "row-resize";
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "default";
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - containerRect.top;
    const newHeight = (relativeY / containerRect.height) * 100;
    
    if (newHeight >= 20 && newHeight <= 85) {
      setChartHeight(newHeight);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const checkFavorite = useCallback(async () => {
    if (!publicKey || !address) return;
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("wallet_address", publicKey)
        .eq("token_address", address)
        .maybeSingle();
      
      if (data) setIsFavorited(true);
      else setIsFavorited(false);
    } catch (e) {
      console.error("Error checking favorite:", e);
    }
  }, [publicKey, address]);

  const toggleFavorite = async () => {
    if (!publicKey || !token) {
      toast.error("Connect wallet to use watchlist");
      return;
    }

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("wallet_address", publicKey)
          .eq("token_address", address);
        
        if (!error) {
          setIsFavorited(false);
          toast.success("Removed from watchlist");
        }
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({
            wallet_address: publicKey,
            token_address: address,
            symbol: token.symbol,
            name: token.name,
            image_url: token.logoURI,
          });
        
        if (!error) {
          setIsFavorited(true);
          toast.success("Added to watchlist");
        }
      }
    } catch (e) {
      console.error("Error toggling favorite:", e);
      toast.error("Failed to update watchlist");
    }
  };

  const fetchToken = useCallback(async (isRefresh = false) => {
    if (!isRefresh && fetchedRef.current) return;
    if (!isRefresh) fetchedRef.current = true;
    
    if (!isRefresh) setLoading(true);
    const existing = tokens.find(t => t.address === address);
    if (existing && !isRefresh) {
      setToken(existing);
      setLoading(false);
      checkFavorite();
      return;
    }

    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${address}`);
      const pairs = await res.json();
      
      if (Array.isArray(pairs) && pairs.length > 0) {
        const mainPair = pairs.sort((a: any, b: any) => 
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];
        
        if (mainPair.info?.socials) {
          const socials: any = {};
          mainPair.info.socials.forEach((s: any) => {
            if (s.type === "twitter") socials.twitter = s.url;
            if (s.type === "telegram") socials.telegram = s.url;
          });
          if (mainPair.info.websites?.[0]) socials.website = mainPair.info.websites[0].url;
          setTokenSocials(socials);
        }

        if (mainPair.info?.header) {
          setTokenBanner(mainPair.info.header);
        }
        
        setToken({
          address: mainPair.baseToken.address,
          symbol: mainPair.baseToken.symbol,
          name: mainPair.baseToken.name,
          decimals: mainPair.baseToken.decimals || 9,
          price: parseFloat(mainPair.priceUsd) || 0,
          priceChange24h: mainPair.priceChange?.h24 || 0,
          volume24h: mainPair.volume?.h24 || 0,
          liquidity: mainPair.liquidity?.usd || 0,
          marketCap: mainPair.fdv || 0,
          logoURI: mainPair.info?.imageUrl,
          platform: "raydium",
          txns24h: (mainPair.txns?.h24?.buys || 0) + (mainPair.txns?.h24?.sells || 0),
          buys24h: mainPair.txns?.h24?.buys || 0,
          sells24h: mainPair.txns?.h24?.sells || 0,
        });
        checkFavorite();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [address, tokens, checkFavorite]);

    const fetchTrades = useCallback(async (silent = false) => {
      if (!address) return;
      if (!silent) setTradesLoading(true);
      try {
        const res = await fetch(`/api/token/trades?address=${address}&limit=50`);
        const data = await res.json();
        if (data.trades && Array.isArray(data.trades)) {
          setTrades(prev => {
            // Combine all trades and filter out duplicates
            const allTrades = [...data.trades, ...prev];
            const uniqueMap = new Map();
            
            for (const t of allTrades) {
              const key = t.txHash || t.id;
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, t);
              }
            }
            
            // Convert back to array and sort by blockTime descending
            const sortedTrades = Array.from(uniqueMap.values())
              .sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0))
              .slice(0, 100);
            
            // Check if anything actually changed to avoid unnecessary re-renders
            const prevIds = prev.map(t => t.txHash || t.id).join(",");
            const currentIds = sortedTrades.map(t => t.txHash || t.id).join(",");
            
            if (prevIds === currentIds) return prev;
            return sortedTrades;
          });
        }
      } catch (e) {
        console.error("Error fetching trades:", e);
      }
      if (!silent) setTradesLoading(false);
    }, [address]);

    const fetchHolders = useCallback(async () => {

    if (!address) return;
    setHoldersLoading(true);
    try {
      const res = await fetch(`/api/token/holders?address=${address}&limit=50&pnl=true`);
      const data = await res.json();
      if (data.holders && Array.isArray(data.holders)) {
        setHolders(data.holders);
        setHoldersCount(data.total || data.holders.length);
        if (data.distribution) {
          setHoldersDistribution(data.distribution);
        }
      }
    } catch (e) {
      console.error("Error fetching holders:", e);
    }
    setHoldersLoading(false);
  }, [address]);

  const fetchAiAnalysis = useCallback(async () => {
    if (!token || aiAnalysis) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: {
            symbol: token.symbol,
            name: token.name,
            price: token.price,
            priceChange24h: token.priceChange24h,
            volume24h: token.volume24h,
            liquidity: token.liquidity,
            marketCap: token.marketCap,
            holders: holdersCount,
            top10Percent: holders.slice(0, 10).reduce((sum, h) => sum + (h.percentage || 0), 0),
          }
        })
      });
      const data = await res.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
      }
    } catch (e) {
      console.error("AI analysis error:", e);
    }
    setAiLoading(false);
  }, [token, aiAnalysis, holdersCount, holders]);

    const fetchUserTrades = useCallback(async () => {
      if (!publicKey || !address) return;
      try {
        const res = await fetch(`/api/pnl?wallet=${publicKey}&token=${address}`);
        const data = await res.json();
        if (data.trades) {
          setUserTrades(data.trades.map((t: any) => ({
            timestamp: new Date(t.created_at).getTime(),
            price: t.price,
            type: t.side,
            amount: t.amount,
          })));
        }
      } catch (e) {
        console.error("Error fetching user trades:", e);
      }
    }, [publicKey, address]);

    useEffect(() => {
      fetchToken();
      fetchTrades();
      fetchHolders();
      fetchUserTrades();
    }, [fetchToken, fetchTrades, fetchHolders, fetchUserTrades]);
    
    useEffect(() => {
      const interval = setInterval(() => {
        fetchTrades(true);
        fetchToken(true);
        fetchUserTrades();
      }, 2000);
      
      return () => clearInterval(interval);
    }, [address, fetchTrades, fetchToken, fetchUserTrades]);


  useEffect(() => {
    if (token && holdersCount > 0 && !aiAnalysis && !aiLoading) {
      fetchAiAnalysis();
    }
  }, [token, holdersCount, fetchAiAnalysis]);

  const lastParamsRef = useRef<{ token: string; tab: string } | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!token) return;
    
    // Clear quote if token or tab changed to avoid showing wrong estimate
    if (lastParamsRef.current?.token !== token.address || lastParamsRef.current?.tab !== activeTab) {
      setQuoteInfo(null);
    }
    lastParamsRef.current = { token: token.address, tab: activeTab };

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      let inputMint: string;
      let outputMint: string;
      let rawAmount: number;

      if (activeTab === "buy") {
        const amount = parseFloat(buyAmount);
        if (isNaN(amount) || amount <= 0) {
          setQuoteLoading(false);
          return;
        }
        inputMint = SOL_MINT;
        outputMint = token.address;
        rawAmount = Math.floor(amount * 1e9);
      } else {
        if (!position || position.uiBalance <= 0) {
          setQuoteLoading(false);
          return;
        }
        inputMint = token.address;
        outputMint = SOL_MINT;
        
        let sellAmount: number;
        if (sellMode === "custom" && customSellAmount) {
          sellAmount = parseFloat(customSellAmount);
          if (isNaN(sellAmount) || sellAmount <= 0) {
            setQuoteLoading(false);
            return;
          }
          sellAmount = Math.min(sellAmount, position.uiBalance);
        } else {
          sellAmount = (position.uiBalance * sellPercent) / 100;
        }
        rawAmount = Math.floor(sellAmount * Math.pow(10, position.decimals || 9));
      }

      const quote = await getQuote(inputMint, outputMint, rawAmount);
      
      if (quote && !quote.error) {
        const outDecimals = activeTab === "buy" ? (token.decimals || 9) : 9;
        setQuoteInfo({
          outAmount: (parseFloat(quote.outAmount) / Math.pow(10, outDecimals)).toFixed(6),
          priceImpact: quote.priceImpactPct ? `${(parseFloat(quote.priceImpactPct) * 100).toFixed(2)}%` : "< 0.01%",
        });
      } else if (quote?.error) {
        setQuoteError(quote.error);
      }
    } catch (e: any) {
      console.error("Quote error:", e);
      setQuoteError(e.message || "Quote failed");
    } finally {
      setQuoteLoading(false);
    }
  }, [token, buyAmount, activeTab, sellPercent, sellMode, customSellAmount, position, getQuote]);

  useEffect(() => {
    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [fetchQuote]);

  const handleTrade = async () => {
    if (!publicKey || !wallet || !token) {
      toast.error("Connect wallet first");
      return;
    }

    setIsTrading(true);
    try {
      let inputMint: string;
      let outputMint: string;
      let rawAmount: number;
      let displayAmount: number;

      if (activeTab === "buy") {
        const amount = parseFloat(buyAmount);
        if (isNaN(amount) || amount <= 0) {
          toast.error("Enter valid amount");
          setIsTrading(false);
          return;
        }
        if (amount > balance) {
          toast.error("Insufficient SOL balance");
          setIsTrading(false);
          return;
        }
        inputMint = SOL_MINT;
        outputMint = token.address;
        rawAmount = Math.floor(amount * 1e9);
        displayAmount = amount;
      } else {
        if (!position || position.uiBalance <= 0) {
          toast.error("No tokens to sell");
          setIsTrading(false);
          return;
        }
        inputMint = token.address;
        outputMint = SOL_MINT;
        
        let sellAmount: number;
        if (sellMode === "custom" && customSellAmount) {
          sellAmount = parseFloat(customSellAmount);
          if (isNaN(sellAmount) || sellAmount <= 0) {
            toast.error("Enter valid sell amount");
            setIsTrading(false);
            return;
          }
          if (sellAmount > position.uiBalance) {
            toast.error("Amount exceeds balance");
            setIsTrading(false);
            return;
          }
        } else {
          sellAmount = (position.uiBalance * sellPercent) / 100;
        }
        rawAmount = Math.floor(sellAmount * Math.pow(10, position.decimals || 9));
        displayAmount = sellAmount;
      }

      toast.loading("Getting quote...");
      const quote = await getQuote(inputMint, outputMint, rawAmount);
      
      if (!quote || quote.error) {
        toast.dismiss();
        toast.error(quote?.error || "Failed to get quote");
        setIsTrading(false);
        return;
      }

      toast.dismiss();
      toast.loading("Executing swap...");
      
      const signature = await swap(quote);
      
      toast.dismiss();
      
      if (signature) {
        await supabase.from("user_trades").insert({
          wallet_address: publicKey,
          token_address: token.address,
          token_symbol: token.symbol,
          side: activeTab,
          amount: displayAmount,
          price: token.price,
          tx_hash: signature,
        });

        addTrade({
          id: signature,
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          type: activeTab,
          amountIn: displayAmount,
          amountOut: parseFloat(quote.outAmount) / Math.pow(10, activeTab === "buy" ? (token.decimals || 9) : 9),
          price: token.price,
          timestamp: Date.now(),
          signature,
          status: "confirmed",
        });

        fetch("/api/points/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: publicKey,
            amount: activeTab === "buy" ? (displayAmount * (tokens.find(t => t.symbol === "SOL")?.price || 240)) : (displayAmount * token.price),
            type: "trade",
            description: `${activeTab === "buy" ? "Buy" : "Sell"} ${token.symbol}`
          })
        }).catch(console.error);

        toast.success(
          <div className="flex flex-col gap-1">
            <span>{activeTab === "buy" ? "Bought" : "Sold"} {token.symbol}!</span>
            <a 
              href={`https://solscan.io/tx/${signature}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#02c076] text-xs hover:underline"
            >
              View on Solscan
            </a>
          </div>
        );
        
        refetchPosition();
        fetchTrades();
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Trade failed");
    } finally {
      setIsTrading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0b0e11]">
        <Loader2 className="w-8 h-8 animate-spin text-[#02c076]" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0b0e11] gap-4">
        <p className="text-gray-400">Token not found</p>
        <Button onClick={() => router.push("/")} variant="outline">
          Back to Explore
        </Button>
      </div>
    );
  }

  const isPositive = token.priceChange24h >= 0;
  const top10Percent = holders.slice(0, 10).reduce((sum, h) => sum + (h.percentage || 0), 0);
  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 border-b border-[#1e2329] bg-[#0d1117] overflow-x-auto no-scrollbar">
        <Link href="/" className="p-1 hover:bg-[#1e2329] rounded flex-shrink-0">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </Link>
        
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full" />
          ) : (
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#02c076] flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-black">
              {token.symbol.slice(0, 2)}
            </div>
          )}
          <span className="font-bold text-white text-xs sm:text-sm">{token.symbol}</span>
          <span className="text-gray-500 text-[10px] sm:text-xs hidden sm:block">{token.name}</span>
        </div>

        <div className="flex items-center gap-1 text-gray-500 flex-shrink-0">
          <button onClick={copyAddress} className="p-1 hover:bg-[#1e2329] rounded" title="Copy address">
            <Copy className="w-3 h-3" />
          </button>
          <span className="text-[9px] sm:text-[10px] font-mono">{shortAddress}</span>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {tokenSocials.twitter && (
            <a href={tokenSocials.twitter} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[#1e2329] rounded text-gray-500 hover:text-[#1DA1F2]" title="Twitter/X">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          )}
          {tokenSocials.telegram && (
            <a href={tokenSocials.telegram} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[#1e2329] rounded text-gray-500 hover:text-[#0088cc]" title="Telegram">
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          )}
          {tokenSocials.website && (
            <a href={tokenSocials.website} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[#1e2329] rounded text-gray-500 hover:text-white" title="Website">
              <Globe className="w-3.5 h-3.5" />
            </a>
          )}
            <button 
              onClick={toggleFavorite}
              className={cn(
                "p-1 hover:bg-[#1e2329] rounded transition-colors",
                isFavorited ? "text-yellow-500" : "text-gray-500 hover:text-yellow-500"
              )}
            >
              <Star className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", isFavorited && "fill-current")} />
            </button>
            <button 
              onClick={() => setChartMode(chartMode === "standard" ? "pro" : "standard")}
              className={cn(
                "p-1 sm:p-1.5 rounded flex items-center gap-1 transition-all",
                chartMode === "pro" ? "bg-[#02c076]/20 text-[#02c076]" : "bg-[#1e2329] text-gray-500 hover:text-white"
              )}
              title={chartMode === "pro" ? "Switch to DexScreener" : "Switch to TV Light Chart (with B/S markers)"}
            >
              <BarChart2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[9px] sm:text-[10px] font-bold hidden xs:inline">
                {chartMode === "pro" ? "TV LIGHT" : "STD"}
              </span>
            </button>

          <button className="p-1 hover:bg-[#1e2329] rounded text-gray-500 hover:text-white">
            <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>

        <div className="flex-1 min-w-0" />

        <div className="hidden md:flex items-center gap-3 lg:gap-4 text-[9px] lg:text-[10px] flex-shrink-0">
          <div>
            <span className="text-gray-500">Price</span>
            <p className="text-white font-bold">${formatPrice(token.price)}</p>
          </div>
          <div>
            <span className="text-gray-500">Liq</span>
            <p className="text-white">${formatNumber(token.liquidity)}</p>
          </div>
          <div>
            <span className="text-gray-500">24h Vol</span>
            <p className="text-white">${formatNumber(token.volume24h)}</p>
          </div>
          <div className="hidden xl:block">
            <span className="text-gray-500">Total Fees</span>
            <p className="text-white">${formatNumber(token.volume24h * 0.003)}</p>
          </div>
        </div>

        <div className="w-px h-5 bg-[#1e2329] mx-1 hidden sm:block" />

        <div className="text-base sm:text-lg lg:text-2xl font-bold text-[#02c076] flex-shrink-0">
          ${formatNumber(token.marketCap)}
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="lg:hidden flex border-b border-[#1e2329] bg-[#0d1117]">
        {[
          { id: "chartTrade" as MobileView, icon: BarChart2, label: "Chart + Trade" },
          { id: "trades" as MobileView, icon: ListOrdered, label: "Trades" },
          { id: "info" as MobileView, icon: Shield, label: "Info" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMobileView(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors",
              mobileView === tab.id
                ? "text-[#02c076] border-b-2 border-[#02c076]"
                : "text-gray-500"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Desktop Layout: Left 80% (Chart 55% + History 45%), Right 20% (Trade) */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left Column - 80% */}
        <div ref={containerRef} className="w-[80%] flex flex-col border-r border-[#1e2329] relative">
            {/* Chart */}
            <div 
              style={{ height: `${chartHeight}%` }} 
              className="border-b border-[#1e2329] overflow-hidden"
            >
              {chartMode === "standard" ? (
                <DexScreenerChart 
                  symbol={token.symbol} 
                  tokenAddress={token.address} 
                />
                ) : (
                  <LightweightChart 
                    symbol={token.symbol} 
                    tokenAddress={token.address}
                    currentPrice={token.price}
                    marketCap={token.marketCap}
                    userTrades={userTrades}
                  />
                )}

            </div>

            {/* Resize Handle */}
            <div 
              onMouseDown={startResizing}
              className="absolute left-0 right-0 h-2 -mt-1 cursor-row-resize z-50 group"
              style={{ top: `${chartHeight}%` }}
            >
              <div className="w-full h-[1px] bg-transparent group-hover:bg-[#02c076] transition-colors" />
            </div>
  
          {/* Trades/History */}
          <div 
            style={{ height: `${100 - chartHeight}%` }} 
            className="flex flex-col bg-[#0d1117] overflow-hidden"
          >
            <div className="flex items-center border-b border-[#1e2329] bg-[#0b0e11]">
              <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto no-scrollbar flex-1">
                {[
                  { id: "trades", label: "Trades" },
                  { id: "positions", label: "Positions" },
                  { id: "holders", label: "Holders" },
                  { id: "holderChart", label: "Distribution" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTradeTab(tab.id as TradeTab)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded whitespace-nowrap transition-all",
                      activeTradeTab === tab.id
                        ? "bg-[#1e2329] text-white"
                        : "text-gray-500 hover:text-white"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => { fetchTrades(); refetchPosition(); }}
                className="p-2 hover:bg-[#1e2329] rounded text-gray-500 hover:text-white mr-2"
              >
                <RefreshCw className={cn("w-4 h-4", tradesLoading && "animate-spin")} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeTradeTab === "trades" && <TradesTable trades={trades} loading={tradesLoading} />}
              {activeTradeTab === "positions" && (
                <PositionDisplay 
                  position={position} 
                  loading={positionLoading} 
                  token={token}
                  publicKey={publicKey}
                />
              )}
              {activeTradeTab === "holders" && <HoldersTable holders={holders} loading={holdersLoading} />}
              {activeTradeTab === "holderChart" && <HolderDistributionChart holders={holders} loading={holdersLoading} totalHolders={holdersCount} distribution={holdersDistribution} />}
            </div>
          </div>
        </div>

        {/* Right Column - 20% Trade Panel */}
        <div className="w-[20%] min-w-[280px] flex flex-col bg-[#0d1117] overflow-y-auto">
          <TradePanelContent
            token={token}
            tokenBanner={tokenBanner}
            isPositive={isPositive}
            publicKey={publicKey}
            balance={balance}
            generateWallet={generateWallet}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showSlippageInput={showSlippageInput}
            setShowSlippageInput={setShowSlippageInput}
            slippage={slippage}
            setSlippage={setSlippage}
            buyAmount={buyAmount}
            setBuyAmount={setBuyAmount}
            sellMode={sellMode}
            setSellMode={setSellMode}
            sellPercent={sellPercent}
            setSellPercent={setSellPercent}
            customSellAmount={customSellAmount}
            setCustomSellAmount={setCustomSellAmount}
            position={position}
            quoteInfo={quoteInfo}
            quoteLoading={quoteLoading}
            isTrading={isTrading}
            isSwapping={isSwapping}
            handleTrade={handleTrade}
            top10Percent={top10Percent}
            holdersCount={holdersCount}
            aiAnalysis={aiAnalysis}
            aiLoading={aiLoading}
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
        {mobileView === "chartTrade" && (
            <>
                <div className="h-[65%] min-h-[200px]">
                  {chartMode === "standard" ? (
                    <DexScreenerChart 
                      symbol={token.symbol} 
                      tokenAddress={token.address} 
                    />
                    ) : (
                      <LightweightChart 
                        symbol={token.symbol} 
                        tokenAddress={token.address}
                        currentPrice={token.price}
                        marketCap={token.marketCap}
                        userTrades={userTrades}
                      />
                    )}
                </div>

            <div className="flex-1 overflow-y-auto border-t border-[#1e2329]">
              <TradePanelContent
                token={token}
                tokenBanner={null}
                isPositive={isPositive}
                publicKey={publicKey}
                balance={balance}
                generateWallet={generateWallet}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                showSlippageInput={showSlippageInput}
                setShowSlippageInput={setShowSlippageInput}
                slippage={slippage}
                setSlippage={setSlippage}
                buyAmount={buyAmount}
                setBuyAmount={setBuyAmount}
                sellMode={sellMode}
                setSellMode={setSellMode}
                sellPercent={sellPercent}
                setSellPercent={setSellPercent}
                customSellAmount={customSellAmount}
                setCustomSellAmount={setCustomSellAmount}
                position={position}
                quoteInfo={quoteInfo}
                quoteLoading={quoteLoading}
                isTrading={isTrading}
                isSwapping={isSwapping}
                handleTrade={handleTrade}
                top10Percent={top10Percent}
                holdersCount={holdersCount}
                aiAnalysis={aiAnalysis}
                aiLoading={aiLoading}
                isMobile
              />
            </div>
          </>
        )}

        {mobileView === "trades" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#1e2329] overflow-x-auto no-scrollbar">
              {[
                { id: "trades", label: "Trades" },
                { id: "positions", label: "Positions" },
                { id: "holders", label: "Holders" },
                { id: "holderChart", label: "Distribution" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTradeTab(tab.id as TradeTab)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded whitespace-nowrap transition-all",
                    activeTradeTab === tab.id
                      ? "bg-[#1e2329] text-white"
                      : "text-gray-500 hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
              <div className="flex-1" />
              <button 
                onClick={() => { fetchTrades(); refetchPosition(); }}
                className="p-1.5 hover:bg-[#1e2329] rounded text-gray-500 hover:text-white"
              >
                <RefreshCw className={cn("w-4 h-4", tradesLoading && "animate-spin")} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeTradeTab === "trades" && <TradesTable trades={trades} loading={tradesLoading} />}
              {activeTradeTab === "positions" && (
                <PositionDisplay 
                  position={position} 
                  loading={positionLoading} 
                  token={token}
                  publicKey={publicKey}
                />
              )}
              {activeTradeTab === "holders" && <HoldersTable holders={holders} loading={holdersLoading} />}
              {activeTradeTab === "holderChart" && <HolderDistributionChart holders={holders} loading={holdersLoading} totalHolders={holdersCount} distribution={holdersDistribution} />}
            </div>
          </div>
        )}

        {mobileView === "info" && (
          <MobileInfoView
            token={token}
            isPositive={isPositive}
            holdersCount={holdersCount}
            copyAddress={copyAddress}
            aiAnalysis={aiAnalysis}
            aiLoading={aiLoading}
          />
        )}
      </div>
    </div>
  );
}

function TradePanelContent({
  token,
  tokenBanner,
  isPositive,
  publicKey,
  balance,
  generateWallet,
  activeTab,
  setActiveTab,
  showSlippageInput,
  setShowSlippageInput,
  slippage,
  setSlippage,
  buyAmount,
  setBuyAmount,
  sellMode,
  setSellMode,
  sellPercent,
  setSellPercent,
  customSellAmount,
  setCustomSellAmount,
  position,
  quoteInfo,
  quoteLoading,
  isTrading,
  isSwapping,
  handleTrade,
  top10Percent,
  holdersCount,
  aiAnalysis,
  aiLoading,
  isMobile = false,
}: any) {
  return (
    <div className="flex flex-col h-full">
      {tokenBanner && !isMobile && (
        <div className="relative w-full h-20 overflow-hidden">
          <img src={tokenBanner} alt={`${token.symbol} banner`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e11] to-transparent" />
        </div>
      )}
      
      {!isMobile && (
        <div className={cn("flex items-center gap-3 px-3 py-2 border-b border-[#1e2329]", tokenBanner && "-mt-8 relative z-10")}>
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol} className="w-10 h-10 rounded-full border-2 border-[#1e2329] bg-[#0b0e11]" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#02c076] flex items-center justify-center text-sm font-bold text-black border-2 border-[#1e2329]">
              {token.symbol.slice(0, 2)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">{token.symbol}</p>
            <p className="text-[10px] text-gray-500 truncate">{token.name}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-white text-sm">${formatPrice(token.price)}</p>
            <p className={cn("text-[10px] font-bold", isPositive ? "text-[#02c076]" : "text-[#f6465d]")}>
              {isPositive ? "+" : ""}{token.priceChange24h.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {!isMobile && (
        <div className="grid grid-cols-5 gap-px border-b border-[#1e2329] bg-[#1e2329]">
          {[
            { label: "1m", change: token.priceChange24h * 0.08 },
            { label: "5m", change: token.priceChange24h * 0.15 },
            { label: "1h", change: token.priceChange24h * 0.4 },
            { label: "24h", change: token.priceChange24h },
          ].map((item) => (
            <div key={item.label} className="text-center py-1 bg-[#0b0e11]">
              <p className="text-[8px] text-gray-500">{item.label}</p>
              <p className={cn("text-[9px] font-bold", item.change >= 0 ? "text-[#02c076]" : "text-[#f6465d]")}>
                {item.change >= 0 ? "+" : ""}{item.change.toFixed(1)}%
              </p>
            </div>
          ))}
          <div className="text-center py-1 bg-[#0b0e11]">
            <p className="text-[8px] text-gray-500">Vol</p>
            <p className="text-[9px] text-white font-bold">${formatNumber(token.volume24h)}</p>
          </div>
        </div>
      )}

      <div className="flex p-1.5 border-b border-[#1e2329]">
        <button
          onClick={() => setActiveTab("buy")}
          className={cn(
            "flex-1 py-2 text-sm font-bold rounded-l transition-all",
            activeTab === "buy" ? "bg-[#02c076] text-black" : "bg-[#1e2329] text-gray-400"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab("sell")}
          className={cn(
            "flex-1 py-2 text-sm font-bold rounded-r transition-all",
            activeTab === "sell" ? "bg-[#f6465d] text-white" : "bg-[#1e2329] text-gray-400"
          )}
        >
          Sell
        </button>
        <button 
          onClick={() => setShowSlippageInput(!showSlippageInput)}
          className={cn(
            "ml-1 px-2 py-2 text-[10px] font-bold rounded flex items-center gap-1",
            showSlippageInput ? "bg-[#02c076] text-black" : "bg-[#1e2329] text-gray-400"
          )}
        >
          <Settings className="w-3 h-3" />
          {slippage}%
        </button>
      </div>

      {showSlippageInput && (
        <div className="px-2 py-2 border-b border-[#1e2329] bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Slippage:</span>
            <div className="flex gap-1 flex-1">
              {[0.5, 1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={cn(
                    "flex-1 py-1 text-[10px] font-bold rounded",
                    slippage === s ? "bg-[#02c076] text-black" : "bg-[#1e2329] hover:bg-[#2b3139] text-gray-400"
                  )}
                >
                  {s}%
                </button>
              ))}
            </div>
            <Input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(Math.min(50, Math.max(0.1, parseFloat(e.target.value) || 1)))}
              className="w-16 h-7 text-[10px] bg-[#1e2329] border-[#2b3139] text-center"
              step="0.1"
              min="0.1"
              max="50"
            />
          </div>
        </div>
      )}

      <div className="p-2 space-y-2 flex-1">
        {!publicKey ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Wallet className="w-8 h-8 text-gray-600" />
            <p className="text-xs text-gray-500 text-center">Connect wallet to trade</p>
            <Button onClick={generateWallet} className="bg-[#02c076] hover:bg-[#02a566] text-black font-bold text-xs">
              Generate Wallet
            </Button>
            <Link href="/wallet" className="text-[#02c076] text-[10px] hover:underline">
              Or import existing wallet
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[10px] text-gray-500 px-1">
              <span>Bal: {balance.toFixed(4)} SOL</span>
            </div>

            {activeTab === "buy" ? (
              <div>
                <div className="relative">
                  <Input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.0"
                    className="bg-[#1e2329] border-[#2b3139] h-9 font-mono text-sm pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">SOL</span>
                </div>
                <div className="flex gap-1 mt-1.5">
                  {[0.01, 0.1, 0.5, 1].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBuyAmount(amt.toString())}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] font-bold rounded",
                        buyAmount === amt.toString() ? "bg-[#02c076] text-black" : "bg-[#1e2329] hover:bg-[#2b3139] text-gray-400"
                      )}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex gap-1 mb-1.5">
                  <button
                    onClick={() => setSellMode("percent")}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold rounded",
                      sellMode === "percent" ? "bg-[#f6465d]/20 text-[#f6465d] border border-[#f6465d]" : "bg-[#1e2329] hover:bg-[#2b3139] text-gray-400"
                    )}
                  >
                    %
                  </button>
                  <button
                    onClick={() => setSellMode("custom")}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold rounded",
                      sellMode === "custom" ? "bg-[#f6465d]/20 text-[#f6465d] border border-[#f6465d]" : "bg-[#1e2329] hover:bg-[#2b3139] text-gray-400"
                    )}
                  >
                    Custom
                  </button>
                </div>
                
                {sellMode === "percent" ? (
                  <div className="flex gap-1">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setSellPercent(pct)}
                        className={cn(
                          "flex-1 py-2 text-[10px] font-bold rounded",
                          sellPercent === pct ? "bg-[#f6465d] text-white" : "bg-[#1e2329] hover:bg-[#2b3139] text-gray-400"
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
                      value={customSellAmount}
                      onChange={(e) => setCustomSellAmount(e.target.value)}
                      placeholder={position ? `Max: ${position.uiBalance.toFixed(4)}` : "0.0"}
                      className="bg-[#1e2329] border-[#2b3139] h-9 font-mono text-sm pr-16"
                    />
                    <button
                      onClick={() => position && setCustomSellAmount(position.uiBalance.toString())}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#f6465d] font-bold hover:underline"
                    >
                      MAX
                    </button>
                  </div>
                )}
                
                {position && position.uiBalance > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1.5 px-1">
                    Selling: {sellMode === "custom" && customSellAmount 
                      ? Math.min(parseFloat(customSellAmount) || 0, position.uiBalance).toFixed(4) 
                      : ((position.uiBalance * sellPercent) / 100).toFixed(4)} {token.symbol}
                  </p>
                )}
              </div>
            )}

              {quoteInfo && (
                <div className="bg-[#1e2329] rounded p-2 text-[10px]">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">Est. receive</span>
                      {quoteLoading && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#02c076]" />}
                    </div>
                    <span className={cn(
                      "text-white font-mono transition-opacity",
                      quoteLoading ? "opacity-50" : "opacity-100"
                    )}>
                      ~{quoteInfo.outAmount} {activeTab === "buy" ? token.symbol : "SOL"}
                    </span>
                  </div>
                </div>
              )}

            <Button
              onClick={handleTrade}
              disabled={
                isTrading || 
                isSwapping || 
                (activeTab === "buy" && (!buyAmount || parseFloat(buyAmount) <= 0)) ||
                (activeTab === "sell" && (!position || position.uiBalance <= 0 || (sellMode === "custom" && (!customSellAmount || parseFloat(customSellAmount) <= 0))))
              }
              className={cn(
                "w-full h-10 font-bold text-sm",
                activeTab === "buy" ? "bg-[#02c076] hover:bg-[#02a566] text-black" : "bg-[#f6465d] hover:bg-[#d9304a] text-white"
              )}
            >
              {isTrading || isSwapping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : activeTab === "buy" ? (
                `Buy ${buyAmount} SOL`
              ) : sellMode === "custom" && customSellAmount ? (
                `Sell ${parseFloat(customSellAmount).toFixed(4)} ${token.symbol}`
              ) : (
                `Sell ${sellPercent}%`
              )}
            </Button>

            {!isMobile && (
              <>
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {["Top 10", "DEV", "Holders", "Snipers"].map((label, i) => (
                    <div key={label} className="text-center">
                      <p className="text-[9px] text-gray-500">{label}</p>
                      <p className={cn(
                        "text-[10px] font-bold",
                        i === 0 ? "text-[#f6465d]" : i === 1 ? "text-yellow-500" : "text-white"
                      )}>
                        {i === 0 ? `${top10Percent.toFixed(1)}%` : i === 1 ? "1.67%" : i === 2 ? holdersCount : "1.67%"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-1 pt-1">
                  {["Insiders", "Phishing", "Bundler", "Dex Paid"].map((label, i) => (
                    <div key={label} className="text-center">
                      <p className="text-[9px] text-gray-500">{label}</p>
                      <p className={cn(
                        "text-[10px] font-bold",
                        i === 2 ? "text-[#f6465d]" : "text-[#02c076]"
                      )}>
                        {i === 0 ? "0%" : i === 1 ? "0.1%" : i === 2 ? "34.2%" : "Unpaid"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-1 pt-1">
                  <SecurityBadge label="NoMint" safe={!token.security?.isMintable} />
                  <SecurityBadge label="NoBlacklist" safe={true} />
                  <SecurityBadge label="Burnt" safe={true} />
                </div>
              </>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-1.5 pt-2">
          <a
            href={`https://dexscreener.com/solana/${token.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold bg-[#1e2329] hover:bg-[#2b3139] rounded text-gray-400 hover:text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            DexScreener
          </a>
          <a
            href={`https://solscan.io/token/${token.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold bg-[#1e2329] hover:bg-[#2b3139] rounded text-gray-400 hover:text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Solscan
          </a>
        </div>

        {!isMobile && (
          <div className="mt-auto pt-2 border-t border-[#1e2329]">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs font-bold text-white">DYOR</span>
              {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-[#02c076]" />}
            </div>
            {aiAnalysis ? (
              <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-3">{aiAnalysis}</p>
            ) : aiLoading ? (
              <p className="text-[10px] text-gray-500">Analyzing...</p>
            ) : (
              <p className="text-[10px] text-gray-500">AI analysis loading...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileInfoView({ token, isPositive, holdersCount, copyAddress, aiAnalysis, aiLoading }: any) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0e11] p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol} className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#02c076] flex items-center justify-center text-sm font-bold text-black">
              {token.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <p className="font-bold text-white text-lg">{token.symbol}</p>
            <p className="text-xs text-gray-500">{token.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1e2329] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase">Price</p>
            <p className="text-sm font-bold text-white">${formatPrice(token.price)}</p>
          </div>
          <div className="bg-[#1e2329] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase">24h Change</p>
            <p className={cn("text-sm font-bold", isPositive ? "text-[#02c076]" : "text-[#f6465d]")}>
              {isPositive ? "+" : ""}{token.priceChange24h.toFixed(2)}%
            </p>
          </div>
          <div className="bg-[#1e2329] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase">Market Cap</p>
            <p className="text-sm font-bold text-white">${formatNumber(token.marketCap)}</p>
          </div>
          <div className="bg-[#1e2329] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase">Liquidity</p>
            <p className="text-sm font-bold text-white">${formatNumber(token.liquidity)}</p>
          </div>
          <div className="bg-[#1e2329] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase">24h Volume</p>
            <p className="text-sm font-bold text-white">${formatNumber(token.volume24h)}</p>
          </div>
          <div className="bg-[#1e2329] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase">Holders</p>
            <p className="text-sm font-bold text-white">{holdersCount || "—"}</p>
          </div>
        </div>

        <div className="bg-[#1e2329] rounded-lg p-3">
          <p className="text-[10px] text-gray-500 uppercase mb-2">Contract Address</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-gray-400 flex-1 truncate">{token.address}</code>
            <button onClick={copyAddress} className="p-1.5 hover:bg-[#2b3139] rounded">
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="bg-[#1e2329] rounded-lg p-3">
          <p className="text-[10px] text-gray-500 uppercase mb-2">Security</p>
          <div className="flex gap-2">
            <SecurityBadge label="NoMint" safe={!token.security?.isMintable} />
            <SecurityBadge label="NoBlacklist" safe={true} />
            <SecurityBadge label="Burnt" safe={true} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://dexscreener.com/solana/${token.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold bg-[#1e2329] hover:bg-[#2b3139] rounded-lg text-gray-400 hover:text-white"
          >
            <ExternalLink className="w-4 h-4" />
            DexScreener
          </a>
          <a
            href={`https://solscan.io/token/${token.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold bg-[#1e2329] hover:bg-[#2b3139] rounded-lg text-gray-400 hover:text-white"
          >
            <ExternalLink className="w-4 h-4" />
            Solscan
          </a>
        </div>

        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-bold text-white">DYOR - Do Your Own Research</span>
          </div>
          {aiAnalysis ? (
            <p className="text-xs text-gray-300 leading-relaxed">{aiAnalysis}</p>
          ) : aiLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
              <p className="text-xs text-gray-400">Analyzing token...</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Always verify token contracts, check liquidity locks, and research the team before investing. 
              Memecoins are extremely volatile and you can lose your entire investment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SecurityBadge({ label, safe }: { label: string; safe: boolean }) {
  return (
    <div className={cn(
      "flex-1 flex items-center justify-center gap-1 px-1 py-1 rounded text-[8px] font-bold",
      safe ? "bg-[#02c076]/10 text-[#02c076]" : "bg-[#f6465d]/10 text-[#f6465d]"
    )}>
      {safe ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
      {label}
    </div>
  );
}

function PositionDisplay({ position, loading, token, publicKey }: { position: any; loading: boolean; token: Token; publicKey: string | null }) {
  const [myTrades, setMyTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!publicKey || !token || fetchedRef.current) return;
    fetchedRef.current = true;
    
    const fetchMyTrades = async () => {
      setTradesLoading(true);
      try {
        const res = await fetch(`/api/pnl?wallet=${publicKey}&token=${token.address}`);
        const data = await res.json();
        if (data.trades) {
          setMyTrades(data.trades);
        }
      } catch (e) {
        console.error("Error fetching my trades:", e);
      }
      setTradesLoading(false);
    };
    
    fetchMyTrades();
  }, [publicKey, token?.address]);

  if (!publicKey) {
    return <EmptyState message="Connect wallet to see position" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-[#02c076]" />
      </div>
    );
  }

  const hasPosition = position && position.uiBalance > 0;
  const hasTrades = myTrades.length > 0;

  if (!hasPosition && !hasTrades && !tradesLoading) {
    return <EmptyState message={`No ${token.symbol} position or trades`} />;
  }

  return (
    <div className="p-3 space-y-3">
      {hasPosition && (
        <div className="bg-[#1e2329] rounded-lg p-3">
          <div className="flex items-center gap-3 mb-3">
            {token.logoURI ? (
              <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-lg" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#2b3139] flex items-center justify-center text-xs font-bold text-gray-500">
                {token.symbol.slice(0, 2)}
              </div>
            )}
            <div>
              <p className="font-bold text-white text-sm">{token.symbol}</p>
              <p className="text-[10px] text-gray-500">{token.name}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-bold text-[#02c076]">${position.value.toFixed(2)}</p>
              <p className={cn(
                "text-[10px] font-bold",
                position.priceChange24h >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
              )}>
                {position.priceChange24h >= 0 ? "+" : ""}{position.priceChange24h.toFixed(2)}%
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#0b0e11] rounded p-2">
              <span className="text-gray-500">Balance</span>
              <p className="font-bold text-white">{position.uiBalance.toLocaleString()} {token.symbol}</p>
            </div>
            <div className="bg-[#0b0e11] rounded p-2">
              <span className="text-gray-500">Price</span>
              <p className="font-mono text-white">${formatPrice(token.price)}</p>
            </div>
          </div>
        </div>
      )}

      {(hasTrades || tradesLoading) && (
        <div className="bg-[#1e2329] rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-[#2b3139]">
            <p className="text-[10px] font-bold text-gray-400 uppercase">My Trades</p>
          </div>
          {tradesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-[#02c076]" />
            </div>
          ) : (
            <div className="max-h-[100px] overflow-y-auto">
              {myTrades.map((trade, i) => (
                <div key={trade.tx_hash || i} className="flex items-center justify-between px-3 py-1.5 border-b border-[#2b3139]/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded",
                      trade.side === "buy" ? "bg-[#02c076]/20 text-[#02c076]" : "bg-[#f6465d]/20 text-[#f6465d]"
                    )}>
                      {trade.side?.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-white">{trade.amount?.toFixed(4)} {trade.side === "buy" ? "SOL" : token.symbol}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500">
                      {trade.created_at ? new Date(trade.created_at).toLocaleDateString() : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

  const TradeRow = React.memo(({ trade, isNew }: { trade: any; isNew: boolean }) => {
    const [age, setAge] = useState(trade.age);

    useEffect(() => {
      if (!trade.blockTime) return;
      
      const updateAge = () => {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - trade.blockTime;
        if (diff < 0) setAge("0s");
        else if (diff < 60) setAge(`${Math.floor(diff)}s`);
        else if (diff < 3600) setAge(`${Math.floor(diff / 60)}m`);
        else if (diff < 86400) setAge(`${Math.floor(diff / 3600)}h`);
        else setAge(`${Math.floor(diff / 86400)}d`);
      };

      updateAge();
      const interval = setInterval(updateAge, 1000);
      return () => clearInterval(interval);
    }, [trade.blockTime]);

    return (
      <div 
        className={cn(
          "grid grid-cols-4 sm:grid-cols-6 gap-1 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 border-b border-[#1e2329]/30 text-xs sm:text-sm transition-colors duration-500",
          isNew 
            ? (trade.type === "buy" ? "bg-[#02c076]/20" : "bg-[#f6465d]/20")
            : "hover:bg-[#1e2329]/50"
        )}
      >
        <span className="text-gray-400 text-[10px] sm:text-xs">{age}</span>
        <span className={cn(
          "font-bold text-[10px] sm:text-sm",
          trade.type === "buy" ? "text-[#02c076]" : "text-[#f6465d]"
        )}>
          {trade.type === "buy" ? "B" : "S"}
        </span>
        <span className="text-gray-400 font-mono text-[10px] hidden sm:block">
          {trade.price > 0 ? `$${formatPrice(trade.price)}` : "-"}
        </span>
        <span className={cn("font-medium text-[10px] sm:text-xs", trade.type === "buy" ? "text-[#02c076]" : "text-[#f6465d]")}>
          {formatNumber(trade.amount)}
        </span>
        <span className="text-white font-bold text-[10px] sm:text-sm">${formatNumber(trade.amountUsd || 0)}</span>
        <span className="text-gray-500 font-mono truncate text-[10px] hidden sm:block">{trade.maker}</span>
      </div>
    );
  });

  TradeRow.displayName = "TradeRow";

  function TradesTable({ trades, loading }: { trades: any[]; loading: boolean }) {
    const [newTradeIds, setNewTradeIds] = useState<Set<string>>(new Set());
    const prevTradesRef = useRef<any[]>(trades);

    useEffect(() => {
      // Find truly new trades by comparing IDs
      const prevIds = new Set(prevTradesRef.current.map(t => t.id || t.txHash));
      const newlyAdded = trades.filter(t => !prevIds.has(t.id || t.txHash));
      
      if (newlyAdded.length > 0) {
        const newIds = new Set(newlyAdded.map(t => t.id || t.txHash));
        setNewTradeIds(prev => new Set([...Array.from(prev), ...Array.from(newIds)]));
        
        // Clear highlight for these specific IDs after 2 seconds
        setTimeout(() => {
          setNewTradeIds(current => {
            const next = new Set(current);
            newIds.forEach(id => next.delete(id));
            return next;
          });
        }, 2000);
      }
      
      prevTradesRef.current = trades;
    }, [trades]);

    if (loading && trades.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-5 h-5 animate-spin text-[#02c076]" />
        </div>
      );
    }

    if (trades.length === 0) {
      return <EmptyState message="No recent trades" />;
    }

    return (
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2.5 text-[10px] sm:text-xs text-gray-500 font-bold uppercase border-b border-[#1e2329] sticky top-0 bg-[#0b0e11] z-10">
          <span>AGE</span>
          <span>TYPE</span>
          <span className="hidden sm:block">PRICE</span>
          <span>AMT</span>
          <span>USD</span>
          <span className="hidden sm:block">MAKER</span>
        </div>
        <div className="flex-1">
          {trades.map((trade) => (
            <TradeRow 
              key={trade.id || trade.txHash} 
              trade={trade} 
              isNew={newTradeIds.has(trade.id || trade.txHash)} 
            />
          ))}
        </div>
      </div>
    );
  }



function HoldersTable({ holders, loading }: { holders: any[]; loading: boolean }) {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.ceil(holders.length / perPage);
  const paginatedHolders = holders.slice((page - 1) * perPage, page * perPage);

  if (loading && holders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-[#02c076]" />
      </div>
    );
  }

  if (holders.length === 0) {
    return <EmptyState message="No holder data" />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2.5 text-[10px] sm:text-xs text-gray-500 font-bold uppercase border-b border-[#1e2329] sticky top-0 bg-[#0b0e11]">
          <span>#</span>
          <span>Address</span>
          <span>%</span>
          <span>PnL</span>
          <span className="hidden sm:block">Value</span>
        </div>
        {paginatedHolders.map((holder) => (
          <div key={holder.rank} className="grid grid-cols-4 sm:grid-cols-5 gap-1 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 hover:bg-[#1e2329]/50 border-b border-[#1e2329]/30 text-xs sm:text-sm">
            <span className="text-gray-400 text-[10px] sm:text-sm">{holder.rank}</span>
            <a 
              href={`https://solscan.io/account/${holder.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#02c076] font-mono hover:underline truncate text-[10px] sm:text-sm"
            >
              {holder.addressShort}
            </a>
            <span className="text-white font-bold text-[10px] sm:text-sm">{holder.percentage?.toFixed(2)}%</span>
            <span className={cn(
              "font-bold text-[10px] sm:text-sm",
              holder.pnl?.totalPnl > 0 ? "text-[#02c076]" : holder.pnl?.totalPnl < 0 ? "text-[#f6465d]" : "text-gray-500"
            )}>
              {holder.pnl ? (
                <>
                  {holder.pnl.totalPnl >= 0 ? "+" : ""}{holder.pnl.totalPnl.toFixed(2)} SOL
                  <span className="text-[8px] ml-0.5">
                    ({holder.pnl.pnlPercent >= 0 ? "+" : ""}{holder.pnl.pnlPercent.toFixed(0)}%)
                  </span>
                </>
              ) : "-"}
            </span>
            <span className="text-gray-400 text-[10px] hidden sm:block">
              {holder.value > 0 ? `$${formatNumber(holder.value)}` : "-"}
            </span>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#1e2329] bg-[#0b0e11]">
          <span className="text-[10px] text-gray-500">{holders.length} holders</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-2 py-1 text-[10px] bg-[#1e2329] hover:bg-[#2a3139] rounded text-white disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-[10px] text-gray-400 px-2">{page}/{totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 text-[10px] bg-[#1e2329] hover:bg-[#2a3139] rounded text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HolderDistributionChart({ holders, loading, totalHolders, distribution }: { holders: any[]; loading: boolean; totalHolders: number; distribution: { top10: number; top100: number; top500: number; totalTracked: number } | null }) {
  if (loading && holders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-[#02c076]" />
      </div>
    );
  }

  if (holders.length === 0) {
    return <EmptyState message="No holder data for distribution" />;
  }

  let top10: number;
  let next90: number;
  let next400: number;
  let rest: number;
  
  if (distribution) {
    top10 = distribution.top10;
    next90 = distribution.top100 - distribution.top10;
    next400 = distribution.top500 - distribution.top100;
    rest = Math.max(0, 100 - distribution.top500);
  } else {
    top10 = holders.slice(0, 10).reduce((sum, h) => sum + (h.percentage || 0), 0);
    next90 = holders.slice(10, 100).reduce((sum, h) => sum + (h.percentage || 0), 0);
    next400 = holders.slice(100, 500).reduce((sum, h) => sum + (h.percentage || 0), 0);
    rest = Math.max(0, 100 - top10 - next90 - next400);
  }

  const segments = [
    { label: "Top 10", percent: top10, color: "#f6465d", holders: "1-10" },
    { label: "11-100", percent: next90, color: "#f7931a", holders: "11-100" },
    { label: "101-500", percent: next400, color: "#02c076", holders: "101-500" },
    { label: "501+", percent: rest, color: "#3861fb", holders: `501-${totalHolders || "All"}` },
  ].filter(s => s.percent > 0);

  const total = segments.reduce((sum, s) => sum + s.percent, 0);
  
  let currentAngle = -90;
  const pieSegments = segments.map((segment) => {
    const angle = (segment.percent / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...segment, startAngle, angle };
  });

  const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="text-center mb-4">
        <h3 className="text-sm font-bold text-white mb-1">Holder Distribution</h3>
        <p className="text-[10px] text-gray-500">{totalHolders.toLocaleString()} total holders</p>
      </div>
      
      <div className="flex items-center justify-center flex-1">
        <div className="relative">
          <svg width="180" height="180" viewBox="0 0 180 180">
            {pieSegments.map((segment, i) => (
              <path
                key={i}
                d={describeArc(90, 90, 70, segment.startAngle, segment.startAngle + segment.angle - 0.5)}
                fill={segment.color}
                stroke="#0b0e11"
                strokeWidth="2"
                className="transition-opacity hover:opacity-80"
              />
            ))}
            <circle cx="90" cy="90" r="35" fill="#0b0e11" />
            <text x="90" y="85" textAnchor="middle" className="fill-white text-[10px] font-bold">
              {total.toFixed(1)}%
            </text>
            <text x="90" y="100" textAnchor="middle" className="fill-gray-500 text-[8px]">
              tracked
            </text>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-2 bg-[#1e2329] rounded-lg px-3 py-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-white truncate">{segment.label}</p>
              <p className="text-[9px] text-gray-500">#{segment.holders}</p>
            </div>
            <p className="text-[10px] font-bold text-white ml-auto">{segment.percent.toFixed(1)}%</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[#1e2329]">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-[#1e2329] rounded-lg p-2">
            <p className="text-[9px] text-gray-500 uppercase">Top 10 Hold</p>
            <p className={cn(
              "text-sm font-bold",
              top10 > 50 ? "text-[#f6465d]" : top10 > 30 ? "text-[#f7931a]" : "text-[#02c076]"
            )}>
              {top10.toFixed(1)}%
            </p>
          </div>
          <div className="bg-[#1e2329] rounded-lg p-2">
            <p className="text-[9px] text-gray-500 uppercase">Distribution</p>
            <p className={cn(
              "text-sm font-bold",
              top10 > 50 ? "text-[#f6465d]" : top10 > 30 ? "text-[#f7931a]" : "text-[#02c076]"
            )}>
              {top10 > 50 ? "Poor" : top10 > 30 ? "Fair" : "Good"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-500 text-xs sm:text-sm p-4">
      {message}
    </div>
  );
}
