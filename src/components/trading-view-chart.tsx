"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Loader2, RefreshCw, Crosshair, Minus, TrendingUp, TrendingDown, MousePointer, Type, Pencil, Circle, Square, ChevronRight } from "lucide-react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";

interface Trade {
  timestamp: number;
  price: number;
  type: "buy" | "sell";
  amount?: number;
}

interface TradingViewChartProps {
  symbol: string;
  tokenAddress: string;
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  userTrades?: Trade[];
}

type CandleData = CandlestickData<Time>;

const TIMEFRAMES = [
  { label: "1s", value: "1s" },
  { label: "30s", value: "30s" },
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "1D", value: "1d" },
];

const DRAWING_TOOLS = [
  { icon: MousePointer, label: "Select", id: "select" },
  { icon: Crosshair, label: "Crosshair", id: "crosshair" },
  { icon: Minus, label: "Horizontal Line", id: "hline" },
  { icon: TrendingUp, label: "Trend Line", id: "trend" },
  { icon: TrendingDown, label: "Ray", id: "ray" },
  { icon: ChevronRight, label: "Extended Line", id: "extended" },
  { icon: Type, label: "Text", id: "text" },
  { icon: Circle, label: "Circle", id: "circle" },
  { icon: Square, label: "Rectangle", id: "rect" },
  { icon: Pencil, label: "Freehand", id: "freehand" },
];

function formatChartPrice(price: number): string {
  if (price === 0) return "0";
  if (price < 0.0000001) return price.toExponential(2);
  if (price < 0.00001) return price.toFixed(10);
  if (price < 0.001) return price.toFixed(8);
  if (price < 1) return price.toFixed(6);
  if (price < 100) return price.toFixed(4);
  return price.toFixed(2);
}

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}

function calculateEMA(data: { time: Time; close: number }[], period: number): { time: Time; value: number }[] {
  const k = 2 / (period + 1);
  const emaData: { time: Time; value: number }[] = [];
  let ema = data[0]?.close || 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema = data[i].close;
    } else {
      ema = data[i].close * k + ema * (1 - k);
    }
    emaData.push({ time: data[i].time, value: ema });
  }

  return emaData;
}

