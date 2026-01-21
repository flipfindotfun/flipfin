"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  DollarSign, 
  Users, 
  Clock,
  ChevronRight,
  Loader2,
  Zap,
  AlertTriangle,
  Skull,
  Sparkles,
  RefreshCw,
  Heart,
  MessageCircle,
} from "lucide-react";
import { XIcon } from "@/components/icons";
import Link from "next/link";
import { formatNumber } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AIAnalysisWidget } from "@/components/ai-analysis-widget";
import { TwitterFeed } from "@/components/twitter-feed";

interface Narrative {
  id: string;
  name: string;
  category: string;
  momentumScore: number;
  capitalInflow: number;
  lifecycleStage: "emerging" | "trending" | "overheated" | "rotating" | "dead";
  topTokens: { address: string; symbol: string; change24h: number }[];
  smartWalletExposure: number;
  trendChange: number;
  twitterData?: {
    tweetCount: number;
    sentiment: string;
    sentimentScore: number;
    engagement: number;
    topTweets: { text: string; author: string; likes: number }[];
  };
}

const LIFECYCLE_CONFIG = {
  emerging: { color: "text-blue-400", bg: "bg-blue-400/10", icon: Sparkles, label: "Emerging" },
  trending: { color: "text-green-400", bg: "bg-green-400/10", icon: TrendingUp, label: "Trending" },
  overheated: { color: "text-orange-400", bg: "bg-orange-400/10", icon: Flame, label: "Overheated" },
  rotating: { color: "text-yellow-400", bg: "bg-yellow-400/10", icon: RefreshCw, label: "Rotating" },
  dead: { color: "text-gray-400", bg: "bg-gray-400/10", icon: Skull, label: "Dead" },
};

const CATEGORIES = ["All", "AI", "Meme", "DeFi", "Gaming", "RWA", "Infra", "Social"];

