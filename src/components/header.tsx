"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, X, PieChart, Eye, Trophy, Activity, BookOpen, Shield, Flame, TrendingUp, Vote, Menu } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { WalletButton } from "@/components/wallet-button";
import { useApp } from "@/lib/context";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/types";
import { useProfile } from "@/hooks/use-profile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SearchResult {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  logoURI?: string;
  marketCap: number;
}

export function Header() {
  const { solPrice, prefetchSecurity } = useApp();
  const { profile } = useProfile();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const isAddress = query.length >= 32 && query.length <= 44;
    
    const search = async () => {
      setLoading(true);
      try {
        if (isAddress) {
          const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${query}`);
          const pairs = await res.json();
          
          if (Array.isArray(pairs) && pairs.length > 0) {
            const mainPair = pairs.sort((a: any, b: any) => 
              (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0];
            
            setResults([{
              address: mainPair.baseToken.address,
              symbol: mainPair.baseToken.symbol,
              name: mainPair.baseToken.name,
              price: parseFloat(mainPair.priceUsd) || 0,
              priceChange24h: mainPair.priceChange?.h24 || 0,
              logoURI: mainPair.info?.imageUrl,
              marketCap: mainPair.fdv || 0,
            }]);
          } else {
            setResults([]);
          }
        } else {
          const res = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`
          );
          const data = await res.json();
          
          if (data.pairs && Array.isArray(data.pairs)) {
            const tokenMap = new Map<string, SearchResult>();
            
            data.pairs
              .filter((p: any) => p.chainId === "solana")
              .slice(0, 20)
              .forEach((pair: any) => {
                const existing = tokenMap.get(pair.baseToken.address);
                const liquidity = pair.liquidity?.usd || 0;
                
                if (!existing || liquidity > (existing.marketCap || 0)) {
                  tokenMap.set(pair.baseToken.address, {
                    address: pair.baseToken.address,
                    symbol: pair.baseToken.symbol,
                    name: pair.baseToken.name,
                    price: parseFloat(pair.priceUsd) || 0,
                    priceChange24h: pair.priceChange?.h24 || 0,
                    logoURI: pair.info?.imageUrl,
                    marketCap: pair.fdv || 0,
                  });
                }
              });
            
            setResults(Array.from(tokenMap.values()).slice(0, 8));
          }
        }
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setQuery("");
    setShowResults(false);
    router.push(`/trade/${result.address}`);
  };

  const handleHover = (address: string) => {
    router.prefetch(`/trade/${address}`);
    prefetchSecurity(address);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.length >= 32) {
      setShowResults(false);
      router.push(`/trade/${query}`);
    }
    if (e.key === "Escape") {
      setShowResults(false);
      setQuery("");
    }
  };

  const NavLinks = ({ mobile = false }) => (
    <div className={cn("flex items-center gap-1.5", mobile ? "flex-col items-stretch w-full gap-2" : "hidden lg:flex")}>
      <Link 
        href="/flow"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors",
          mobile ? "bg-[#1e2329] hover:bg-[#2b3139]" : "bg-gradient-to-r from-[#02c076]/10 to-[#8b5cf6]/10 border border-[#02c076]/20 hover:border-[#02c076]/40"
        )}
      >
        <Activity className="w-3.5 h-3.5 text-[#02c076]" />
        <span className="text-xs font-medium text-white">Flow</span>
      </Link>
      <Link 
        href="/narratives"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-medium text-white">Narratives</span>
      </Link>
      <Link 
        href="/social"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
      >
        <Shield className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-xs font-medium text-white">Hype</span>
      </Link>
      <Link 
        href="/governance"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
      >
        <Vote className="w-3.5 h-3.5 text-[#02c076]" />
        <span className="text-xs font-medium text-white">Governance</span>
      </Link>
      <Link 
        href="/rewards"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
      >
        <Trophy className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-xs font-bold text-white tabular-nums">
          {profile?.total_points ? Math.floor(profile.total_points).toLocaleString() : "0"} Points
        </span>
      </Link>
      <Link 
        href="/portfolio"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1e2329] rounded-lg hover:bg-[#2b3139] transition-colors"
      >
        <PieChart className="w-3.5 h-3.5 text-[#02c076]" />
        <span className="text-xs font-medium text-white">PnL</span>
      </Link>
    </div>
  );

  return (
    <header className="flex items-center justify-between px-3 sm:px-4 h-14 border-b border-[#1e2329] bg-[#0d1117] sticky top-0 z-50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.png" alt="Flip Finance" className="w-7 h-7 object-contain" />
          <span className="font-bold text-white text-lg tracking-tight hidden md:block">Flip</span>
        </Link>
        
        <div className="flex-1 max-w-md relative" ref={containerRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search or paste CA..."
              className="bg-[#1e2329] border-[#2b3139] pl-9 pr-8 h-9 text-xs focus:border-[#02c076]/50 rounded-lg w-full"
            />
            {query && (
              <button 
                onClick={() => { setQuery(""); setResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showResults && (query.length >= 2 || results.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d1117] border border-[#1e2329] rounded-lg shadow-2xl z-[60] max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#02c076]" />
                </div>
              ) : results.length > 0 ? (
                <div className="py-1">
                  {results.map((result) => (
                    <button
                      key={result.address}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => handleHover(result.address)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-[#1e2329] transition-colors text-left"
                    >
                      {result.logoURI ? (
                        <img src={result.logoURI} alt={result.symbol} className="w-9 h-9 rounded-lg" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#1e2329] flex items-center justify-center text-xs font-bold text-gray-500">
                          {result.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{result.symbol}</span>
                          <span className="text-gray-500 text-xs truncate">{result.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-gray-400">MC ${formatNumber(result.marketCap)}</span>
                          <span className={cn(
                            "font-bold",
                            result.priceChange24h >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                          )}>
                            {result.priceChange24h >= 0 ? "+" : ""}{result.priceChange24h.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-mono text-white">${result.price.toFixed(result.price < 0.01 ? 8 : 4)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.length >= 2 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  {query.length >= 32 ? (
                    <button 
                      onClick={() => { router.push(`/trade/${query}`); setShowResults(false); }}
                      className="text-[#02c076] hover:underline"
                    >
                      Go to token: {query.slice(0, 8)}...{query.slice(-4)}
                    </button>
                  ) : (
                    "No tokens found"
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-2">
        <NavLinks />

        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-[#1e2329] rounded-lg border border-transparent hover:border-[#2b3139] transition-colors">
          <div className="w-2 h-2 rounded-full bg-[#02c076] animate-pulse shadow-[0_0_8px_rgba(2,192,118,0.5)]" />
          <span className="text-xs font-bold text-white font-mono">
            ${solPrice > 0 ? solPrice.toFixed(2) : "---"}
          </span>
        </div>
        
        <WalletButton />

        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <button className="lg:hidden p-2 bg-[#1e2329] hover:bg-[#2b3139] rounded-lg transition-colors border border-[#2b3139]">
              <Menu className="w-5 h-5 text-white" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-[#0d1117] border-l border-[#1e2329] p-0 w-[280px]">
            <SheetHeader className="p-6 border-b border-[#1e2329]">
              <SheetTitle className="text-white flex items-center gap-2">
                <img src="/logo.png" alt="Flip Finance" className="w-6 h-6" />
                Menu
              </SheetTitle>
            </SheetHeader>
            <div className="p-4 space-y-6">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">Navigation</p>
                <NavLinks mobile />
              </div>
              
              <div className="pt-6 border-t border-[#1e2329] space-y-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">Market Info</p>
                <div className="flex items-center justify-between px-3 py-2 bg-[#1e2329] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#02c076]" />
                    <span className="text-xs text-gray-400">Solana Price</span>
                  </div>
                  <span className="text-sm font-bold text-white font-mono">${solPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
