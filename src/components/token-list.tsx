"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Loader2, Search, Filter, Flame, Sparkles, Clock } from "lucide-react";
import { Token, formatNumber, formatPrice, timeAgo } from "@/lib/types";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useTokenSearch } from "@/hooks/use-token-data";

type FilterType = "all" | "trending" | "new" | "gainers";

export function TokenList() {
  const { tokens, setSelectedToken, selectedToken, loading, loadingMore, hasMore, loadMore } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { results: searchResults, loading: searchLoading } = useTokenSearch(searchQuery);

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && !searchQuery) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore, searchQuery]);

  const getFilteredTokens = useCallback(() => {
    let base = searchQuery.length >= 2 ? searchResults : tokens;
    
    switch (activeFilter) {
      case "trending":
        return [...base].sort((a, b) => b.volume24h - a.volume24h);
      case "new":
        return [...base].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      case "gainers":
        return [...base].sort((a, b) => b.priceChange24h - a.priceChange24h);
      default:
        return base;
    }
  }, [tokens, searchResults, searchQuery, activeFilter]);

  const displayTokens = getFilteredTokens();

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex flex-col border-b border-[#1a1a1a] bg-[#0d0d0d] sticky top-0 z-10">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token..."
              className="bg-[#111] border-[#1a1a1a] pl-9 h-9 sm:h-10 text-xs sm:text-sm focus:border-[#00d991]/50"
            />
            {(loading || searchLoading) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#00d991]" />
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 px-3 sm:px-4 pb-2.5 overflow-x-auto no-scrollbar">
          <FilterPill
            icon={<Sparkles className="w-3 h-3" />}
            label="All"
            active={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
          />
          <FilterPill
            icon={<Flame className="w-3 h-3" />}
            label="Hot"
            active={activeFilter === "trending"}
            onClick={() => setActiveFilter("trending")}
          />
          <FilterPill
            icon={<Clock className="w-3 h-3" />}
            label="New"
            active={activeFilter === "new"}
            onClick={() => setActiveFilter("new")}
          />
          <FilterPill
            icon={<TrendingUp className="w-3 h-3" />}
            label="Gainers"
            active={activeFilter === "gainers"}
            onClick={() => setActiveFilter("gainers")}
          />
        </div>
      </div>

      {/* Table Header - Desktop */}
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 border-b border-[#1a1a1a] bg-[#0d0d0d]">
        <span>Token</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h</span>
        <span className="text-right">MCap</span>
        <span className="text-right">Age</span>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto">
        {loading && displayTokens.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-[#00d991]" />
          </div>
        ) : displayTokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <Search className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No tokens found</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]/50">
            {displayTokens.map((token) => (
              <TokenRow
                key={token.address}
                token={token}
                isSelected={selectedToken?.address === token.address}
                onClick={() => setSelectedToken(token)}
              />
            ))}
            
            {hasMore && !searchQuery && (
              <div ref={observerTarget} className="p-6 flex justify-center">
                {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-[#00d991]" />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TokenRow({ token, isSelected, onClick }: { token: Token; isSelected: boolean; onClick: () => void }) {
  const isPositive = token.priceChange24h >= 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "px-3 sm:px-4 py-3 sm:py-3.5 cursor-pointer transition-all active:bg-[#1a1a1a]",
        "hover:bg-[#111] border-l-2",
        isSelected ? "bg-[#111] border-l-[#00d991]" : "border-l-transparent"
      )}
    >
      {/* Mobile Layout */}
      <div className="sm:hidden flex items-center gap-3">
        <TokenAvatar token={token} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm truncate">{token.symbol}</span>
            <span className="font-mono text-sm font-bold">${formatPrice(token.price)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[11px] text-gray-500 truncate">{token.name}</span>
            <span className={cn(
              "text-[11px] font-bold",
              isPositive ? "text-[#00d991]" : "text-red-500"
            )}>
              {isPositive ? "+" : ""}{token.priceChange24h.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-2 items-center">
        <div className="flex items-center gap-3 min-w-0">
          <TokenAvatar token={token} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm truncate">{token.symbol}</span>
              {token.platform === "pumpfun" && (
                <span className="text-[9px] px-1.5 py-0.5 bg-orange-500/10 text-orange-500 rounded font-bold">PUMP</span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 truncate">{token.name}</p>
          </div>
        </div>

        <div className="text-right font-mono text-sm font-bold">
          ${formatPrice(token.price)}
        </div>

        <div className={cn(
          "text-right text-xs font-bold",
          isPositive ? "text-[#00d991]" : "text-red-500"
        )}>
          {isPositive ? "+" : ""}{token.priceChange24h.toFixed(1)}%
        </div>

        <div className="text-right text-xs font-bold text-gray-400 font-mono">
          ${formatNumber(token.marketCap)}
        </div>

        <div className="text-right text-[10px] text-gray-600 font-medium">
          {token.createdAt ? timeAgo(token.createdAt) : "-"}
        </div>
      </div>
    </div>
  );
}

function TokenAvatar({ token }: { token: Token }) {
  return (
    <div className="relative flex-shrink-0">
      {token.logoURI ? (
        <img 
          src={token.logoURI} 
          alt={token.symbol}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover bg-[#111] border border-[#1a1a1a]"
        />
      ) : (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#262626] flex items-center justify-center text-gray-400 font-bold text-xs border border-[#1a1a1a]">
          {token.symbol.slice(0, 2)}
        </div>
      )}
    </div>
  );
}

function FilterPill({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-full border transition-all whitespace-nowrap",
        active 
          ? "bg-[#00d991] text-black border-[#00d991]" 
          : "bg-transparent text-gray-500 border-[#262626] hover:border-gray-500 hover:text-gray-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
