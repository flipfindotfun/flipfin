"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/header";
import { FlowMap } from "@/components/flow-map";
import { FlowMetrics } from "@/components/flow-metrics";
import { 
  Loader2, 
  Play, 
  Pause, 
  RotateCcw, 
  Info, 
  X, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  ChevronUp,
  ChevronDown,
  Layout
} from "lucide-react";
import { AIAnalysisWidget } from "@/components/ai-analysis-widget";
import { TwitterFeed } from "@/components/twitter-feed";
import { formatNumber } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface FlowNode {
  id: string;
  type: "wallet" | "token" | "pool";
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  cluster?: string;
  volume?: number;
  logoUrl?: string;
  metadata?: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  timestamp: number;
  animated?: boolean;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  metrics: {
    heatScore: number;
    whaleDensity: number;
    rotationSpeed: number;
    totalVolume24h: number;
    activeWallets: number;
    topInflows: { token: string; symbol: string; amount: number; logoUrl?: string }[];
    topOutflows: { token: string; symbol: string; amount: number; logoUrl?: string }[];
  };
}

export default function FlowPage() {
  const [data, setData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [timeRange, setTimeRange] = useState<"1h" | "4h" | "24h">("1h");
  const [showInfo, setShowInfo] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFlowData = useCallback(async () => {
    try {
      const res = await fetch(`/api/flow?range=${timeRange}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch flow data:", err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchFlowData();
    if (isPlaying) {
      intervalRef.current = setInterval(fetchFlowData, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchFlowData, isPlaying]);

  const handleNodeClick = (node: FlowNode) => {
    setSelectedNode(node);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0e11] overflow-hidden">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2329]">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Money Flow Map</h1>
              <span className="text-xs text-gray-500">Live Solana token flows</span>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-1 hover:bg-[#1e2329] rounded transition-colors"
              >
                <Info className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-[#1e2329] rounded-lg p-0.5">
                {(["1h", "4h", "24h"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      timeRange === range
                        ? "bg-[#02c076] text-black"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white" />
                )}
              </button>
              
              <button
                onClick={fetchFlowData}
                className="p-2 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="px-4 py-3 bg-[#1e2329]/50 border-b border-[#1e2329]">
              <div className="max-w-3xl">
                <p className="text-xs text-gray-400 mb-2">
                  <span className="text-white font-medium">Money Flow Map</span> visualizes real-time trading activity across top Solana tokens. Each node is a token with its logo.
                </p>
                <div className="grid grid-cols-3 gap-3 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
                    <span className="text-gray-400">Pumping (&gt;5% gain)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#fbbf24]" />
                    <span className="text-gray-400">Stable (-5% to +5%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#f6465d]" />
                    <span className="text-gray-400">Dumping (&lt;-5%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {data && (
            <div className="hidden sm:block">
              <FlowMetrics metrics={data.metrics} />
            </div>
          )}

          <div className="flex-1 relative">
            <div className="absolute top-4 left-4 z-10 sm:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-2 bg-[#1e2329] border border-[#2b3139] rounded-lg text-white flex items-center gap-2 shadow-lg">
                    <Layout className="w-4 h-4" />
                    <span className="text-xs font-medium">Tools</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0 bg-[#0d1117] border-[#1e2329] text-white overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {data && (
                      <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Market Metrics</h3>
                        <div className="grid grid-cols-2 gap-2">
                           <div className="bg-[#1e2329] rounded-lg p-2">
                             <p className="text-[10px] text-gray-500">Heat Score</p>
                             <p className="text-sm font-bold text-[#02c076]">{data.metrics.heatScore}%</p>
                           </div>
                           <div className="bg-[#1e2329] rounded-lg p-2">
                             <p className="text-[10px] text-gray-500">Active Wallets</p>
                             <p className="text-sm font-bold">{formatNumber(data.metrics.activeWallets)}</p>
                           </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedNode ? (
                       <div className="space-y-4">
                         <div className="flex items-center gap-3 p-3 bg-[#1e2329] rounded-xl">
                            {selectedNode.logoUrl ? (
                              <img src={selectedNode.logoUrl} alt={selectedNode.label} className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: selectedNode.color }}>
                                {selectedNode.label.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold">{selectedNode.label}</p>
                              <p className="text-[10px] text-gray-500">Selected Token</p>
                            </div>
                         </div>
                         <TwitterFeed tokenSymbol={selectedNode.label} limit={3} />
                         <Link
                            href={`/trade/${selectedNode.id}`}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-[#02c076] text-black text-xs font-bold rounded-lg"
                          >
                            Trade {selectedNode.label}
                          </Link>
                       </div>
                    ) : (
                        <div className="space-y-4">
                          <TwitterFeed query="solana alpha" limit={5} title="Market Pulse" />
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#02c076]" />
              </div>
            ) : data ? (
              <FlowMap
                nodes={data.nodes}
                edges={data.edges}
                onNodeClick={handleNodeClick}
                isPlaying={isPlaying}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                No flow data available
              </div>
            )}
          </div>
        </div>

        <div className="w-80 border-l border-[#1e2329] flex flex-col overflow-hidden hidden lg:flex bg-[#0d1117]">
          {selectedNode ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#1e2329]">
                <div className="flex items-center gap-3">
                  {selectedNode.logoUrl ? (
                    <img 
                      src={selectedNode.logoUrl} 
                      alt={selectedNode.label}
                      className="w-10 h-10 rounded-full border-2 border-[#2b3139]"
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: selectedNode.color }}
                    >
                      {selectedNode.label.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedNode.label}</h3>
                    <p className="text-xs text-gray-500">{selectedNode.metadata?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1.5 hover:bg-[#1e2329] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedNode.metadata?.priceChange !== undefined && (
                  <div className="bg-[#1e2329] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedNode.metadata.priceChange >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-[#02c076]" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-[#f6465d]" />
                      )}
                      <span className={cn(
                        "text-2xl font-bold",
                        selectedNode.metadata.priceChange >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                      )}>
                        {selectedNode.metadata.priceChange >= 0 ? "+" : ""}
                        {selectedNode.metadata.priceChange.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">24h Price Change</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="bg-[#1e2329] rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 mb-1">24h Volume</p>
                    <span className="text-lg font-bold text-white">
                      ${formatNumber(selectedNode.volume || 0)}
                    </span>
                  </div>

                  {selectedNode.metadata?.marketCap > 0 && (
                    <div className="bg-[#1e2329] rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 mb-1">Market Cap</p>
                      <span className="text-lg font-bold text-white">
                        ${formatNumber(selectedNode.metadata.marketCap)}
                      </span>
                    </div>
                  )}

                  {selectedNode.metadata?.price > 0 && (
                    <div className="bg-[#1e2329] rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 mb-1">Price</p>
                      <span className="text-lg font-bold text-white">
                        ${selectedNode.metadata.price < 0.01 
                          ? selectedNode.metadata.price.toFixed(8) 
                          : selectedNode.metadata.price.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-[#1e2329] rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 mb-1">Contract Address</p>
                  <code className="text-xs text-gray-300 break-all font-mono">
                    {selectedNode.id}
                  </code>
                </div>

                <AIAnalysisWidget
                  type="token"
                  data={{
                    symbol: selectedNode.label,
                    name: selectedNode.metadata?.name || selectedNode.label,
                    price: selectedNode.metadata?.price || 0,
                    priceChange24h: selectedNode.metadata?.priceChange || 0,
                    volume24h: selectedNode.volume || 0,
                    marketCap: selectedNode.metadata?.marketCap || 0,
                  }}
                />

                <TwitterFeed
                  tokenSymbol={selectedNode.label}
                  limit={5}
                  title={`${selectedNode.label} Tweets`}
                />
              </div>

              <div className="p-4 border-t border-[#1e2329]">
                <Link
                  href={`/trade/${selectedNode.id}`}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#02c076] text-black text-sm font-bold rounded-lg hover:bg-[#02a566] transition-colors"
                >
                  Trade {selectedNode.label}
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {data && (
                <AIAnalysisWidget
                  type="market-pulse"
                  data={{
                    topGainers: data.metrics.topInflows.slice(0, 3).map((t) => ({
                      symbol: t.symbol,
                      change: Math.random() * 50,
                    })),
                    topLosers: data.metrics.topOutflows.slice(0, 3).map((t) => ({
                      symbol: t.symbol,
                      change: -Math.random() * 30,
                    })),
                    totalVolume: data.metrics.totalVolume24h,
                  }}
                />
              )}

              <TwitterFeed
                query="solana memecoin pump crypto alpha -is:retweet lang:en"
                limit={6}
                title="Crypto Twitter"
              />

              <div className="bg-[#0d1117] border border-[#1e2329] rounded-xl p-4">
                <h3 className="text-sm font-medium text-white mb-3">How to Use</h3>
                <div className="space-y-2 text-[10px] text-gray-400">
                  <p>• <span className="text-white">Click any token</span> to see details & trade</p>
                  <p>• <span className="text-white">Flowing particles</span> show trading activity</p>
                  <p>• <span className="text-white">Larger circles</span> = higher volume</p>
                  <p>• <span className="text-white">Drag & scroll</span> to navigate the map</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
