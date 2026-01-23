"use client";

import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import { Loader2, Filter, Sparkles, Rocket, GraduationCap, Clock, Globe, RefreshCw, Star, X, Check } from "lucide-react";
import { XIcon, TelegramIcon } from "@/components/icons";
import { Token, formatNumber, timeAgo } from "@/lib/types";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useProfile, Favorite } from "@/hooks/use-profile";
import { VList } from "virtua";
import { motion, AnimatePresence } from "framer-motion";

interface FilterOptions {
  minMC: number | null;
  maxMC: number | null;
  minVolume: number | null;
  minLiquidity: number | null;
  onlyWithTwitter: boolean;
  onlyWithTelegram: boolean;
}

const defaultFilters: FilterOptions = {
  minMC: null,
  maxMC: null,
  minVolume: null,
  minLiquidity: null,
  onlyWithTwitter: false,
  onlyWithTelegram: false,
};

export function TokenColumns() {
  const { tokens, loading, loadingMore, hasMore, loadMore, prefetchSecurity } = useApp();
  const { favorites, toggleFavorite } = useProfile();
  const [activeColumn, setActiveColumn] = useState<"new" | "graduating" | "graduated" | "favorites">("new");
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);
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

  const applyFilters = (tokenList: Token[]) => {
    return tokenList.filter(t => {
      if (filters.minMC !== null && t.marketCap < filters.minMC) return false;
      if (filters.maxMC !== null && t.marketCap > filters.maxMC) return false;
      if (filters.minVolume !== null && t.volume24h < filters.minVolume) return false;
      if (filters.minLiquidity !== null && t.liquidity < filters.minLiquidity) return false;
      if (filters.onlyWithTwitter && !t.twitter) return false;
      if (filters.onlyWithTelegram && !t.telegram) return false;
      return true;
    });
  };

  const hasActiveFilters = filters.minMC !== null || filters.maxMC !== null || 
    filters.minVolume !== null || filters.minLiquidity !== null ||
    filters.onlyWithTwitter || filters.onlyWithTelegram;

  const newTokens = useMemo(() => {
    const filtered = tokens.filter(t => {
      const age = t.createdAt ? Date.now() - t.createdAt : Infinity;
      return age < 3600000;
    });
    return applyFilters(filtered);
  }, [tokens, filters]);
  
  const graduatingTokens = useMemo(() => {
    const filtered = tokens.filter(t => {
      const age = t.createdAt ? Date.now() - t.createdAt : 0;
      return age >= 3600000 && t.marketCap < 100000;
    });
    return applyFilters(filtered);
  }, [tokens, filters]);
  
  const graduatedTokens = useMemo(() => {
    const filtered = tokens.filter(t => t.marketCap >= 100000);
    return applyFilters(filtered);
  }, [tokens, filters]);
  
  const favoriteTokens = useMemo(() => {
    const tokenMap = new Map(tokens.map(t => [t.address, t]));
    const merged = favorites.map(fav => {
      const existing = tokenMap.get(fav.token_address);
      if (existing) return existing;
      return {
        address: fav.token_address,
        symbol: fav.symbol,
        name: fav.name,
        logoURI: fav.image_url,
        decimals: 9,
        price: 0,
        priceChange24h: 0,
        volume24h: 0,
        liquidity: 0,
        marketCap: 0,
      } as Token;
    });
    return applyFilters(merged);
  }, [tokens, favorites, filters]);

  const handleTokenClick = (token: Token) => {
    router.push(`/trade/${token.address}`);
  };

  const handleTokenHover = (address: string) => {
    router.prefetch(`/trade/${address}`);
    prefetchSecurity(address);
  };

  const formatLastUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showFilters && (
        <FilterModal 
          filters={filters} 
          setFilters={setFilters} 
          onClose={() => setShowFilters(false)} 
        />
      )}
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

      <div className="flex-1 flex overflow-hidden bg-[#0b0e11]">
        <div className={cn(
          "flex-1 flex flex-col border-r border-[#1e2329] min-w-0 h-full",
          activeColumn !== "new" && "hidden md:flex"
        )}>
          <ColumnHeader 
            icon={<Sparkles className="w-4 h-4 text-[#02c076]" />}
            title="New Creations" 
            count={newTokens.length}
            lastUpdate={formatLastUpdate()}
            onFilterClick={() => setShowFilters(true)}
            hasActiveFilters={hasActiveFilters}
          />
            <div className="flex-1 min-h-0 overflow-hidden">
              <TokenListScroll 
                tokens={newTokens} 
                onSelect={handleTokenClick} 
                onHover={handleTokenHover}
                loading={loading}
                observerRef={activeColumn === "new" ? observerTarget : null}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
            </div>
          </div>

          <div className={cn(
            "flex-1 flex flex-col border-r border-[#1e2329] min-w-0 h-full",
            activeColumn !== "graduating" && "hidden md:flex"
          )}>
            <ColumnHeader 
              icon={<Rocket className="w-4 h-4 text-yellow-500" />}
              title="About to Graduate" 
              count={graduatingTokens.length}
              lastUpdate={formatLastUpdate()}
              onFilterClick={() => setShowFilters(true)}
              hasActiveFilters={hasActiveFilters}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <TokenListScroll 
                tokens={graduatingTokens} 
                onSelect={handleTokenClick} 
                onHover={handleTokenHover}
                loading={loading}
                observerRef={activeColumn === "graduating" ? observerTarget : null}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
            </div>
          </div>

          <div className={cn(
            "flex-1 flex flex-col border-r border-[#1e2329] min-w-0 h-full",
            activeColumn !== "graduated" && "hidden md:flex"
          )}>
            <ColumnHeader 
              icon={<GraduationCap className="w-4 h-4 text-[#02c076]" />}
              title="Graduated" 
              count={graduatedTokens.length}
              lastUpdate={formatLastUpdate()}
              onFilterClick={() => setShowFilters(true)}
              hasActiveFilters={hasActiveFilters}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <TokenListScroll 
                tokens={graduatedTokens} 
                onSelect={handleTokenClick} 
                onHover={handleTokenHover}
                loading={loading}
                observerRef={activeColumn === "graduated" ? observerTarget : null}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
            </div>
          </div>

          <div className={cn(
            "flex-1 flex flex-col min-w-0 bg-[#0d1117]/50 h-full",
            activeColumn !== "favorites" && "hidden md:flex"
          )}>
            <ColumnHeader 
              icon={<Star className="w-4 h-4 text-yellow-500" />}
              title="My Favorites" 
              count={favoriteTokens.length}
              lastUpdate={formatLastUpdate()}
              onFilterClick={() => setShowFilters(true)}
              hasActiveFilters={hasActiveFilters}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <TokenListScroll 
                tokens={favoriteTokens} 
                onSelect={handleTokenClick} 
                onHover={handleTokenHover}
                loading={loading}
                observerRef={null}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
            </div>
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

