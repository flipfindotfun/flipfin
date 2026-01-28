"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatPrice } from "@/lib/types";

interface TokenData {
  address: string;
  symbol: string;
  name: string;
  logoURI: string | null;
  price: number;
  priceChange24h: number;
  priceChange1h: number;
  priceChange5m: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  txns24h: number;
  buys24h: number;
  sells24h: number;
  pairAddress?: string;
}

type SortField = "price" | "priceChange24h" | "priceChange1h" | "volume24h" | "liquidity" | "marketCap" | "txns24h";
type SortDir = "asc" | "desc";

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("volume24h");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const fetchedRef = useRef(false);

  const fetchTokens = useCallback(async (refresh = false) => {
    if (!refresh && fetchedRef.current) return;
    fetchedRef.current = true;
    
    if (refresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await fetch(
        `https://api.dexscreener.com/token-profiles/latest/v1?chainId=solana&page=${page}`
      );
      
      const profiles = await res.json();
      
      const tokenAddresses = profiles.slice(0, 50).map((p: any) => p.tokenAddress).join(",");
      const pairsRes = await fetch(
        `https://api.dexscreener.com/tokens/v1/solana/${tokenAddresses}`
      );
      const pairs = await pairsRes.json();
      
      const tokenMap = new Map<string, TokenData>();
      
      if (Array.isArray(pairs)) {
        pairs.forEach((pair: any) => {
          const addr = pair.baseToken?.address;
          if (!addr) return;
          
          const existing = tokenMap.get(addr);
          const newLiquidity = pair.liquidity?.usd || 0;
          
          if (!existing || newLiquidity > (existing.liquidity || 0)) {
            tokenMap.set(addr, {
              address: addr,
              symbol: pair.baseToken.symbol,
              name: pair.baseToken.name,
              logoURI: pair.info?.imageUrl || null,
              price: parseFloat(pair.priceUsd) || 0,
              priceChange24h: pair.priceChange?.h24 || 0,
              priceChange1h: pair.priceChange?.h1 || 0,
              priceChange5m: pair.priceChange?.m5 || 0,
              volume24h: pair.volume?.h24 || 0,
              liquidity: newLiquidity,
              marketCap: pair.fdv || 0,
              txns24h: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
              buys24h: pair.txns?.h24?.buys || 0,
              sells24h: pair.txns?.h24?.sells || 0,
              pairAddress: pair.pairAddress,
            });
          }
        });
      }
      
      setTokens(Array.from(tokenMap.values()));
      setTotalPages(10);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTokens();
  }, [page]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTokens(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchTokens]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filteredTokens = tokens
    .filter((t) =>
      searchQuery
        ? t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.address.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    )
    .sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={cn(
        "flex items-center gap-1 hover:text-white transition-colors text-xs font-bold uppercase whitespace-nowrap",
        sortField === field ? "text-[#02c076]" : "text-gray-500",
        className
      )}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#0b0e11]">
      <div className="sticky top-0 z-10 bg-[#0b0e11] border-b border-[#1e2329]">
        <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Trending Tokens</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Discover trending tokens and new profiles on Solana
                </p>
              </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTokens(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e2329] hover:bg-[#2a3139] rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                Refresh
              </button>
              <a
                href="https://dexscreener.com/solana"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#1e2329] hover:bg-[#2a3139] rounded-lg text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                DexScreener
              </a>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by token name, symbol, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e2329] border border-[#2a3139] rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#02c076]"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#02c076]" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-[#0d1117] border-b border-[#1e2329]">
              <tr>
                <th className="text-left px-4 sm:px-6 py-3 text-xs font-bold uppercase text-gray-500">Token</th>
                <th className="text-right px-3 py-3 hidden md:table-cell">
                  <SortHeader field="price" label="Price" className="justify-end" />
                </th>
                <th className="text-right px-3 py-3 hidden lg:table-cell">
                  <SortHeader field="priceChange1h" label="1H" className="justify-end" />
                </th>
                <th className="text-right px-3 py-3 hidden sm:table-cell">
                  <SortHeader field="priceChange24h" label="24H" className="justify-end" />
                </th>
                <th className="text-right px-3 py-3 hidden lg:table-cell">
                  <SortHeader field="volume24h" label="Volume" className="justify-end" />
                </th>
                <th className="text-right px-3 py-3 hidden xl:table-cell">
                  <SortHeader field="liquidity" label="Liquidity" className="justify-end" />
                </th>
                <th className="text-right px-3 py-3">
                  <SortHeader field="marketCap" label="MCap" className="justify-end" />
                </th>
                <th className="text-right px-4 sm:px-6 py-3 hidden lg:table-cell">
                  <SortHeader field="txns24h" label="Txns" className="justify-end" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2329]">
              {filteredTokens.map((token) => (
                <tr key={token.address} className="hover:bg-[#1e2329]/50 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <Link href={`/trade/${token.address}`} className="flex items-center gap-3">
                      {token.logoURI ? (
                        <img
                          src={token.logoURI}
                          alt={token.symbol}
                          className="w-10 h-10 rounded-full flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#02c076]/20 flex items-center justify-center text-[#02c076] font-bold text-sm flex-shrink-0">
                          {token.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">{token.symbol}</span>
                          {token.priceChange24h > 50 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#02c076]/20 text-[#02c076] rounded flex-shrink-0">HOT</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 truncate block max-w-[150px]">{token.name}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-right hidden md:table-cell">
                    <Link href={`/trade/${token.address}`} className="font-mono text-sm text-white">
                      ${formatPrice(token.price)}
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-right hidden lg:table-cell">
                    <Link href={`/trade/${token.address}`} className={cn(
                      "text-sm font-bold inline-flex items-center gap-1 justify-end",
                      token.priceChange1h >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                    )}>
                      {token.priceChange1h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {token.priceChange1h >= 0 ? "+" : ""}{token.priceChange1h.toFixed(2)}%
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-right hidden sm:table-cell">
                    <Link href={`/trade/${token.address}`} className={cn(
                      "text-sm font-bold inline-flex items-center gap-1 justify-end",
                      token.priceChange24h >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                    )}>
                      {token.priceChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {token.priceChange24h >= 0 ? "+" : ""}{token.priceChange24h.toFixed(2)}%
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-right hidden lg:table-cell">
                    <Link href={`/trade/${token.address}`} className="text-sm text-white">
                      ${formatNumber(token.volume24h)}
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-right hidden xl:table-cell">
                    <Link href={`/trade/${token.address}`} className="text-sm text-white">
                      ${formatNumber(token.liquidity)}
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <Link href={`/trade/${token.address}`} className="text-sm text-white">
                      ${formatNumber(token.marketCap)}
                    </Link>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right hidden lg:table-cell">
                    <Link href={`/trade/${token.address}`} className="flex flex-col items-end">
                      <span className="text-xs text-white">{formatNumber(token.txns24h)}</span>
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-[#02c076]">{formatNumber(token.buys24h)}</span>
                        <span className="text-gray-500">/</span>
                        <span className="text-[#f6465d]">{formatNumber(token.sells24h)}</span>
                      </div>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {filteredTokens.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <p>No tokens found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-[#0b0e11] border-t border-[#1e2329] px-4 sm:px-6 py-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {filteredTokens.length} of {tokens.length} tokens
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
            className="p-2 bg-[#1e2329] hover:bg-[#2a3139] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-white px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || loading}
            className="p-2 bg-[#1e2329] hover:bg-[#2a3139] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