export default function NarrativesPage() {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"momentum" | "inflow" | "exposure">("momentum");
  const [selectedNarrative, setSelectedNarrative] = useState<Narrative | null>(null);

  useEffect(() => {
    fetchNarratives();
  }, []);

  const fetchNarratives = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/narratives");
      const data = await res.json();
      setNarratives(data.narratives || []);
    } catch (err) {
      console.error("Failed to fetch narratives:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredNarratives = narratives
    .filter((n) => selectedCategory === "All" || n.category === selectedCategory)
    .sort((a, b) => {
      if (sortBy === "momentum") return b.momentumScore - a.momentumScore;
      if (sortBy === "inflow") return b.capitalInflow - a.capitalInflow;
      return b.smartWalletExposure - a.smartWalletExposure;
    });

  const getMomentumColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getSentimentColor = (s: string) => {
    if (s === "bullish") return "text-green-400 bg-green-400/10";
    if (s === "bearish") return "text-red-400 bg-red-400/10";
    return "text-yellow-400 bg-yellow-400/10";
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0e11] overflow-hidden">
      <Header />
      
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold text-white">Narrative Tracker</h1>
                  <p className="text-sm text-gray-500">Real-time Twitter sentiment & capital rotation</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-[#1e2329] border border-[#2b3139] text-white text-xs rounded-lg px-3 py-2"
                  >
                    <option value="momentum">Sort by Momentum</option>
                    <option value="inflow">Sort by Inflow</option>
                    <option value="exposure">Sort by Smart Money</option>
                  </select>
                  
                  <button
                    onClick={fetchNarratives}
                    disabled={loading}
                    className="p-2 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
                  >
                    <RefreshCw className={cn("w-4 h-4 text-white", loading && "animate-spin")} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-4 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors",
                      selectedCategory === cat
                        ? "bg-[#02c076] text-black"
                        : "bg-[#1e2329] text-gray-400 hover:text-white"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#02c076]" />
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredNarratives.map((narrative) => {
                    const lifecycle = LIFECYCLE_CONFIG[narrative.lifecycleStage];
                    const LifecycleIcon = lifecycle.icon;
                    const isSelected = selectedNarrative?.id === narrative.id;
                    
                    return (
                      <div
                        key={narrative.id}
                        onClick={() => setSelectedNarrative(narrative)}
                        className={cn(
                          "bg-[#0d1117] border rounded-xl p-4 transition-colors cursor-pointer",
                          isSelected ? "border-[#02c076]" : "border-[#1e2329] hover:border-[#2b3139]"
                        )}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-white">{narrative.name}</h3>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e2329] text-gray-400">
                                {narrative.category}
                              </span>
                              {narrative.twitterData && (
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full capitalize",
                                  getSentimentColor(narrative.twitterData.sentiment)
                                )}>
                                  {narrative.twitterData.sentiment}
                                </span>
                              )}
                            </div>
                            <div className={cn("flex items-center gap-1.5 text-xs", lifecycle.color)}>
                              <LifecycleIcon className="w-3.5 h-3.5" />
                              <span>{lifecycle.label}</span>
                            </div>
                          </div>
                          
                          <div className={cn("px-3 py-1.5 rounded-lg", lifecycle.bg)}>
                            <div className="flex items-center gap-1">
                              {narrative.trendChange >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-[#02c076]" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-[#f6465d]" />
                              )}
                              <span className={cn(
                                "text-sm font-bold",
                                narrative.trendChange >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                              )}>
                                {narrative.trendChange >= 0 ? "+" : ""}{narrative.trendChange}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-[#1e2329] rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Zap className={cn("w-3.5 h-3.5", getMomentumColor(narrative.momentumScore))} />
                              <span className="text-[10px] text-gray-500">Momentum</span>
                            </div>
                            <span className={cn("text-lg font-bold", getMomentumColor(narrative.momentumScore))}>
                              {narrative.momentumScore}
                            </span>
                          </div>
                          
                          <div className="bg-[#1e2329] rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <DollarSign className="w-3.5 h-3.5 text-[#02c076]" />
                              <span className="text-[10px] text-gray-500">Inflow</span>
                            </div>
                            <span className="text-lg font-bold text-white">
                              ${formatNumber(narrative.capitalInflow)}
                            </span>
                          </div>
                          
                          <div className="bg-[#1e2329] rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Users className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-[10px] text-gray-500">Smart $</span>
                            </div>
                            <span className="text-lg font-bold text-white">
                              {narrative.smartWalletExposure}%
                            </span>
                          </div>
                        </div>

                          {narrative.twitterData && narrative.twitterData.topTweets.length > 0 && (
                            <div className="mb-4 p-3 bg-[#1e2329] rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <XIcon className="w-3.5 h-3.5 text-white" />
                                <span className="text-[10px] font-medium text-gray-400">
                                  {narrative.twitterData.tweetCount} tweets • {narrative.twitterData.engagement.toLocaleString()} engagement
                                </span>
                              </div>
                            <p className="text-xs text-gray-300 line-clamp-2">
                              {narrative.twitterData.topTweets[0]?.text}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-gray-500">
                                @{narrative.twitterData.topTweets[0]?.author}
                              </span>
                              <div className="flex items-center gap-1 text-gray-500">
                                <Heart className="w-3 h-3" />
                                <span className="text-[10px]">{narrative.twitterData.topTweets[0]?.likes}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="border-t border-[#1e2329] pt-3">
                          <p className="text-[10px] text-gray-500 mb-2">Top Tokens</p>
                          <div className="flex flex-wrap gap-2">
                            {narrative.topTokens.slice(0, 4).map((token) => (
                              <Link
                                key={token.address}
                                href={`/trade/${token.address}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
                              >
                                <span className="text-xs font-medium text-white">{token.symbol}</span>
                                <span className={cn(
                                  "text-[10px] font-bold",
                                  token.change24h >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                                )}>
                                  {token.change24h >= 0 ? "+" : ""}{token.change24h}%
                                </span>
                              </Link>
                            ))}
                            {narrative.topTokens.length > 4 && (
                              <span className="text-xs text-gray-500 px-2 py-1">
                                +{narrative.topTokens.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:w-80 space-y-4">
              {selectedNarrative && (
                <AIAnalysisWidget
                  type="narrative"
                  data={{
                    name: selectedNarrative.name,
                    tokens: selectedNarrative.topTokens.map((t) => ({
                      symbol: t.symbol,
                      priceChange24h: t.change24h,
                      volume24h: 0,
                    })),
                  }}
                />
              )}

              <TwitterFeed
                query="crypto narrative alpha solana ethereum -is:retweet lang:en"
                limit={10}
                title="Narrative Alpha"
              />

              <div className="bg-[#0d1117] border border-[#1e2329] rounded-xl p-4">
                <h3 className="text-sm font-medium text-white mb-3">Lifecycle Stages</h3>
                <div className="space-y-2">
                  {Object.entries(LIFECYCLE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const count = narratives.filter((n) => n.lifecycleStage === key).length;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", config.color)} />
                          <span className="text-xs text-gray-400">{config.label}</span>
                        </div>
                        <span className={cn("text-xs font-bold", config.color)}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
