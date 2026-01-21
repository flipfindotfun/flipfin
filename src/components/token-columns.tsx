"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Filter, Sparkles, Rocket, GraduationCap, Clock, Globe, RefreshCw, Star } from "lucide-react";
import { XIcon } from "@/components/icons";
import { Token, formatNumber, timeAgo } from "@/lib/types";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useProfile, Favorite } from "@/hooks/use-profile";

export function TokenColumns() {
  const { tokens, loading, loadingMore, hasMore, loadMore } = useApp();
  const { favorites, toggleFavorite } = useProfile();
  const [activeColumn, setActiveColumn] = useState<"new" | "graduating" | "graduated" | "favorites">("new");
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const router = useRouter();
  
  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  useEffect(() => {
    if (tokens.length > 0) {
      setLastUpdate(Date.now());
    }
  }, [tokens]);

  const newTokens = tokens.filter(t => {
    const age = t.createdAt ? Date.now() - t.createdAt : Infinity;
    return age < 3600000;
  });
  
  const graduatingTokens = tokens.filter(t => {
    const age = t.createdAt ? Date.now() - t.createdAt : 0;
    return age >= 3600000 && t.marketCap < 100000;
  });
  
  const graduatedTokens = tokens.filter(t => t.marketCap >= 100000);
  
  const favoriteTokens = tokens.filter(t => favorites.some(f => f.token_address === t.address));

  const handleTokenClick = (token: Token) => {
    router.push(`/trade/${token.address}`);
  };

  const formatLastUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="md:hidden flex border-b border-[#1e2329] bg-[#0b0e11]">
        <TabButton 
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="New" 
          count={newTokens.length}
          active={activeColumn === "new"} 
          onClick={() => setActiveColumn("new")} 
        />
        <TabButton 
          icon={<Rocket className="w-3.5 h-3.5" />}
          label="Graduating" 
          count={graduatingTokens.length}
          active={activeColumn === "graduating"} 
          onClick={() => setActiveColumn("graduating")} 
        />
        <TabButton 
          icon={<GraduationCap className="w-3.5 h-3.5" />}
          label="Graduated" 
          count={graduatedTokens.length}
          active={activeColumn === "graduated"} 
          onClick={() => setActiveColumn("graduated")} 
        />
        <TabButton 
          icon={<Star className="w-3.5 h-3.5" />}
          label="Favorites" 
          count={favoriteTokens.length}
          active={activeColumn === "favorites"} 
          onClick={() => setActiveColumn("favorites")} 
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={cn(
          "flex-1 flex flex-col border-r border-[#1e2329] min-w-0",
          activeColumn !== "new" && "hidden md:flex"
        )}>
          <ColumnHeader 
            icon={<Sparkles className="w-4 h-4 text-[#02c076]" />}
            title="New Creations" 
            count={newTokens.length}
            lastUpdate={formatLastUpdate()}
          />
          <TokenListScroll 
            tokens={newTokens} 
            onSelect={handleTokenClick} 
            loading={loading}
            observerRef={activeColumn === "new" ? observerTarget : null}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
          />
        </div>

        <div className={cn(
          "flex-1 flex flex-col border-r border-[#1e2329] min-w-0",
          activeColumn !== "graduating" && "hidden md:flex"
        )}>
          <ColumnHeader 
            icon={<Rocket className="w-4 h-4 text-yellow-500" />}
            title="About to Graduate" 
            count={graduatingTokens.length}
            lastUpdate={formatLastUpdate()}
          />
          <TokenListScroll 
            tokens={graduatingTokens} 
            onSelect={handleTokenClick} 
            loading={loading}
            observerRef={activeColumn === "graduating" ? observerTarget : null}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
          />
        </div>

        <div className={cn(
          "flex-1 flex flex-col min-w-0",
          activeColumn !== "graduated" && "hidden md:flex"
        )}>
          <ColumnHeader 
            icon={<GraduationCap className="w-4 h-4 text-[#02c076]" />}
            title="Graduated" 
            count={graduatedTokens.length}
            lastUpdate={formatLastUpdate()}
          />
          <TokenListScroll 
            tokens={graduatedTokens} 
            onSelect={handleTokenClick} 
            loading={loading}
            observerRef={activeColumn === "graduated" ? observerTarget : null}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
          />
        </div>

        <div className={cn(
          "flex-1 flex flex-col min-w-0 bg-[#0d1117]/50",
          activeColumn !== "favorites" && "hidden"
        )}>
          <ColumnHeader 
            icon={<Star className="w-4 h-4 text-yellow-500" />}
            title="My Favorites" 
            count={favoriteTokens.length}
            lastUpdate={formatLastUpdate()}
          />
          <TokenListScroll 
            tokens={favoriteTokens} 
            onSelect={handleTokenClick} 
            loading={loading}
            observerRef={null}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
          />
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon, label, count, active, onClick }: { 
  icon: React.ReactNode; 
  label: string; 
  count: number;
  active: boolean; 
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1 py-2 text-[10px] sm:text-xs font-semibold transition-all border-b-2",
        active 
          ? "text-[#02c076] border-[#02c076] bg-[#02c076]/5" 
          : "text-gray-500 border-transparent hover:text-gray-300"
      )}
    >
      {icon}
      <span className="hidden xs:inline">{label}</span>
      <span className={cn(
        "text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded",
        active ? "bg-[#02c076]/20 text-[#02c076]" : "bg-[#1e2329] text-gray-500"
      )}>
        {count}
      </span>
    </button>
  );
}

