"use client";

import { Flame, Users, RefreshCw, DollarSign, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber } from "@/lib/types";
import Link from "next/link";

interface FlowMetricsProps {
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

export function FlowMetrics({ metrics }: FlowMetricsProps) {
  const getHeatColor = (score: number) => {
    if (score >= 80) return "text-red-500";
    if (score >= 60) return "text-orange-500";
    if (score >= 40) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="px-4 py-3 border-b border-[#1e2329] bg-[#0d1117]">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#1e2329] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Flame className={`w-4 h-4 ${getHeatColor(metrics.heatScore)}`} />
            <span className="text-xs text-gray-500">Heat Score</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${getHeatColor(metrics.heatScore)}`}>
              {metrics.heatScore}
            </span>
            <div className="flex-1 h-1.5 bg-[#2b3139] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  metrics.heatScore >= 80
                    ? "bg-red-500"
                    : metrics.heatScore >= 60
                    ? "bg-orange-500"
                    : metrics.heatScore >= 40
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${metrics.heatScore}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Market intensity</p>
        </div>

        <div className="bg-[#1e2329] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-500">Top 10 Share</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white">{metrics.whaleDensity}%</span>
            <span className="text-xs text-gray-500">of vol</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Volume concentration</p>
        </div>

        <div className="bg-[#1e2329] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-500">Rotation</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white">{metrics.rotationSpeed}x</span>
            <span className="text-xs text-gray-500">/hr</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Capital turnover</p>
        </div>

        <div className="bg-[#1e2329] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-[#02c076]" />
            <span className="text-xs text-gray-500">24h Volume</span>
          </div>
          <span className="text-xl font-bold text-white">${formatNumber(metrics.totalVolume24h)}</span>
          <p className="text-[10px] text-gray-500 mt-1">Total tracked</p>
        </div>

        <div className="bg-[#1e2329] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-500">Tokens</span>
          </div>
          <span className="text-xl font-bold text-white">{metrics.topInflows.length + metrics.topOutflows.length}</span>
          <p className="text-[10px] text-gray-500 mt-1">Active on map</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3">
        <div className="bg-[#1e2329] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#02c076]" />
            <span className="text-xs font-medium text-white">Top Gainers</span>
          </div>
          <div className="space-y-2">
            {metrics.topInflows.slice(0, 3).map((item, i) => (
              <Link 
                key={item.token} 
                href={`/trade/${item.token}`}
                className="flex items-center justify-between text-xs hover:bg-[#2b3139] rounded p-1 -mx-1 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-3">{i + 1}.</span>
                  {item.logoUrl && (
                    <img 
                      src={item.logoUrl} 
                      alt={item.symbol}
                      className="w-5 h-5 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="font-medium text-white">{item.symbol}</span>
                </div>
                <span className="text-[#02c076] font-medium">${formatNumber(item.amount)}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-[#1e2329] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-[#f6465d]" />
            <span className="text-xs font-medium text-white">Top Losers</span>
          </div>
          <div className="space-y-2">
            {metrics.topOutflows.slice(0, 3).map((item, i) => (
              <Link 
                key={item.token} 
                href={`/trade/${item.token}`}
                className="flex items-center justify-between text-xs hover:bg-[#2b3139] rounded p-1 -mx-1 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-3">{i + 1}.</span>
                  {item.logoUrl && (
                    <img 
                      src={item.logoUrl} 
                      alt={item.symbol}
                      className="w-5 h-5 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="font-medium text-white">{item.symbol}</span>
                </div>
                <span className="text-[#f6465d] font-medium">${formatNumber(item.amount)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