export const TradingViewChart = memo(function TradingViewChart({
  symbol,
  tokenAddress,
  timeframe = "1m",
  onTimeframeChange,
  userTrades = [],
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const buyMarkersRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sellMarkersRef = useRef<ISeriesApi<"Line"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dataLoadedRef = useRef(false);
  const candlesRef = useRef<CandleData[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [error, setError] = useState<string | null>(null);
  const [ohlcData, setOhlcData] = useState<{ o: number; h: number; l: number; c: number; change: number; volume: number } | null>(null);
  const [showEMA, setShowEMA] = useState(false);
  const [displayMode, setDisplayMode] = useState<"price" | "mc">("price");
  const [currencyMode, setCurrencyMode] = useState<"usd" | "sol">("usd");
  const [activeTool, setActiveTool] = useState("crosshair");
  const [hoverData, setHoverData] = useState<{ o: number; h: number; l: number; c: number; time: string } | null>(null);

  const fetchOHLCV = useCallback(async (isInitial = false) => {
    try {
      setError(null);
      if (isInitial) setLoading(true);
      
      const res = await fetch(
        `/api/ohlcv?address=${tokenAddress}&type=${selectedTimeframe}`
      );
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        const candles: CandleData[] = data.items
          .map((item: any) => ({
            time: item.unixTime as Time,
            open: item.o,
            high: item.h,
            low: item.l,
            close: item.c,
          }))
          .sort((a: CandleData, b: CandleData) => (a.time as number) - (b.time as number));

        candlesRef.current = candles;

        const volumeData = data.items
          .map((item: any) => ({
            time: item.unixTime as Time,
            value: item.v || 0,
            color: item.c >= item.o ? "rgba(2, 192, 118, 0.5)" : "rgba(246, 70, 93, 0.5)",
          }))
          .sort((a: any, b: any) => (a.time as number) - (b.time as number));

        if (seriesRef.current) {
          seriesRef.current.setData(candles);
          
          if (userTrades && userTrades.length > 0) {
            const markers = userTrades.map(trade => ({
              time: Math.floor(trade.timestamp / 1000) as Time,
              position: trade.type === "buy" ? "belowBar" as const : "aboveBar" as const,
              color: trade.type === "buy" ? "#02c076" : "#f6465d",
              shape: trade.type === "buy" ? "arrowUp" as const : "arrowDown" as const,
              text: trade.type === "buy" ? "B" : "S",
            }));
            seriesRef.current.setMarkers(markers);
          }
        }

        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(volumeData);
        }

        if (showEMA && candles.length >= 21) {
          const closeData = candles.map(c => ({ time: c.time, close: c.close }));
          const ema9Data = calculateEMA(closeData, 9);
          const ema21Data = calculateEMA(closeData, 21);

          if (ema9SeriesRef.current) {
            ema9SeriesRef.current.setData(ema9Data);
          }
          if (ema21SeriesRef.current) {
            ema21SeriesRef.current.setData(ema21Data);
          }
        }
        
        if (isInitial) {
          chartRef.current?.timeScale().fitContent();
        }
        
        const lastCandle = candles[candles.length - 1];
        const firstCandle = candles[0];
        const totalVolume = data.items.reduce((sum: number, item: any) => sum + (item.v || 0), 0);
        
        if (lastCandle && firstCandle) {
          const change = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;
          setOhlcData({
            o: lastCandle.open,
            h: lastCandle.high,
            l: lastCandle.low,
            c: lastCandle.close,
            change,
            volume: totalVolume,
          });
        }
        
        dataLoadedRef.current = true;
      } else {
        setError("No chart data available");
      }
    } catch (err) {
      console.error("OHLCV fetch error:", err);
      setError("Failed to load chart");
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, selectedTimeframe, showEMA, userTrades]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    dataLoadedRef.current = false;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      ema9SeriesRef.current = null;
      ema21SeriesRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#0b0e11" },
        textColor: "#848e9c",
      },
      grid: {
        vertLines: { color: "#1e2329" },
        horzLines: { color: "#1e2329" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#363c4e",
          width: 1,
          style: 3,
          labelBackgroundColor: "#1e2329",
        },
        horzLine: {
          color: "#363c4e",
          width: 1,
          style: 3,
          labelBackgroundColor: "#1e2329",
        },
      },
      rightPriceScale: {
        borderColor: "#1e2329",
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "#1e2329",
        timeVisible: true,
        secondsVisible: selectedTimeframe === "1s" || selectedTimeframe === "30s",
      },
    });

    chart.subscribeCrosshairMove((param) => {
      if (param.time && candlesRef.current.length > 0) {
        const candle = candlesRef.current.find(c => c.time === param.time);
        if (candle) {
          const date = new Date((candle.time as number) * 1000);
          setHoverData({
            o: candle.open,
            h: candle.high,
            l: candle.low,
            c: candle.close,
            time: date.toLocaleTimeString(),
          });
        }
      } else {
        setHoverData(null);
      }
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#02c076",
      downColor: "#f6465d",
      borderVisible: false,
      wickUpColor: "#02c076",
      wickDownColor: "#f6465d",
    });

    let ema9Series: ISeriesApi<"Line"> | null = null;
    let ema21Series: ISeriesApi<"Line"> | null = null;

    if (showEMA) {
      ema9Series = chart.addSeries(LineSeries, {
        color: "#f7931a",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      ema21Series = chart.addSeries(LineSeries, {
        color: "#627eea",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
    }

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    ema9SeriesRef.current = ema9Series;
    ema21SeriesRef.current = ema21Series;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      if (entries[0] && chartRef.current) {
        const { width, height } = entries[0].contentRect;
        chartRef.current.applyOptions({ width, height });
      }
    });
    resizeObserverRef.current.observe(chartContainerRef.current);

    fetchOHLCV(true);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        volumeSeriesRef.current = null;
        ema9SeriesRef.current = null;
        ema21SeriesRef.current = null;
      }
    };
  }, [tokenAddress, selectedTimeframe, showEMA]);

  useEffect(() => {
    if (seriesRef.current && userTrades && userTrades.length > 0 && candlesRef.current.length > 0) {
      const markers = userTrades.map(trade => ({
        time: Math.floor(trade.timestamp / 1000) as Time,
        position: trade.type === "buy" ? "belowBar" as const : "aboveBar" as const,
        color: trade.type === "buy" ? "#02c076" : "#f6465d",
        shape: trade.type === "buy" ? "arrowUp" as const : "arrowDown" as const,
        text: trade.type === "buy" ? "B" : "S",
      }));
      seriesRef.current.setMarkers(markers);
    }
  }, [userTrades]);

  const handleTimeframeChange = (tf: string) => {
    setSelectedTimeframe(tf);
    setLoading(true);
    dataLoadedRef.current = false;
    onTimeframeChange?.(tf);
  };

  const handleRefresh = () => {
    fetchOHLCV(false);
  };

  const displayData = hoverData || ohlcData;
  const priceChange = displayData ? ((displayData.c - displayData.o) / displayData.o) * 100 : 0;

  return (
    <div className="relative w-full h-full min-h-[300px] bg-[#0b0e11] flex">
      <div className="w-7 flex flex-col items-center py-1 border-r border-[#1e2329] bg-[#0b0e11]">
        {DRAWING_TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`p-1 rounded mb-0.5 transition-all ${
              activeTool === tool.id
                ? "bg-[#1e2329] text-white"
                : "text-gray-500 hover:text-white hover:bg-[#1e2329]/50"
            }`}
            title={tool.label}
          >
            <tool.icon className="w-3 h-3" />
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-2 py-1 border-b border-[#1e2329]">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => handleTimeframeChange(tf.value)}
                  className={`px-1.5 py-0.5 text-[10px] font-medium transition-all ${
                    selectedTimeframe === tf.value
                      ? "text-white bg-[#1e2329] rounded"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            
            <div className="h-3 w-px bg-[#1e2329]" />
            
            <button
              onClick={() => setDisplayMode(displayMode === "price" ? "mc" : "price")}
              className="flex items-center text-[10px] px-1.5 py-0.5 bg-[#1e2329] rounded"
            >
              <span className={displayMode === "price" ? "text-white" : "text-gray-500"}>Price</span>
              <span className="text-gray-500 mx-0.5">/</span>
              <span className={displayMode === "mc" ? "text-white" : "text-gray-500"}>MC</span>
            </button>

            <div className="h-3 w-px bg-[#1e2329]" />
            
            <button
              onClick={() => setCurrencyMode(currencyMode === "usd" ? "sol" : "usd")}
              className="flex items-center text-[10px] px-1.5 py-0.5 bg-[#1e2329] rounded"
            >
              <span className={currencyMode === "usd" ? "text-white" : "text-gray-500"}>USD</span>
              <span className="text-gray-500 mx-0.5">/</span>
              <span className={currencyMode === "sol" ? "text-white" : "text-gray-500"}>SOL</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${
                showEMA 
                  ? "bg-[#1e2329] text-white" 
                  : "text-gray-500 hover:text-white"
              }`}
              title="Toggle EMA 9/21"
            >
              fx
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-1 text-gray-500 hover:text-white disabled:opacity-50"
              title="Refresh chart"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 py-1 border-b border-[#1e2329] text-[10px] bg-[#0b0e11]">
          <span className="text-gray-400 font-medium">{symbol} · {selectedTimeframe.toUpperCase()} · GMGN</span>
          
          {displayData ? (
            <>
              <span className="text-gray-500 ml-2">O</span>
              <span className="text-white">{formatChartPrice(displayData.o)}</span>
              
              <span className="text-gray-500 ml-1">H</span>
              <span className="text-[#02c076]">{formatChartPrice(displayData.h)}</span>
              
              <span className="text-gray-500 ml-1">L</span>
              <span className="text-[#f6465d]">{formatChartPrice(displayData.l)}</span>
              
              <span className="text-gray-500 ml-1">C</span>
              <span className="text-white">{formatChartPrice(displayData.c)}</span>
              
              <span className={`ml-2 ${priceChange >= 0 ? "text-[#02c076]" : "text-[#f6465d]"}`}>
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
              </span>
            </>
          ) : (
            <span className="text-gray-500 ml-2">Loading...</span>
          )}
          
          {showEMA && (
            <span className="ml-2 text-gray-500">
              <span className="text-[#f7931a]">EMA9</span>
              {" "}
              <span className="text-[#627eea]">EMA21</span>
            </span>
          )}
        </div>

        <div ref={chartContainerRef} className="flex-1 w-full relative">
          <div className="absolute bottom-2 left-2 z-10">
            <svg width="30" height="16" viewBox="0 0 30 16">
              <text x="0" y="12" fill="#5d6673" fontSize="12" fontWeight="bold">TV</text>
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 py-1 border-t border-[#1e2329] text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Volume</span>
            <span className="text-[#02c076]">{ohlcData ? formatNumber(ohlcData.volume) : "0"}</span>
          </div>
          <div className="flex items-center gap-3">
            {["1d", "7d", "30d", "180d"].map((range) => (
              <button
                key={range}
                className="text-gray-500 hover:text-white"
              >
                {range}
              </button>
            ))}
            <span className="text-gray-500">UTC+8</span>
            <span className="text-gray-500">%</span>
            <span className="text-gray-500">log</span>
            <span className="text-gray-500">auto</span>
          </div>
        </div>

        {loading && !dataLoadedRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e11]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#02c076]" />
              <span className="text-xs text-gray-500">Loading chart...</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e11]/90">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-red-400">{error}</span>
              <button
                onClick={handleRefresh}
                className="px-3 py-1 text-xs bg-[#1e2329] text-white rounded hover:bg-[#2b3139]"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
