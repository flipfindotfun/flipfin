"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Loader2, Flame, TrendingUp } from "lucide-react";

interface FeaturedToken {
  id: string;
  token_address: string;
  symbol: string;
  name: string;
  logo_url: string;
  featured_until: string;
}

interface TrendingToken {
  address: string;
  symbol: string;
  logoURI?: string;
  priceChange24h?: number;
}

export function FeaturedTokensBar() {
  const [featuredTokens, setFeaturedTokens] = useState<FeaturedToken[]>([]);
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featuredRes, trendingRes] = await Promise.all([
          fetch("/api/featured"),
          fetch("/api/trending")
        ]);

        if (featuredRes.ok) {
          setFeaturedTokens(await featuredRes.json());
        }
        
        if (trendingRes.ok) {
          const trendingData = await trendingRes.json();
          if (trendingData.success) {
            setTrendingTokens(trendingData.tokens.slice(0, 10));
          }
        }
      } catch (err) {
        console.error("Bar error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && featuredTokens.length === 0 && trendingTokens.length === 0) return null;

  return (
    <div className="bg-[#14191f] border-b border-[#1e2329] overflow-hidden">
      <div className="max-w-[2000px] mx-auto flex items-center h-10 px-4 gap-4">
        {/* Featured Section */}
        {featuredTokens.length > 0 && (
          <div className="flex items-center flex-shrink-0 border-r border-[#1e2329] pr-4 mr-2">
            <div className="flex items-center gap-2 mr-2 md:mr-4 text-orange-500 whitespace-nowrap animate-pulse">
              <Flame className="w-4 h-4 fill-current" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">Featured</span>
            </div>
            
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth">
              {featuredTokens.map((token) => (
                <Link
                  key={token.id}
                  href={`/trade/${token.token_address}`}
                  className="flex items-center gap-2 hover:bg-[#1e2329] px-2 py-1 rounded-md transition-colors whitespace-nowrap group"
                >
                  {token.logo_url ? (
                    <img src={token.logo_url} alt={token.symbol} className="w-4 h-4 rounded-full ring-1 ring-orange-500/50" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-[8px] font-bold text-black">
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-white group-hover:text-orange-500">{token.symbol}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trending Section */}
        {trendingTokens.length > 0 && (
          <div className="flex items-center overflow-hidden">
            <div className="flex items-center gap-2 mr-2 md:mr-4 text-[#02c076] whitespace-nowrap flex-shrink-0">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">Trending</span>
            </div>
            
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth">
              {trendingTokens.map((token) => (
                <Link
                  key={token.address}
                  href={`/trade/${token.address}`}
                  className="flex items-center gap-2 hover:bg-[#1e2329] px-2 py-1 rounded-md transition-colors whitespace-nowrap group"
                >
                  {token.logoURI ? (
                    <img src={token.logoURI} alt={token.symbol} className="w-4 h-4 rounded-full" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-[#1e2329] border border-[#2b3139] flex items-center justify-center text-[8px] font-bold text-gray-400">
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}
                    <span className="text-[11px] font-bold text-gray-400 group-hover:text-[#02c076]">{token.symbol}</span>
                    {token.priceChange24h !== undefined && (
                      <span className={`text-[9px] font-medium ${token.priceChange24h >= 0 ? "text-[#02c076]" : "text-[#f6465d]"}`}>
                        {token.priceChange24h >= 0 ? "+" : ""}{token.priceChange24h.toFixed(1)}%
                      </span>
                    )}
                  </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
