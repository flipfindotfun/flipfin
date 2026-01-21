"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createDatafeed } from "@/lib/tradingview-datafeed";

declare global {
  interface Window {
    TradingView: any;
    tvWidget: any;
  }
}

interface Trade {
  timestamp: number;
  price: number;
  type: "buy" | "sell";
  amount?: number;
}

interface TVChartContainerProps {
  symbol: string;
  tokenAddress: string;
  tokenName?: string;
  tokenDecimals?: number;
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  userTrades?: Trade[];
}

const resolutionMap: Record<string, string> = {
  "1s": "1S",
  "30s": "30S",
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "4h": "240",
  "1d": "1D",
  "1w": "1W",
};

export const TVChartContainer = memo(function TVChartContainer({
  symbol,
  tokenAddress,
  tokenName,
  tokenDecimals = 9,
  timeframe = "15m",
  onTimeframeChange,
  userTrades = [],
}: TVChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);

  useEffect(() => {
    const checkLibrary = () => {
      if (typeof window !== "undefined" && window.TradingView) {
        setLibraryReady(true);
        return true;
      }
      return false;
    };

    if (checkLibrary()) return;

    const script = document.createElement("script");
    script.src = "/static/charting_library/charting_library.standalone.js";
    script.async = true;
    script.onload = () => {
      if (checkLibrary()) {
        console.log("TradingView library loaded");
      } else {
        setError("TradingView library failed to initialize");
      }
    };
    script.onerror = () => {
      setError("Failed to load TradingView library. Please ensure charting_library files are in public/static/");
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!libraryReady || !containerRef.current || !window.TradingView) return;

    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch (e) {
        console.error("Error removing widget:", e);
      }
      widgetRef.current = null;
    }

    setLoading(true);
    setError(null);

    try {
      const datafeed = createDatafeed(
        tokenAddress,
        symbol,
        tokenName || symbol,
        tokenDecimals
      );

      const resolution = resolutionMap[timeframe] || "15";

      const widgetOptions = {
        symbol: symbol,
        interval: resolution,
        container: containerRef.current,
        datafeed: datafeed,
        library_path: "/static/charting_library/",
        locale: "en",
        theme: "dark",
        timezone: "Etc/UTC",
        fullscreen: false,
        autosize: true,
        debug: false,
        
        disabled_features: [
          "use_localstorage_for_settings",
          "header_symbol_search",
          "symbol_search_hot_key",
          "header_compare",
          "compare_symbol",
          "header_screenshot",
          "header_undo_redo",
          "header_fullscreen_button",
          "go_to_date",
          "adaptive_logo",
          "show_dom_first_time",
          "open_account_manager",
          "show_right_widgets_panel_by_default",
        ],
        
        enabled_features: [
          "study_templates",
          "side_toolbar_in_fullscreen_mode",
          "header_in_fullscreen_mode",
          "hide_left_toolbar_by_default",
          "move_logo_to_main_pane",
          "dont_show_boolean_study_arguments",
          "hide_last_na_study_output",
          "seconds_resolution",
        ],

        overrides: {
          "paneProperties.background": "#0b0e11",
          "paneProperties.backgroundType": "solid",
          "paneProperties.vertGridProperties.color": "#1e2329",
          "paneProperties.horzGridProperties.color": "#1e2329",
          "scalesProperties.textColor": "#848e9c",
          "scalesProperties.backgroundColor": "#0b0e11",
          "scalesProperties.lineColor": "#1e2329",
          "mainSeriesProperties.candleStyle.upColor": "#02c076",
          "mainSeriesProperties.candleStyle.downColor": "#f6465d",
          "mainSeriesProperties.candleStyle.borderUpColor": "#02c076",
          "mainSeriesProperties.candleStyle.borderDownColor": "#f6465d",
          "mainSeriesProperties.candleStyle.wickUpColor": "#02c076",
          "mainSeriesProperties.candleStyle.wickDownColor": "#f6465d",
          "mainSeriesProperties.hollowCandleStyle.upColor": "#02c076",
          "mainSeriesProperties.hollowCandleStyle.downColor": "#f6465d",
        },

        studies_overrides: {
          "volume.volume.color.0": "rgba(246, 70, 93, 0.5)",
          "volume.volume.color.1": "rgba(2, 192, 118, 0.5)",
        },

        loading_screen: {
          backgroundColor: "#0b0e11",
          foregroundColor: "#02c076",
        },

        custom_css_url: "/static/tradingview-custom.css",
        
        time_frames: [
          { text: "1m", resolution: "1S", description: "1 Minute" },
          { text: "5m", resolution: "1", description: "5 Minutes" },
          { text: "1h", resolution: "5", description: "1 Hour" },
          { text: "1D", resolution: "15", description: "1 Day" },
          { text: "1W", resolution: "60", description: "1 Week" },
          { text: "1M", resolution: "1D", description: "1 Month" },
        ],
      };

      const widget = new window.TradingView.widget(widgetOptions);
      widgetRef.current = widget;
      window.tvWidget = widget;

      widget.onChartReady(() => {
        setLoading(false);

        const chart = widget.activeChart();

        chart.createStudy("Volume", false, false, {}, { 
          "volume.volume.color.0": "rgba(246, 70, 93, 0.5)",
          "volume.volume.color.1": "rgba(2, 192, 118, 0.5)",
        });

        if (userTrades && userTrades.length > 0) {
          userTrades.forEach((trade) => {
            try {
              const shape = chart.createShape(
                { time: Math.floor(trade.timestamp / 1000), price: trade.price },
                {
                  shape: trade.type === "buy" ? "arrow_up" : "arrow_down",
                  text: trade.type === "buy" ? "B" : "S",
                  overrides: {
                    color: trade.type === "buy" ? "#02c076" : "#f6465d",
                    fontsize: 10,
                  },
                }
              );
            } catch (e) {
              console.error("Error creating trade marker:", e);
            }
          });
        }

        widget.subscribe("onAutoSaveNeeded", () => {
          widget.save((state: any) => {
            try {
              localStorage.setItem(`tv_chart_${tokenAddress}`, JSON.stringify(state));
            } catch (e) {
              console.error("Failed to save chart state:", e);
            }
          });
        });

        try {
          const savedState = localStorage.getItem(`tv_chart_${tokenAddress}`);
          if (savedState) {
            widget.load(JSON.parse(savedState));
          }
        } catch (e) {
          console.error("Failed to load saved chart state:", e);
        }
      });

    } catch (err) {
      console.error("Error initializing TradingView widget:", err);
      setError("Failed to initialize chart");
      setLoading(false);
    }

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.error("Error cleaning up widget:", e);
        }
        widgetRef.current = null;
      }
    };
  }, [libraryReady, tokenAddress, symbol, tokenName, tokenDecimals, timeframe, userTrades]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[400px] bg-[#0b0e11] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-xs text-gray-500 max-w-md">
            Make sure the TradingView charting library is placed in:
            <br />
            <code className="text-yellow-500">public/static/charting_library/</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] bg-[#0b0e11]">
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ minHeight: "400px" }}
      />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e11]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#02c076]" />
            <span className="text-xs text-gray-500">Loading TradingView...</span>
          </div>
        </div>
      )}
    </div>
  );
});
