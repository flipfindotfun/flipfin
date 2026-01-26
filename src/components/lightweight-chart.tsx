"use client";

import { memo, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  Loader2, 
  Pencil, 
  Trash2, 
  Crosshair, 
  Minus, 
  ArrowUpRight, 
  MousePointer2,
  Settings2,
  Activity,
  Maximize2,
  Star,
  Share2,
  Copy,
  RefreshCw,
  Square,
  Triangle
} from "lucide-react";
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  UTCTimestamp,
  CandlestickData,
  SeriesMarker,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  PriceScaleMode,
  LineStyle,
  MouseEventParams
} from "lightweight-charts";
import { cn } from "@/lib/utils";

interface UserTrade {
  timestamp: number;
  price: number;
  type: "buy" | "sell";
  amount?: number;
}

interface LightweightChartProps {
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

type DrawingTool = 'none' | 'trendline' | 'hline' | 'ray' | 'rect';

export const LightweightChart = memo(function LightweightChart({
  symbol,
  tokenAddress,
  marketCap,
  currentPrice,
  userTrades = [],
}: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const preloadedDataRef = useRef<Map<string, { candles: CandlestickData[], volumes: any[], source: string, factor: number }>>(new Map());
  
  const [timeframe, setTimeframe] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pro_chart_timeframe") || "1m";
    }
    return "1m";
  });
  const [viewMode, setViewMode] = useState<"price" | "mc">("price");
  const [loading, setLoading] = useState(true);
  const [isChartReady, setIsChartReady] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [isLogScale, setIsLogScale] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const activeToolRef = useRef<DrawingTool>('none');

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  const totalSupply = useMemo(() => {
    if (marketCap && currentPrice && currentPrice > 0) {
      return marketCap / currentPrice;
    }
    return 0;
  }, [marketCap, currentPrice]);

  const trendlinesRef = useRef<ISeriesApi<"Line">[]>([]);
  const previewSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const drawingPointsRef = useRef<{ time: UTCTimestamp; value: number }[]>([]);

  const clearDrawings = useCallback(() => {
    trendlinesRef.current.forEach(line => {
      if (chartRef.current) chartRef.current.removeSeries(line);
    });
    trendlinesRef.current = [];
    drawingPointsRef.current = [];
    if (previewSeriesRef.current && chartRef.current) {
      chartRef.current.removeSeries(previewSeriesRef.current);
      previewSeriesRef.current = null;
    }
  }, []);

  // Initialize Chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b0e11" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0.2)" },
        horzLines: { color: "rgba(42, 46, 57, 0.2)" },
      },
      crosshair: {
        mode: 1, // Normal
        vertLine: { color: "#758696", style: 0 },
        horzLine: { color: "#758696", style: 0 },
      },
      timeScale: {
        borderColor: "rgba(197, 203, 206, 0.2)",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "rgba(197, 203, 206, 0.2)",
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
    });

    // Use v5 API: addSeries(CandlestickSeries, options)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00c076",
      downColor: "#ff3b69",
      borderVisible: false,
      wickUpColor: "#00c076",
      wickDownColor: "#ff3b69",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "", // overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle Resize
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    // Initial size
    handleResize();
    
    window.addEventListener("resize", handleResize);
    setIsChartReady(true);

    // Drawing Tool Handlers
    const onMouseDown = (param: MouseEventParams) => {
      const tool = activeToolRef.current;
      if (tool === 'none' || !param.time || !param.point) return;

      const price = seriesRef.current?.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;

      drawingPointsRef.current.push({ time: param.time as UTCTimestamp, value: price });

      if (tool === 'hline') {
        const line = chart.addSeries(LineSeries, {
          color: "#00c076",
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        // Infinite horizontal line - simplified as trendline for now or just set a flat series
        // For simplicity in this demo, we'll treat it as a two-point line
          line.setData([
            { time: candles[0].time, value: price },
            { time: candles[candles.length - 1].time, value: price }
          ]);

        trendlinesRef.current.push(line);
        drawingPointsRef.current = [];
      } else if (drawingPointsRef.current.length === 2) {
        const line = chart.addSeries(LineSeries, {
          color: "#00c076",
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        line.setData(drawingPointsRef.current);
        trendlinesRef.current.push(line);
        drawingPointsRef.current = [];
        if (previewSeriesRef.current) {
          chart.removeSeries(previewSeriesRef.current);
          previewSeriesRef.current = null;
        }
      }
    };

    const onMouseMove = (param: MouseEventParams) => {
      const tool = activeToolRef.current;
      if (tool === 'none' || drawingPointsRef.current.length === 0 || !param.time || !param.point) return;

      const price = seriesRef.current?.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;

      if (!previewSeriesRef.current) {
        previewSeriesRef.current = chart.addSeries(LineSeries, {
          color: "rgba(0, 192, 118, 0.5)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          lastValueVisible: false,
          priceLineVisible: false,
        });
      }

      previewSeriesRef.current.setData([
        drawingPointsRef.current[0],
        { time: param.time as UTCTimestamp, value: price }
      ]);
    };

    chart.subscribeClick(onMouseDown);
    chart.subscribeCrosshairMove(onMouseMove);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.unsubscribeClick(onMouseDown);
      chart.unsubscribeCrosshairMove(onMouseMove);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      previewSeriesRef.current = null;
    };
  }, []);

  // Update Scale Mode
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.priceScale("right").applyOptions({
      mode: isLogScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    });
  }, [isLogScale]);

  // Data Fetching
    const fetchData = useCallback(async (silent = false) => {
      if (!seriesRef.current || !tokenAddress) return;
      
      const cached = preloadedDataRef.current.get(timeframe);
      const factor = viewMode === "mc" && totalSupply > 0 ? totalSupply : 1;
      
      if (cached && cached.factor === factor && !silent) {
        if (seriesRef.current) {
          try {
            seriesRef.current.setData(cached.candles);
            if (volumeSeriesRef.current) volumeSeriesRef.current.setData(cached.volumes);
            setCandles(cached.candles);
            setDataSource(cached.source);
            setLoading(false);
            
            if (chartRef.current && !silent) {
              chartRef.current.timeScale().fitContent();
            }
            return; // Exit after setting cached data
          } catch (e) {
            console.warn("Cached data sync failed:", e);
          }
        }
      }

      if (!silent) setLoading(true);
      setDataError(null);
      try {
        const res = await fetch(`/api/ohlcv?address=${tokenAddress}&type=${timeframe}`);
        const data = await res.json();
        
        if (!seriesRef.current) return;

        if (data.error) {
          setDataError(data.error);
          return;
        }

        setDataSource(data.source);
        const currentFactor = viewMode === "mc" && totalSupply > 0 ? totalSupply : 1;
        
        const candles: CandlestickData[] = [];
        const volumes: any[] = [];

        if (data.items && Array.isArray(data.items)) {
          data.items.forEach((item: any) => {
            const time = (item.unixTime) as UTCTimestamp;
            const o = item.o * currentFactor;
            const h = item.h * currentFactor;
            const l = item.l * currentFactor;
            const c = item.c * currentFactor;
            
            if (!isNaN(o) && !isNaN(c)) {
              candles.push({ time, open: o, high: h, low: l, close: c });
              volumes.push({
                time,
                value: item.v || 0,
                color: c >= o ? "rgba(0, 192, 118, 0.4)" : "rgba(255, 59, 105, 0.4)",
              });
            }
          });
        }

          if (candles.length > 0) {
            candles.sort((a, b) => (a.time as number) - (b.time as number));
            volumes.sort((a, b) => (a.time as number) - (b.time as number));
            setCandles(candles);


          // Update cache
          preloadedDataRef.current.set(timeframe, { 
            candles, 
            volumes, 
            source: data.source, 
            factor: currentFactor 
          });

            if (seriesRef.current) {
              seriesRef.current.setData(candles);
              const lastPrice = candles[candles.length - 1].close;
              let precision = 4, minMove = 0.0001;
              if (lastPrice < 0.0000001) { precision = 12; minMove = 0.000000000001; }
              else if (lastPrice < 0.00001) { precision = 10; minMove = 0.0000000001; }
              else if (lastPrice < 0.001) { precision = 8; minMove = 0.00000001; }
              else if (lastPrice < 1) { precision = 6; minMove = 0.000001; }

              seriesRef.current.applyOptions({
                priceFormat: { type: 'price', precision, minMove },
              });
            }
          if (volumeSeriesRef.current) volumeSeriesRef.current.setData(volumes);
          
          if (chartRef.current && !silent) {
            chartRef.current.timeScale().fitContent();
            if (candles.length > 80) {
              chartRef.current.timeScale().setVisibleLogicalRange({
                from: candles.length - 80,
                to: candles.length + 4,
              });
            }
          }
        }
      } catch (err) {
        setDataError("Sync Error");
      } finally {
        setLoading(false);
      }
    }, [tokenAddress, timeframe, viewMode, totalSupply]);

      // Clear cache when token changes
      useEffect(() => {
        preloadedDataRef.current.clear();
        setCandles([]);
        if (seriesRef.current) seriesRef.current.setData([]);
        if (volumeSeriesRef.current) volumeSeriesRef.current.setData([]);
      }, [tokenAddress]);

      // Lazy load timeframes and poll active
      useEffect(() => {
        if (!isChartReady) return;
        fetchData();
        const interval = setInterval(() => fetchData(true), 20000);
        return () => clearInterval(interval);
      }, [isChartReady, fetchData]);


    // Update Markers - CIRCLE B/S STYLE
    useEffect(() => {
      if (!seriesRef.current || candles.length === 0) return;

      try {
        const markers: SeriesMarker<UTCTimestamp>[] = userTrades
          .filter(trade => trade.timestamp > 0)
          .map((trade) => {
            const tradeTime = Math.floor(trade.timestamp / 1000);
            let closestIdx = 0;
            let low = 0, high = candles.length - 1;
            
            while (low <= high) {
              const mid = Math.floor((low + high) / 2);
              if ((candles[mid].time as number) <= tradeTime) {
                closestIdx = mid;
                low = mid + 1;
              } else high = mid - 1;
            }
            
            const time = candles[closestIdx].time as UTCTimestamp;
            return {
              time,
              position: trade.type === 'buy' ? 'belowBar' : 'aboveBar',
              color: trade.type === 'buy' ? "#00c076" : "#ff3b69",
              shape: 'circle',
              text: trade.type === 'buy' ? 'B' : 'S',
              size: 1.5,
            };
          });

        if (seriesRef.current) {
          seriesRef.current.setMarkers(markers);
        }
      } catch (e) {
        console.warn("Failed to set markers:", e);
      }
    }, [userTrades, candles]);


  return (
    <div className="flex w-full h-full bg-[#0b0e11] overflow-hidden font-sans border border-white/5 relative">
      {/* Left Sidebar Toolbar - Pro Style */}
      <div className="w-11 border-r border-white/5 bg-[#0b0e11] flex flex-col items-center py-4 gap-4 z-20">
        <button
          onClick={() => setActiveTool('none')}
          className={cn(
            "p-2 rounded-lg transition-all",
            activeTool === 'none' ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
          )}
        >
          <MousePointer2 size={16} />
        </button>
        <div className="w-5 h-[1px] bg-white/10" />
        <button
          onClick={() => setActiveTool('trendline')}
          className={cn(
            "p-2 rounded-lg transition-all",
            activeTool === 'trendline' ? "bg-[#00c076]/20 text-[#00c076]" : "text-gray-500 hover:text-gray-300"
          )}
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => setActiveTool('hline')}
          className={cn(
            "p-2 rounded-lg transition-all",
            activeTool === 'hline' ? "bg-[#00c076]/20 text-[#00c076]" : "text-gray-500 hover:text-gray-300"
          )}
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => setActiveTool('ray')}
          className={cn(
            "p-2 rounded-lg transition-all",
            activeTool === 'ray' ? "bg-[#00c076]/20 text-[#00c076]" : "text-gray-500 hover:text-gray-300"
          )}
        >
          <ArrowUpRight size={16} />
        </button>
        <button
          onClick={() => setActiveTool('rect')}
          className={cn(
            "p-2 rounded-lg transition-all",
            activeTool === 'rect' ? "bg-[#00c076]/20 text-[#00c076]" : "text-gray-500 hover:text-gray-300"
          )}
        >
          <Square size={16} />
        </button>
        <div className="mt-auto flex flex-col gap-4">
          <button
            onClick={clearDrawings}
            className="p-2 rounded-lg text-gray-600 hover:text-red-400 transition-all"
          >
            <Trash2 size={16} />
          </button>
          <button className="p-2 rounded-lg text-gray-600 hover:text-white transition-all">
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Pro Style */}
        <div className="flex items-center justify-between px-3 h-10 border-b border-white/5 bg-[#0b0e11]">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 mr-2 pr-2 border-r border-white/10">
              <span className="text-white font-bold text-xs uppercase whitespace-nowrap">{symbol}</span>
              <span className="text-[10px] text-gray-500 font-mono hidden sm:block">USDT</span>
            </div>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => { setTimeframe(tf.value); localStorage.setItem("pro_chart_timeframe", tf.value); }}
                className={cn(
                  "px-2 py-1 text-[11px] font-bold transition-all rounded",
                  timeframe === tf.value ? "text-[#00c076] bg-white/5" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white/5 rounded p-0.5">
              <button
                onClick={() => setIsLogScale(!isLogScale)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded",
                  isLogScale ? "bg-white/10 text-white" : "text-gray-500"
                )}
              >
                LOG
              </button>
            </div>
            <div className="flex bg-white/5 rounded p-0.5">
              <button
                onClick={() => setViewMode("price")}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded",
                  viewMode === "price" ? "bg-white/10 text-white" : "text-gray-500"
                )}
              >
                Price
              </button>
              <button
                onClick={() => setViewMode("mc")}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded",
                  viewMode === "mc" ? "bg-white/10 text-white" : "text-gray-500"
                )}
              >
                MC
              </button>
            </div>
            {dataSource && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#00c076]/5 rounded border border-[#00c076]/10">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00c076] animate-pulse" />
                <span className="text-[9px] font-bold text-[#00c076] tracking-tight uppercase">{dataSource}</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative flex-1 group">
          {/* Price Float Overlay */}
          <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
            <div className="flex items-baseline gap-2">
              <span className="text-white text-2xl font-bold font-mono tracking-tighter tabular-nums">
                ${currentPrice?.toLocaleString(undefined, { maximumFractionDigits: 10, minimumFractionDigits: 8 })}
              </span>
              {marketCap && (
                <span className="text-[#00c076] text-xs font-bold">
                  MC: ${marketCap > 1000000 ? `${(marketCap / 1000000).toFixed(2)}M` : marketCap > 1000 ? `${(marketCap / 1000).toFixed(1)}K` : marketCap.toFixed(0)}
                </span>
              )}
            </div>
          </div>

          <div ref={containerRef} className="w-full h-full" />
          
            {(!loading && candles.length === 0 && !dataError) && (

            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0e11] z-30 px-6 text-center">
              <Activity className="w-8 h-8 text-gray-700 mb-3" />
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">No market data available yet</p>
              <p className="text-gray-600 text-[9px] mt-1 italic">This token might be too new or have low liquidity</p>
            </div>
          )}

          {dataError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0e11]/80 backdrop-blur-sm z-30 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Settings2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-white font-bold text-sm mb-2">Failed to load chart data</h3>
              <p className="text-gray-400 text-[10px] max-w-[200px] mb-4">{dataError}</p>
              <button 
                onClick={() => fetchData()}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded transition-colors flex items-center gap-2"
              >
                <RefreshCw size={12} />
                Try Again
              </button>
            </div>
          )}
          
          {activeTool !== 'none' && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-[#00c076] text-black text-[10px] font-black rounded-sm shadow-2xl flex items-center gap-2 uppercase tracking-tighter">
              <Crosshair size={12} strokeWidth={3} />
              <span>{activeTool} Mode Active</span>
            </div>
          )}

          {loading && (
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded border border-white/5">
              <Loader2 className="w-3 h-3 animate-spin text-[#00c076]" />
              <span className="text-[9px] text-gray-400 font-bold tracking-widest">LIVE DATA</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
