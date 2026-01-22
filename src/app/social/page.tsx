"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import {
  Shield,
  AlertTriangle,
  Bot,
  Users,
  TrendingUp,
  Eye,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Search,
  MessageCircle,
  Heart,
} from "lucide-react";
import { XIcon } from "@/components/icons";
import Link from "next/link";
import { formatNumber } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { AIAnalysisWidget } from "@/components/ai-analysis-widget";
import { TwitterFeed } from "@/components/twitter-feed";
import { MarketStatsWidget } from "@/components/market-stats-widget";

interface TokenHype {
  address: string;
  symbol: string;
  name: string;
  hypeScore: number;
  botRatio: number;
  influencerOwnership: number;
  coordinatedShills: number;
  organicRatio: number;
  redFlags: string[];
  greenFlags: string[];
  volume24h: number;
  holders: number;
  topHolderPercent: number;
  updatedAt: string;
  tweets?: { text: string; author: string; likes: number; retweets: number }[];
  sentiment?: { score: number; label: string; engagement: number };
}

export default function SocialProofPage() {
  const [tokens, setTokens] = useState<TokenHype[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenHype | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const res = await fetch("/api/social-proof");
      const data = await res.json();
      setTokens(data.tokens || []);
    } catch (err) {
      console.error("Failed to fetch social proof data:", err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeToken = async () => {
    if (!searchQuery || searchQuery.length < 32) return;
    
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/social-proof?address=${searchQuery}`);
      const data = await res.json();
      if (data.token) {
        setTokens((prev) => {
          const exists = prev.find((t) => t.address === data.token.address);
          if (exists) return prev;
          return [data.token, ...prev];
        });
        setSelectedToken(data.token);
      }
    } catch (err) {
      console.error("Failed to analyze token:", err);
    } finally {
      setAnalyzing(false);
      setSearchQuery("");
    }
  };

  const getHypeColor = (score: number) => {
    if (score >= 70) return { text: "text-green-400", bg: "bg-green-400" };
    if (score >= 50) return { text: "text-yellow-400", bg: "bg-yellow-400" };
    if (score >= 30) return { text: "text-orange-400", bg: "bg-orange-400" };
    return { text: "text-red-400", bg: "bg-red-400" };
  };

  const getHypeLabel = (score: number) => {
    if (score >= 70) return "Organic";
    if (score >= 50) return "Mixed";
    if (score >= 30) return "Suspicious";
    return "Fake Hype";
  };

  const [showRightPanel, setShowRightPanel] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-[#0b0e11] overflow-hidden">
      <Header />

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#02c076]" />
                    Social Proof Engine
                  </h1>
                    <p className="text-sm text-gray-500">Real-time X analysis & hype detection</p>

                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && analyzeToken()}
                      placeholder="Paste token address..."
                      className="pl-9 pr-4 bg-[#1e2329] border-[#2b3139] text-xs"
                    />
                  </div>
                  <button
                    onClick={analyzeToken}
                    disabled={analyzing || searchQuery.length < 32}
                    className="px-4 py-2 bg-[#02c076] text-black text-xs font-bold rounded-lg hover:bg-[#02a566] disabled:opacity-50 transition-colors"
                  >
                    {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
                  </button>
                  <button
                    onClick={fetchTokens}
                    className="p-2 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#02c076]" />
                </div>
              ) : (
                <div className="space-y-4">
                  {tokens.map((token) => {
                    const hypeColor = getHypeColor(token.hypeScore);
                    
                    return (
                      <div
                        key={token.address}
                        className={cn(
                          "bg-[#0d1117] border rounded-xl p-4 transition-colors cursor-pointer",
                          selectedToken?.address === token.address 
                            ? "border-[#02c076]" 
                            : "border-[#1e2329] hover:border-[#2b3139]"
                        )}
                        onClick={() => setSelectedToken(token)}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Link
                                    href={`/trade/${token.address}`}
                                    className="text-lg font-bold text-white hover:text-[#02c076] transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {token.symbol}
                                  </Link>
                                  <span className="text-xs text-gray-500">{token.name}</span>
                                  {token.sentiment && (
                                    <span className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-full capitalize",
                                      token.sentiment.label === "bullish" ? "bg-green-400/10 text-green-400" :
                                      token.sentiment.label === "bearish" ? "bg-red-400/10 text-red-400" :
                                      "bg-yellow-400/10 text-yellow-400"
                                    )}>
                                      {token.sentiment.label}
                                    </span>
                                  )}
                                </div>
                                <code className="text-[10px] text-gray-600 font-mono">
                                  {token.address.slice(0, 8)}...{token.address.slice(-6)}
                                </code>
                              </div>

                              <div className={cn("flex flex-col items-center px-4 py-2 rounded-xl", hypeColor.bg + "/10")}>
                                <span className={cn("text-2xl font-bold", hypeColor.text)}>
                                  {token.hypeScore}
                                </span>
                                <span className={cn("text-[10px] font-medium", hypeColor.text)}>
                                  {getHypeLabel(token.hypeScore)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              <div className="bg-[#1e2329] rounded-lg p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Bot className="w-3.5 h-3.5 text-red-400" />
                                  <span className="text-[10px] text-gray-500">Bot Ratio</span>
                                </div>
                                <span className={cn(
                                  "text-lg font-bold",
                                  token.botRatio > 30 ? "text-red-400" : "text-white"
                                )}>
                                  {token.botRatio}%
                                </span>
                              </div>

                              <div className="bg-[#1e2329] rounded-lg p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Users className="w-3.5 h-3.5 text-purple-400" />
                                  <span className="text-[10px] text-gray-500">Influencer Own</span>
                                </div>
                                <span className={cn(
                                  "text-lg font-bold",
                                  token.influencerOwnership > 5 ? "text-yellow-400" : "text-white"
                                )}>
                                  {token.influencerOwnership}%
                                </span>
                              </div>

                              <div className="bg-[#1e2329] rounded-lg p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                                  <span className="text-[10px] text-gray-500">Coord. Shills</span>
                                </div>
                                <span className={cn(
                                  "text-lg font-bold",
                                  token.coordinatedShills > 5 ? "text-red-400" : "text-white"
                                )}>
                                  {token.coordinatedShills}
                                </span>
                              </div>

                              <div className="bg-[#1e2329] rounded-lg p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-[#02c076]" />
                                  <span className="text-[10px] text-gray-500">Organic</span>
                                </div>
                                <span className="text-lg font-bold text-[#02c076]">
                                  {token.organicRatio}%
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {token.redFlags.length > 0 && (
                                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                  <p className="text-[10px] font-medium text-red-400 mb-2">Red Flags</p>
                                  <div className="space-y-1">
                                    {token.redFlags.slice(0, 3).map((flag, i) => (
                                      <div key={i} className="flex items-start gap-2">
                                        <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-xs text-gray-400">{flag}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {token.greenFlags.length > 0 && (
                                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                                  <p className="text-[10px] font-medium text-green-400 mb-2">Green Flags</p>
                                  <div className="space-y-1">
                                    {token.greenFlags.slice(0, 3).map((flag, i) => (
                                      <div key={i} className="flex items-start gap-2">
                                        <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-xs text-gray-400">{flag}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {token.tweets && token.tweets.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-[#1e2329]">
                                <div className="flex items-center gap-2 mb-2">
                                  <XIcon className="w-3.5 h-3.5 text-white" />
                                  <span className="text-[10px] font-medium text-gray-400">Recent Tweets</span>
                                </div>
                                <div className="space-y-2">
                                  {token.tweets.slice(0, 2).map((tweet, i) => (
                                    <div key={i} className="bg-[#1e2329] rounded-lg p-2">
                                      <p className="text-xs text-gray-300 line-clamp-2">{tweet.text}</p>
                                      <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[10px] text-gray-500">@{tweet.author}</span>
                                        <div className="flex items-center gap-1 text-gray-500">
                                          <Heart className="w-3 h-3" />
                                          <span className="text-[10px]">{tweet.likes}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="lg:w-40 flex lg:flex-col gap-3">
                            <div className="flex-1 bg-[#1e2329] rounded-lg p-3">
                              <p className="text-[10px] text-gray-500 mb-1">24h Volume</p>
                              <span className="text-sm font-bold text-white">
                                ${formatNumber(token.volume24h)}
                              </span>
                            </div>
                            <div className="flex-1 bg-[#1e2329] rounded-lg p-3">
                              <p className="text-[10px] text-gray-500 mb-1">Holders</p>
                              <span className="text-sm font-bold text-white">
                                {formatNumber(token.holders)}
                              </span>
                            </div>
                            <div className="flex-1 bg-[#1e2329] rounded-lg p-3">
                              <p className="text-[10px] text-gray-500 mb-1">Top 10 Hold</p>
                              <span className={cn(
                                "text-sm font-bold",
                                token.topHolderPercent > 50 ? "text-red-400" : "text-white"
                              )}>
                                {token.topHolderPercent}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {tokens.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                      <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No tokens analyzed yet</p>
                      <p className="text-xs mt-1">Paste a token address above to analyze</p>
                    </div>
                  )}
                </div>
              )}
            </div>

              <div className="lg:w-80 space-y-4 hidden lg:block">
                <MarketStatsWidget />
                
                {selectedToken && (
                  <AIAnalysisWidget
                    type="token"
                    data={{
                      symbol: selectedToken.symbol,
                      name: selectedToken.name,
                      price: 0,
                      priceChange24h: 0,
                      volume24h: selectedToken.volume24h,
                      marketCap: 0,
                      holders: selectedToken.holders,
                      topHolderPercent: selectedToken.topHolderPercent,
                    }}
                  />
                )}

                  <TwitterFeed
                    query={selectedToken ? `$${selectedToken.symbol} OR ${selectedToken.address.slice(0, 8)}` : "solana memecoin crypto"}
                    limit={8}
                    title={selectedToken ? `${selectedToken.symbol} Tweets` : "Crypto Twitter"}
                    key={selectedToken?.address || "default"}
                  />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
