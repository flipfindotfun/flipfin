"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { createChart } from "@devexperts/dxcharts-lite";
import { cn } from "@/lib/utils";

interface UserTrade {
  timestamp: number;
  price: number;
  type: "buy" | "sell";
  amount?: number;
}

interface DxChartProps {
  symbol: string;
  tokenAddress: string;
  marketCap?: number;
  currentPrice?: number;
  userTrades?: UserTrade[];
}

const TIMEFRAMES = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
];

// Wide range of increments to support high-precision memecoins
const PRICE_INCREMENTS = [
  0.000000000001, 0.00000000001, 0.0000000001, 0.000000001, 
  0.00000001, 0.0000001, 0.000001, 0.00001, 0.0001, 0.001, 
  0.01, 0.1, 1, 10, 100, 1000
];

export const DxChart = memo(function DxChart({
  symbol,
  tokenAddress,
  marketCap,
  currentPrice,
  userTrades = [],
}: DxChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [timeframe, setTimeframe] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pro_chart_timeframe") || "1m";
    }
    return "1m";
  });
  const [viewMode, setViewMode] = useState<"price" | "mc">("price");
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);

  const totalSupply = marketCap && currentPrice ? marketCap / currentPrice : 0;

  // Initialize chart only once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      backgroundColor: "#0b0e11",
      textColor: "#76808f",
      gridColor: "#1e2329",
      components: {
        chart: {
          type: "candle",
          showWicks: true,
        },
        xAxis: {
          visible: true,
        },
        yAxis: {
          visible: true,
          type: "regular",
        },
        legend: {
          visible: true,
        },
        crosshair: {
          visible: true,
        },
        drawings: {
          visible: true,
        }
      }
    });

    chartRef.current = chart;

    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.dispose();
        } catch (e) {
          // ignore
        }
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      chartRef.current = null;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!chartRef.current || !tokenAddress) return;
    
    setLoading(true);
    setDataError(null);
    try {
      const res = await fetch(`/api/ohlcv?address=${tokenAddress}&type=${timeframe}`);
      const data = await res.json();
      
      if (data.error) {
        setDataError(data.error);
        return;
      }

      setDataSource(data.source);
      
      const factor = viewMode === "mc" && totalSupply ? totalSupply : 1;
      const candles = data.items.map((item: any) => ({
        time: item.unixTime * 1000,
        open: item.o * factor,
        high: item.h * factor,
        low: item.l * factor,
        close: item.c * factor,
        volume: item.v,
      })).sort((a: any, b: any) => a.time - b.time);

      if (chartRef.current) {
        // Apply data with precision increments
        chartRef.current.setData({ 
          candles,
          instrument: {
            symbol: viewMode === "mc" ? `${symbol} (MC)` : symbol,
            priceIncrements: PRICE_INCREMENTS
          }
        });
        
        // Update markers (Buy/Sell)
        if (userTrades.length > 0) {
          try {
            const eventsComponent = chartRef.current.getComponent("EventsComponent");
            if (eventsComponent) {
              const events = userTrades.map((trade) => ({
                time: trade.timestamp,
                title: trade.type === "buy" ? "B" : "S",
                body: `${trade.type.toUpperCase()} @ ${trade.price.toFixed(10)}`,
                color: trade.type === "buy" ? "#02c076" : "#f84960",
              }));
              eventsComponent.setEvents(events);
            }
          } catch (e) {
            // Silently fail if component not available
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch OHLCV data:", err);
      setDataError("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, timeframe, viewMode, totalSupply, symbol, userTrades]);

  // Handle updates when dependencies change, without re-initializing the chart
  useEffect(() => {
    fetchData();
  }, [timeframe, viewMode, tokenAddress, fetchData]);

  // Handle markers update when userTrades change
  useEffect(() => {
    if (chartRef.current && userTrades.length > 0) {
      try {
        const eventsComponent = chartRef.current.getComponent("EventsComponent");
        if (eventsComponent) {
          const events = userTrades.map((trade) => ({
            time: trade.timestamp,
            title: trade.type === "buy" ? "B" : "S",
            body: `${trade.type.toUpperCase()} @ ${trade.price.toFixed(10)}`,
            color: trade.type === "buy" ? "#02c076" : "#f84960",
          }));
          eventsComponent.setEvents(events);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [userTrades]);

  return (
    <div className="flex flex-col w-full h-full bg-[#0b0e11] overflow-hidden font-sans">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e2329] bg-[#0d1117]">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => {
                  setTimeframe(tf.value);
                  localStorage.setItem("pro_chart_timeframe", tf.value);
                }}
                className={cn(

                "px-2 py-1 text-[10px] font-bold rounded transition-colors whitespace-nowrap",
                timeframe === tf.value
                  ? "bg-[#1e2329] text-[#02c076]"
                  : "text-gray-500 hover:text-white"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {dataSource && (
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded font-mono uppercase",
              dataSource === "birdeye" ? "bg-[#02c076]/10 text-[#02c076]" : "bg-yellow-500/10 text-yellow-500"
            )}>
              {dataSource === "birdeye" ? "Real-time" : "Estimated"}
            </span>
          )}
          <div className="flex bg-[#1e2329] rounded p-0.5">
            <button
              onClick={() => setViewMode("price")}
              className={cn(
                "px-2 py-0.5 text-[9px] font-bold rounded transition-all",
                viewMode === "price" ? "bg-[#0b0e11] text-white" : "text-gray-500"
              )}
            >
              Price
            </button>
            <button
              onClick={() => setViewMode("mc")}
              className={cn(
                "px-2 py-0.5 text-[9px] font-bold rounded transition-all",
                viewMode === "mc" ? "bg-[#0b0e11] text-white" : "text-gray-500"
              )}
            >
              MC
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex-1">
        <div ref={containerRef} className="w-full h-full" />
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e11]/50 backdrop-blur-[1px] z-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#02c076]" />
          </div>
        )}

        {dataError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0e11] z-30 px-6 text-center">
            <p className="text-gray-400 text-xs mb-3">{dataError}</p>
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-[#1e2329] hover:bg-[#2b3139] text-white text-xs font-bold rounded"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