function ColumnHeader({ icon, title, count, lastUpdate }: { 
  icon: React.ReactNode; 
  title: string; 
  count: number;
  lastUpdate: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2329] bg-[#0d1117]">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-[#1e2329] text-gray-400 rounded">{count}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#02c076] animate-pulse" />
          <span className="text-[10px] text-gray-500">{lastUpdate}</span>
        </div>
        <button className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-[#1e2329]">
          <Filter className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function TokenListScroll({ tokens, onSelect, loading, observerRef, favorites, toggleFavorite }: {
  tokens: Token[];
  onSelect: (token: Token) => void;
  loading: boolean;
  observerRef: React.RefObject<HTMLDivElement> | null;
  favorites: Favorite[];
  toggleFavorite: (token: { address: string; symbol: string; name: string; logoURI?: string }) => void;
}) {
  if (loading && tokens.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#02c076]" />
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        No tokens found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {tokens.map((token) => (
        <TokenCard 
          key={token.address} 
          token={token} 
          onClick={() => onSelect(token)}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
        />
      ))}
      {observerRef && <div ref={observerRef} className="h-4" />}
    </div>
  );
}

function TokenCard({ token, onClick, favorites, toggleFavorite }: { 
  token: Token; 
  onClick: () => void;
  favorites: Favorite[];
  toggleFavorite: (token: { address: string; symbol: string; name: string; logoURI?: string }) => void;
}) {
  const isFavorite = favorites.some(f => f.token_address === token.address);
  const isPositive = token.priceChange24h >= 0;
  const ageText = token.createdAt ? timeAgo(token.createdAt) : "";

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      logoURI: token.logoURI
    });
  };

  return (
    <div
      onClick={onClick}
      className="px-3 py-2.5 cursor-pointer transition-all border-b border-[#1e2329]/50 hover:bg-[#1e2329]/30 relative group"
    >
      <button
        onClick={handleFavoriteClick}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-full transition-all z-10",
          isFavorite ? "text-yellow-500 opacity-100" : "text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-[#1e2329]"
        )}
      >
        <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
      </button>

      <div className="flex items-start gap-2.5">
        <div className="relative flex-shrink-0">
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol} className="w-10 h-10 rounded-lg bg-[#1e2329]" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1e2329] to-[#2b3139] flex items-center justify-center text-gray-500 font-bold text-xs">
              {token.symbol.slice(0, 2)}
            </div>
          )}
          {token.platform === "pumpfun" && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#ff6b35] rounded-full border-2 border-[#0b0e11]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-sm text-white truncate">{token.symbol}</span>
              <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{token.name}</span>
            </div>
            {ageText && (
              <div className="flex items-center gap-1 text-[10px] text-gray-500 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {ageText}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-[10px]">
            <span className={cn(
              "font-bold px-1.5 py-0.5 rounded",
              isPositive ? "text-[#02c076] bg-[#02c076]/10" : "text-[#f6465d] bg-[#f6465d]/10"
            )}>
              {isPositive ? "+" : ""}{token.priceChange24h.toFixed(0)}%
            </span>
            <span className="text-gray-500">
              <span className="text-gray-400">MC</span> ${formatNumber(token.marketCap)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
              <button className="p-1 hover:bg-[#1e2329] rounded text-gray-600 hover:text-gray-400" onClick={(e) => e.stopPropagation()}>
                <XIcon className="w-3 h-3" />
              </button>
              <button className="p-1 hover:bg-[#1e2329] rounded text-gray-600 hover:text-gray-400" onClick={(e) => e.stopPropagation()}>
                <Globe className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <MiniChart isPositive={isPositive} priceChange={token.priceChange24h} />
              <div className="text-right">
                <div className="text-[10px] text-gray-500">
                  <span className="text-gray-400">V</span> ${formatNumber(token.volume24h)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniChart({ isPositive, priceChange }: { isPositive: boolean; priceChange: number }) {
  const color = isPositive ? "#02c076" : "#f6465d";
  
  const magnitude = Math.min(Math.abs(priceChange) / 100, 1);
  const trend = isPositive ? 1 : -1;
  
  const points = Array.from({ length: 20 }, (_, i) => {
    const progress = i / 19;
    const trendValue = trend * progress * magnitude * 10;
    const noise = Math.sin(i * 0.8 + Date.now() * 0.0001) * 2;
    return 15 + trendValue + noise;
  });
  
  const path = points.map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * 3} ${30 - y}`).join(' ');

  return (
    <svg width="60" height="24" className="flex-shrink-0">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
