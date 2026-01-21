"use client";

import { Activity, Zap, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle } from "lucide-react";
import { useApp } from "@/lib/context";
import { formatPrice, shortenAddress, timeAgo } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ActivityFeed() {
  const { trades } = useApp();

  const mockActivity = [
    {
      id: "1",
      type: "buy" as const,
      tokenSymbol: "BONK",
      tokenAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      amountIn: 0.5,
      amountOut: 21312312,
      price: 0.0000234,
      timestamp: Date.now() - 60000 * 2,
      signature: "5xGZ...4kHj",
      status: "confirmed" as const,
    },
    {
      id: "2",
      type: "sell" as const,
      tokenSymbol: "WIF",
      tokenAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
      amountIn: 100,
      amountOut: 0.89,
      price: 2.45,
      timestamp: Date.now() - 60000 * 15,
      signature: "8hYK...9mNp",
      status: "confirmed" as const,
    },
    {
      id: "3",
      type: "buy" as const,
      tokenSymbol: "POPCAT",
      tokenAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
      amountIn: 1,
      amountOut: 1123,
      price: 0.89,
      timestamp: Date.now() - 60000 * 45,
      signature: "2jKL...7qRs",
      status: "confirmed" as const,
    },
  ];

  const allActivity = [...trades, ...mockActivity].slice(0, 10);

  if (allActivity.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#262626]">
          <Activity className="w-5 h-5 text-[#00d991]" />
          <h2 className="font-semibold">Activity</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#262626]">
        <Activity className="w-5 h-5 text-[#00d991]" />
        <h2 className="font-semibold">Activity</h2>
        <Badge variant="secondary" className="bg-[#1a1a1a] border-0 text-xs">
          {allActivity.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-[#1a1a1a]">
          {allActivity.map((trade) => (
            <div
              key={trade.id}
              className="px-4 py-3 hover:bg-[#111] transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      trade.type === "buy"
                        ? "bg-[#00d991]/20"
                        : "bg-red-500/20"
                    )}
                  >
                    {trade.type === "buy" ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#00d991]" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-semibold text-sm",
                      trade.type === "buy" ? "text-[#00d991]" : "text-red-500"
                    )}
                  >
                    {trade.type === "buy" ? "Buy" : "Sell"}
                  </span>
                  <span className="font-medium">{trade.tokenSymbol}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {trade.status === "confirmed" ? (
                    <CheckCircle className="w-3 h-3 text-[#00d991]" />
                  ) : trade.status === "failed" ? (
                    <XCircle className="w-3 h-3 text-red-500" />
                  ) : (
                    <Clock className="w-3 h-3 text-yellow-500 animate-pulse" />
                  )}
                  <span>{timeAgo(trade.timestamp)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-400">
                  {trade.type === "buy" ? (
                    <span>
                      {trade.amountIn.toFixed(2)} SOL →{" "}
                      {trade.amountOut.toLocaleString()} {trade.tokenSymbol}
                    </span>
                  ) : (
                    <span>
                      {trade.amountIn.toLocaleString()} {trade.tokenSymbol} →{" "}
                      {trade.amountOut.toFixed(2)} SOL
                    </span>
                  )}
                </div>
                <a
                  href={`https://solscan.io/tx/${trade.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 font-mono hover:text-[#00d991]"
                >
                  {trade.signature}
                </a>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
