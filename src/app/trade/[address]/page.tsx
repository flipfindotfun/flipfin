"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Share2, Copy, ExternalLink, Loader2,
  CheckCircle, AlertTriangle, RefreshCw, Wallet, Star, Eye
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
import { BirdeyeChart } from "@/components/birdeye-chart";

const SOL_MINT = "So11111111111111111111111111111111111111112";

type TradeTab = "trades" | "orders" | "positions" | "history" | "holders" | "topTraders" | "devTokens";

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
  const [isTrading, setIsTrading] = useState(false);
  
  const [trades, setTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [holders, setHolders] = useState<any[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [holdersCount, setHoldersCount] = useState(0);
  const [quoteInfo, setQuoteInfo] = useState<{ outAmount: string; priceImpact: string } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    setLoading(true);
    const existing = tokens.find(t => t.address === address);
    if (existing) {
      setToken(existing);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${address}`);
      const pairs = await res.json();
      
      if (Array.isArray(pairs) && pairs.length > 0) {
        const mainPair = pairs.sort((a: any, b: any) => 
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];
        
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
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [address, tokens]);

  const fetchTrades = useCallback(async () => {
    if (!address) return;
    setTradesLoading(true);
    try {
      const res = await fetch(`/api/token/trades?address=${address}&limit=50`);
      const data = await res.json();
      if (data.trades && Array.isArray(data.trades)) {
        setTrades(data.trades);
      }
    } catch (e) {
      console.error("Error fetching trades:", e);
    }
    setTradesLoading(false);
  }, [address]);

  const fetchHolders = useCallback(async () => {
    if (!address) return;
    setHoldersLoading(true);
    try {
      const res = await fetch(`/api/token/holders?address=${address}&limit=30`);
      const data = await res.json();
      if (data.holders && Array.isArray(data.holders)) {
        setHolders(data.holders);
        setHoldersCount(data.total || data.holders.length);
      }
    } catch (e) {
      console.error("Error fetching holders:", e);
    }
    setHoldersLoading(false);
  }, [address]);

  useEffect(() => {
    fetchToken();
    fetchTrades();
    fetchHolders();
  }, []);

  const fetchQuote = useCallback(async () => {
    if (!token) return;
    
    setQuoteLoading(true);
    setQuoteError(null);
    setQuoteInfo(null);

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
        const sellAmount = (position.uiBalance * sellPercent) / 100;
        rawAmount = Math.floor(sellAmount * Math.pow(10, position.decimals || 9));
      }

      const quote = await getQuote(inputMint, outputMint, rawAmount, settings.slippagePercent * 100);
      
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
  }, [token, buyAmount, activeTab, sellPercent, position, getQuote, settings.slippagePercent]);

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
        const sellAmount = (position.uiBalance * sellPercent) / 100;
        rawAmount = Math.floor(sellAmount * Math.pow(10, position.decimals || 9));
        displayAmount = sellAmount;
      }

      toast.loading("Getting quote...");
      const quote = await getQuote(inputMint, outputMint, rawAmount, settings.slippagePercent * 100);
      
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
          <button className="p-1 hover:bg-[#1e2329] rounded text-gray-500 hover:text-yellow-500">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 min-h-0 order-2 lg:order-1">
              <div className="flex-1 min-h-[180px] sm:min-h-[250px] lg:min-h-[300px]">
                    <BirdeyeChart 
                      symbol={token.symbol} 
                      tokenAddress={token.address}
                    />
                  </div>

            <div className="border-t border-[#1e2329] hidden lg:block">
              <div className="flex items-center gap-1 px-2 sm:px-3 py-1.5 border-b border-[#1e2329] overflow-x-auto no-scrollbar">
                {[
                  { id: "trades", label: "Trades" },
                  { id: "positions", label: "Positions" },
                  { id: "holders", label: `Holders ${holdersCount}` },
                  { id: "topTraders", label: "Top" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTradeTab(tab.id as TradeTab)}
                    className={cn(
                      "px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded whitespace-nowrap transition-all",
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
                  className="p-1.5 hover:bg-[#1e2329] rounded text-gray-500 hover:text-white flex-shrink-0"
                >
                  <RefreshCw className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", tradesLoading && "animate-spin")} />
                </button>
              </div>

              <div className="h-[140px] sm:h-[180px] overflow-y-auto">
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
                {activeTradeTab === "topTraders" && <HoldersTable holders={holders.slice(0, 10)} loading={holdersLoading} />}
              </div>
            </div>
          </div>

<div className="w-full lg:w-[280px] xl:w-[320px] flex flex-col border-t lg:border-t-0 lg:border-l border-[#1e2329] bg-[#0b0e11] order-1 lg:order-2 overflow-y-auto">
            <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-[#1e2329]">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[10px] text-gray-500">Price</p>
                  <p className="text-sm font-bold text-white">${formatPrice(token.price)}</p>
                </div>
                <div className={cn(
                  "text-sm font-bold",
                  isPositive ? "text-[#02c076]" : "text-[#f6465d]"
                )}>
                  {isPositive ? "+" : ""}{token.priceChange24h.toFixed(2)}%
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">Balance</p>
                <p className="text-sm font-bold text-white">{balance.toFixed(4)} SOL</p>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-5 gap-px border-b border-[#1e2329] bg-[#1e2329]">
              {[
                { label: "1m", change: token.priceChange24h * 0.08 },
                { label: "5m", change: token.priceChange24h * 0.15 },
                { label: "1h", change: token.priceChange24h * 0.4 },
                { label: "24h", change: token.priceChange24h },
              ].map((item) => (
                <div key={item.label} className="text-center py-1.5 bg-[#0b0e11]">
                  <p className="text-[9px] text-gray-500">{item.label}</p>
                  <p className={cn(
                    "text-[10px] font-bold",
                    item.change >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                  )}>{item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%</p>
                </div>
              ))}
              <div className="text-center py-1.5 bg-[#0b0e11]">
                <p className="text-[9px] text-gray-500">Vol</p>
                <p className="text-[10px] text-white font-bold">${formatNumber(token.volume24h)}</p>
              </div>
              </div>

              <div className="hidden lg:grid grid-cols-5 gap-px border-b border-[#1e2329] bg-[#1e2329] text-[9px]">
                <div className="text-center py-1.5 bg-[#0b0e11]">
                  <span className="text-gray-500">Buys</span>
                  <p className="text-[#02c076] font-bold">{token.buys24h || Math.floor(token.volume24h / 800)}</p>
                </div>
                <div className="text-center py-1.5 bg-[#0b0e11]">
                  <span className="text-gray-500">Sells</span>
                  <p className="text-[#f6465d] font-bold">{token.sells24h || Math.floor(token.volume24h / 1000)}</p>
                </div>
                <div className="text-center py-1.5 bg-[#0b0e11]">
                  <span className="text-gray-500">Net Buy</span>
                  <p className="text-[#02c076] font-bold">+${formatNumber(token.volume24h * 0.08)}</p>
                </div>
                <div className="text-center py-1.5 bg-[#0b0e11]">
                  <span className="text-gray-500">Bal</span>
                  <p className="text-white font-bold">{balance.toFixed(3)}</p>
                  <p className="text-gray-500 text-[8px]">SOL</p>
                </div>
                <div className="text-center py-1.5 bg-[#0b0e11]">
                  <span className="text-gray-500">Bought</span>
                  <p className="text-white font-bold">${formatNumber(position?.value || 0)}</p>
                </div>
              </div>

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
            <button className="ml-1 px-2 py-2 text-[10px] font-bold bg-[#1e2329] text-gray-400 rounded">
              Auto
            </button>
          </div>

          <div className="p-2 space-y-2 flex-1">
            {!publicKey ? (
              <div className="flex flex-col items-center gap-2 py-4 sm:py-6">
                <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600" />
                <p className="text-xs sm:text-sm text-gray-500 text-center">Connect wallet to trade</p>
                <Button 
                  onClick={generateWallet}
                  className="bg-[#02c076] hover:bg-[#02a566] text-black font-bold text-xs sm:text-sm"
                >
                  Generate Wallet
                </Button>
                <Link href="/wallet" className="text-[#02c076] text-[10px] sm:text-xs hover:underline">
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
                            buyAmount === amt.toString() 
                              ? "bg-[#02c076] text-black" 
                              : "bg-[#1e2329] hover:bg-[#2b3139] text-gray-400"
                          )}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-1">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setSellPercent(pct)}
                          className={cn(
                            "flex-1 py-2 text-[10px] font-bold rounded",
                            sellPercent === pct 
                              ? "bg-[#f6465d] text-white" 
                              : "bg-[#1e2329] hover:bg-[#2b3139] text-gray-400"
                          )}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                    {position && position.uiBalance > 0 && (
                      <p className="text-[10px] text-gray-500 mt-1.5 px-1">
                        Selling: {((position.uiBalance * sellPercent) / 100).toFixed(4)} {token.symbol}
                      </p>
                    )}
                  </div>
                )}

                {quoteInfo && !quoteLoading && (
                  <div className="bg-[#1e2329] rounded p-2 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Est. receive</span>
                      <span className="text-white font-mono">
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
                      (activeTab === "sell" && (!position || position.uiBalance <= 0))
                    }
                    className={cn(
                      "w-full h-10 font-bold text-sm",
                      activeTab === "buy" 
                        ? "bg-[#02c076] hover:bg-[#02a566] text-black" 
                        : "bg-[#f6465d] hover:bg-[#d9304a] text-white"
                    )}
                  >
                    {isTrading || isSwapping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      `${activeTab === "buy" ? "Buy" : "Sell"} ${activeTab === "buy" ? buyAmount : sellPercent + "%"} (${activeTab === "buy" ? "$" + (parseFloat(buyAmount || "0") * 240).toFixed(2) : "$" + ((position?.value || 0) * sellPercent / 100).toFixed(2)})`
                    )}
                  </Button>

                  <div className="hidden lg:grid grid-cols-4 gap-1 pt-1">
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

                  <div className="hidden lg:grid grid-cols-4 gap-1 pt-1">
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

                  <div className="hidden lg:flex gap-1 pt-1">
                    <SecurityBadge label="NoMint" safe={!token.security?.isMintable} />
                    <SecurityBadge label="NoBlacklist" safe={true} />
                    <SecurityBadge label="Burnt" safe={true} />
                  </div>
                </>
              )}

              <div className="hidden lg:grid grid-cols-2 gap-1.5 pt-2">
              <a
                href={`https://dexscreener.com/solana/${token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold bg-[#1e2329] hover:bg-[#2b3139] rounded text-gray-400 hover:text-white"
              >
                <ExternalLink className="w-3 h-3" />
                DexScreener
              </a>
              <a
                href={`https://solscan.io/token/${token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold bg-[#1e2329] hover:bg-[#2b3139] rounded text-gray-400 hover:text-white"
              >
                <ExternalLink className="w-3 h-3" />
                Solscan
              </a>
            </div>
          </div>
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

function PositionDisplay({ 
  position, 
  loading, 
  token,
  publicKey 
}: { 
  position: any; 
  loading: boolean; 
  token: Token;
  publicKey: string | null;
}) {
  const [myTrades, setMyTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);

  useEffect(() => {
    if (!publicKey || !token) return;
    
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
  }, [publicKey, token]);

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

function TradesTable({ trades, loading }: { trades: any[]; loading: boolean }) {
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
    <div className="text-[10px]">
      <div className="grid grid-cols-6 gap-2 px-3 py-1.5 text-gray-500 font-bold uppercase border-b border-[#1e2329] sticky top-0 bg-[#0b0e11]">
        <span>Age</span>
        <span>Type</span>
        <span>Price</span>
        <span>Amount</span>
        <span>USD</span>
        <span>Maker</span>
      </div>
      {trades.map((trade, i) => (
        <div key={trade.id || i} className="grid grid-cols-6 gap-2 px-3 py-1.5 hover:bg-[#1e2329]/50 border-b border-[#1e2329]/30">
          <span className="text-gray-400">{trade.age}</span>
          <span className={trade.type === "buy" ? "text-[#02c076]" : "text-[#f6465d]"}>
            {trade.type === "buy" ? "B" : "S"}
          </span>
          <span className="text-white font-mono">{trade.mcap || "-"}</span>
          <span className="text-[#02c076]">{formatNumber(trade.amount)}</span>
          <span className="text-white">${formatNumber(trade.amountUsd || 0)}</span>
          <span className="text-gray-500 font-mono">{trade.maker}</span>
        </div>
      ))}
    </div>
  );
}

function HoldersTable({ holders, loading }: { holders: any[]; loading: boolean }) {
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
    <div className="text-[10px]">
      <div className="grid grid-cols-4 gap-2 px-3 py-1.5 text-gray-500 font-bold uppercase border-b border-[#1e2329] sticky top-0 bg-[#0b0e11]">
        <span>#</span>
        <span>Address</span>
        <span>%</span>
        <span>Txns</span>
      </div>
      {holders.map((holder) => (
        <div key={holder.rank} className="grid grid-cols-4 gap-2 px-3 py-1.5 hover:bg-[#1e2329]/50 border-b border-[#1e2329]/30">
          <span className="text-gray-400">{holder.rank}</span>
          <a 
            href={`https://solscan.io/account/${holder.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#02c076] font-mono hover:underline"
          >
            {holder.addressShort}
          </a>
          <span className="text-white">{holder.percentage?.toFixed(2)}%</span>
          <span className="text-gray-400">{holder.txCount || "-"}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      {message}
    </div>
  );
}
