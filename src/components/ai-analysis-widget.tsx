"use client";

import { useState } from "react";
import { Bot, Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAnalysisWidgetProps {
  type: "token" | "narrative" | "market-pulse";
  data: any;
  className?: string;
}

export function AIAnalysisWidget({ type, data, className }: AIAnalysisWidgetProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      
      const json = await res.json();
      
      if (type === "market-pulse") {
        setAnalysis({ pulse: json.pulse });
      } else {
        setAnalysis(json.analysis);
      }
    } catch (err) {
      setError("Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading) {
    return (
      <button
        onClick={fetchAnalysis}
        className={cn(
          "w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition-all",
          className
        )}
      >
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-white">AI Analysis</span>
      </button>
    );
  }

  if (loading) {
    return (
      <div className={cn("p-4 bg-[#1e2329] rounded-lg", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="text-xs text-gray-400">Analyzing with AI...</span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-[#2b3139] rounded animate-pulse" />
          <div className="h-4 bg-[#2b3139] rounded animate-pulse w-3/4" />
          <div className="h-4 bg-[#2b3139] rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-3 bg-red-500/10 border border-red-500/30 rounded-lg", className)}>
        <p className="text-xs text-red-400">{error}</p>
        <button onClick={fetchAnalysis} className="text-xs text-gray-400 hover:text-white mt-1">
          Try again
        </button>
      </div>
    );
  }

  if (type === "market-pulse") {
    return (
      <div className={cn("p-4 bg-gradient-to-br from-[#1e2329] to-[#0d1117] rounded-lg border border-purple-500/20", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-medium text-purple-400">AI Market Pulse</span>
        </div>
        <p className="text-sm text-white leading-relaxed">{analysis?.pulse}</p>
      </div>
    );
  }

  if (type === "token") {
    const sentimentColor = analysis?.sentiment === "bullish" ? "text-green-400" : 
                          analysis?.sentiment === "bearish" ? "text-red-400" : "text-yellow-400";
    const riskColor = analysis?.riskLevel === "low" ? "text-green-400" :
                     analysis?.riskLevel === "medium" ? "text-yellow-400" :
                     analysis?.riskLevel === "high" ? "text-orange-400" : "text-red-400";

    return (
      <div className={cn("p-4 bg-gradient-to-br from-[#1e2329] to-[#0d1117] rounded-lg border border-purple-500/20", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">AI Analysis</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {analysis?.sentiment === "bullish" ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              ) : analysis?.sentiment === "bearish" ? (
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              ) : null}
              <span className={cn("text-xs font-medium capitalize", sentimentColor)}>
                {analysis?.sentiment}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className={cn("w-3.5 h-3.5", riskColor)} />
              <span className={cn("text-xs capitalize", riskColor)}>{analysis?.riskLevel}</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-300 mb-3">{analysis?.summary}</p>
        
        {analysis?.keyPoints?.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {analysis.keyPoints.map((point: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-400">{point}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="pt-3 border-t border-[#2b3139]">
          <p className="text-xs text-white font-medium">{analysis?.tradingAdvice}</p>
        </div>
        
        <button onClick={fetchAnalysis} className="mt-2 text-[10px] text-gray-500 hover:text-gray-300">
          Refresh
        </button>
      </div>
    );
  }

  if (type === "narrative") {
    const trendIcon = analysis?.trend === "rising" ? TrendingUp : 
                     analysis?.trend === "falling" ? TrendingDown : null;
    const trendColor = analysis?.trend === "rising" ? "text-green-400" :
                      analysis?.trend === "falling" ? "text-red-400" : "text-yellow-400";

    return (
      <div className={cn("p-4 bg-gradient-to-br from-[#1e2329] to-[#0d1117] rounded-lg border border-purple-500/20", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">AI Narrative Analysis</span>
          </div>
          {trendIcon && (
            <div className="flex items-center gap-1">
              {trendIcon && <trendIcon className={cn("w-3.5 h-3.5", trendColor)} />}
              <span className={cn("text-xs capitalize", trendColor)}>{analysis?.trend}</span>
            </div>
          )}
        </div>
        
        <p className="text-sm text-gray-300 mb-3">{analysis?.summary}</p>
        
        <div className="grid grid-cols-2 gap-3">
          {analysis?.catalysts?.length > 0 && (
            <div>
              <p className="text-[10px] text-green-400 font-medium mb-1">Catalysts</p>
              {analysis.catalysts.slice(0, 2).map((c: string, i: number) => (
                <p key={i} className="text-xs text-gray-400">• {c}</p>
              ))}
            </div>
          )}
          {analysis?.risks?.length > 0 && (
            <div>
              <p className="text-[10px] text-red-400 font-medium mb-1">Risks</p>
              {analysis.risks.slice(0, 2).map((r: string, i: number) => (
                <p key={i} className="text-xs text-gray-400">• {r}</p>
              ))}
            </div>
          )}
        </div>
        
        <button onClick={fetchAnalysis} className="mt-2 text-[10px] text-gray-500 hover:text-gray-300">
          Refresh
        </button>
      </div>
    );
  }

  return null;
}