function ColumnHeader({ icon, title, count, lastUpdate, onFilterClick, hasActiveFilters }: { 
  icon: React.ReactNode; 
  title: string; 
  count: number;
  lastUpdate: string;
  onFilterClick: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2329] bg-[#0d1117] flex-shrink-0">
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
        <button 
          onClick={onFilterClick}
          className={cn(
            "flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors",
            hasActiveFilters 
              ? "text-[#02c076] bg-[#02c076]/10 hover:bg-[#02c076]/20" 
              : "text-gray-500 hover:text-gray-300 hover:bg-[#1e2329]"
          )}
        >
          <Filter className="w-3 h-3" />
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#02c076]" />}
        </button>
      </div>
    </div>
  );
}

function TokenListScroll({ tokens, onSelect, onHover, loading, observerRef, favorites, toggleFavorite }: {
  tokens: Token[];
  onSelect: (token: Token) => void;
  onHover: (address: string) => void;
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
    <VList className="flex-1 h-full scrollbar-thin scrollbar-thumb-[#1e2329] scrollbar-track-transparent">
      {tokens.map((token) => (
        <TokenCard 
          key={token.address} 
          token={token} 
          onClick={() => onSelect(token)}
          onHover={() => onHover(token.address)}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
        />
      ))}
      {observerRef && <div ref={observerRef} className="h-4" />}
    </VList>
  );
}

const TokenCard = memo(function TokenCard({ token, onClick, onHover, favorites, toggleFavorite }: { 
  token: Token; 
  onClick: () => void;
  onHover: () => void;
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      onMouseEnter={onHover}
      className="px-3 py-2.5 cursor-pointer transition-all border-b border-[#1e2329]/50 hover:bg-[#1e2329]/40 relative group"
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
            <img 
              src={token.logoURI} 
              alt={token.symbol} 
              className="w-10 h-10 rounded-lg bg-[#1e2329] object-cover" 
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1e2329] to-[#2b3139] flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
              {token.symbol.slice(0, 2)}
            </div>
          )}
          {token.platform === "pumpfun" && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#ff6b35] rounded-full border-2 border-[#0b0e11]" title="Pump.fun" />
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
              {isPositive ? "+" : ""}{token.priceChange24h.toFixed(1)}%
            </span>
            <span className="text-gray-500">
              <span className="text-gray-400 font-medium">MC</span> ${formatNumber(token.marketCap)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
              {token.twitter && (
                <button 
                  className="p-1 hover:bg-[#1e2329] rounded text-gray-600 hover:text-gray-400 transition-colors" 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(token.twitter!, "_blank");
                  }}
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
              {token.telegram && (
                <button 
                  className="p-1 hover:bg-[#1e2329] rounded text-gray-600 hover:text-gray-400 transition-colors" 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(token.telegram!, "_blank");
                  }}
                >
                  <TelegramIcon className="w-3 h-3" />
                </button>
              )}
              <button 
                className="p-1 hover:bg-[#1e2329] rounded text-gray-600 hover:text-gray-400 transition-colors" 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://solscan.io/token/${token.address}`, "_blank");
                }}
              >
                <Globe className="w-3 h-3" />
              </button>
            </div>
        
            <div className="flex items-center gap-2">
              <MiniChart address={token.address} isPositive={isPositive} priceChange={token.priceChange24h} />
              <div className="text-right">
                <div className="text-[10px] text-gray-500">
                  <span className="text-gray-400 font-medium">V</span> ${formatNumber(token.volume24h)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const MiniChart = memo(function MiniChart({ address, isPositive, priceChange }: { address: string; isPositive: boolean; priceChange: number }) {
  const color = isPositive ? "#02c076" : "#f6465d";
  
  // Create stable "random" values based on address for a unique look per token
  const seed = useMemo(() => {
    let s = 0;
    for (let i = 0; i < address.length; i++) s += address.charCodeAt(i);
    return s;
  }, [address]);

  const path = useMemo(() => {
    const magnitude = Math.min(Math.abs(priceChange) / 100, 1);
    const trend = isPositive ? 1 : -1;
    
    const points = Array.from({ length: 12 }, (_, i) => {
      const progress = i / 11;
      const trendValue = trend * progress * magnitude * 12;
      // Stable noise based on seed
      const noise = Math.sin(i * 0.8 + seed) * 3;
      return 12 + trendValue + noise;
    });
    
    return points.map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * 5} ${24 - y}`).join(' ');
  }, [seed, isPositive, priceChange]);

  return (
    <svg width="60" height="24" className="flex-shrink-0 opacity-80" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

function FilterModal({ filters, setFilters, onClose }: {
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  onClose: () => void;
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  
  const handleApply = () => {
    setFilters(localFilters);
    onClose();
  };
  
  const handleReset = () => {
    setLocalFilters(defaultFilters);
    setFilters(defaultFilters);
  };

  const parseNumber = (value: string): number | null => {
    if (!value) return null;
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : num;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0d1117] border border-[#1e2329] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2329] bg-[#0d1117]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#02c076]" />
            Filters
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white bg-[#1e2329] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Market Cap</label>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <span className="text-[10px] text-gray-500 ml-1">Min</span>
                <input
                  type="text"
                  placeholder="0"
                  value={localFilters.minMC ?? ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, minMC: parseNumber(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#1e2329] border border-[#2b3139] rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#02c076] focus:ring-1 focus:ring-[#02c076]/30 transition-all"
                />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[10px] text-gray-500 ml-1">Max</span>
                <input
                  type="text"
                  placeholder="∞"
                  value={localFilters.maxMC ?? ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, maxMC: parseNumber(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#1e2329] border border-[#2b3139] rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#02c076] focus:ring-1 focus:ring-[#02c076]/30 transition-all"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Min Volume (24h)</label>
            <input
              type="text"
              placeholder="e.g. 100,000"
              value={localFilters.minVolume ?? ''}
              onChange={(e) => setLocalFilters({ ...localFilters, minVolume: parseNumber(e.target.value) })}
              className="w-full px-3.5 py-2.5 text-sm bg-[#1e2329] border border-[#2b3139] rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#02c076] focus:ring-1 focus:ring-[#02c076]/30 transition-all"
            />
          </div>
          
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Min Liquidity</label>
            <input
              type="text"
              placeholder="e.g. 50,000"
              value={localFilters.minLiquidity ?? ''}
              onChange={(e) => setLocalFilters({ ...localFilters, minLiquidity: parseNumber(e.target.value) })}
              className="w-full px-3.5 py-2.5 text-sm bg-[#1e2329] border border-[#2b3139] rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#02c076] focus:ring-1 focus:ring-[#02c076]/30 transition-all"
            />
          </div>
          
          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Social Requirements</label>
            <div className="grid grid-cols-1 gap-3">
              <label className="flex items-center gap-3 p-3 bg-[#1e2329] rounded-xl cursor-pointer hover:bg-[#2b3139] transition-all group">
                <div 
                  onClick={(e) => {
                    e.preventDefault();
                    setLocalFilters({ ...localFilters, onlyWithTwitter: !localFilters.onlyWithTwitter });
                  }}
                  className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                    localFilters.onlyWithTwitter 
                      ? "bg-[#02c076] border-[#02c076] shadow-[0_0_10px_rgba(2,192,118,0.3)]" 
                      : "border-[#3a4149] group-hover:border-gray-500"
                  )}
                >
                  {localFilters.onlyWithTwitter && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-sm text-white font-medium">Only with X (Twitter)</span>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-[#1e2329] rounded-xl cursor-pointer hover:bg-[#2b3139] transition-all group">
                <div 
                  onClick={(e) => {
                    e.preventDefault();
                    setLocalFilters({ ...localFilters, onlyWithTelegram: !localFilters.onlyWithTelegram });
                  }}
                  className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                    localFilters.onlyWithTelegram 
                      ? "bg-[#02c076] border-[#02c076] shadow-[0_0_10px_rgba(2,192,118,0.3)]" 
                      : "border-[#3a4149] group-hover:border-gray-500"
                  )}
                >
                  {localFilters.onlyWithTelegram && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-sm text-white font-medium">Only with Telegram</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 p-5 border-t border-[#1e2329] bg-[#0d1117]">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-3 text-sm font-bold text-gray-400 bg-[#1e2329] rounded-xl hover:bg-[#2b3139] hover:text-white transition-all"
          >
            Reset All
          </button>
          <button
            onClick={handleApply}
            className="flex-[2] px-4 py-3 text-sm font-bold text-white bg-[#02c076] rounded-xl hover:bg-[#02a566] shadow-[0_4px_15px_rgba(2,192,118,0.2)] transition-all"
          >
            Apply Filters
          </button>
        </div>
      </motion.div>
    </div>
  );
}
