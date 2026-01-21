"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Token } from "@/lib/types";

const DEXSCREENER_API = "https://api.dexscreener.com";

interface DexToken {
  chainId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  volume: {
    h24: number;
  };
  liquidity: {
    usd: number;
  };
  fdv: number;
  pairCreatedAt: number;
  info?: {
    imageUrl?: string;
  };
}

export function useTokenData() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const tokenMapRef = useRef<Map<string, Token>>(new Map());
  const isInitialLoad = useRef(true);

  const fetchTokenDetails = async (addresses: string[]): Promise<Token[]> => {
    if (addresses.length === 0) return [];
    try {
      const addressString = addresses.slice(0, 30).join(",");
      const response = await fetch(
        `${DEXSCREENER_API}/tokens/v1/solana/${addressString}`
      );
      const pairs: DexToken[] = await response.json();
      
      if (Array.isArray(pairs)) {
        const localMap = new Map<string, Token>();
        
        pairs.forEach((pair) => {
          if (pair.chainId !== "solana") return;
          
          const liquidity = pair.liquidity?.usd || 0;
          const existing = localMap.get(pair.baseToken.address);
          
          if (!existing || liquidity > existing.liquidity) {
            localMap.set(pair.baseToken.address, {
              address: pair.baseToken.address,
              symbol: pair.baseToken.symbol,
              name: pair.baseToken.name,
              decimals: 9,
              price: parseFloat(pair.priceUsd) || 0,
              priceChange24h: pair.priceChange?.h24 || 0,
              volume24h: pair.volume?.h24 || 0,
              liquidity: liquidity,
              marketCap: pair.fdv || 0,
              createdAt: pair.pairCreatedAt,
              platform: pair.pairAddress.toLowerCase().includes('pump') ? "pumpfun" : "raydium",
              logoURI: pair.info?.imageUrl,
            });
          }
        });
        return Array.from(localMap.values());
      }
      return [];
    } catch (err) {
      console.error("Error fetching token details:", err);
      return [];
    }
  };

  const loadInitialData = useCallback(async () => {
    if (isInitialLoad.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const allTokens: Token[] = [];

      // 1. Fetch latest token profiles from DexScreener
      const latestRes = await fetch(`${DEXSCREENER_API}/token-profiles/latest/v1`);
      const latestProfiles = await latestRes.json();
      
      if (Array.isArray(latestProfiles)) {
        const solanaAddresses = latestProfiles
          .filter((t: any) => t.chainId === "solana")
          .map((t: any) => t.tokenAddress);
        
        if (solanaAddresses.length > 0) {
          const latestDetails = await fetchTokenDetails(solanaAddresses);
          allTokens.push(...latestDetails);
        }
      }

      // 2. Fetch boosted tokens
      const boostRes = await fetch(`${DEXSCREENER_API}/token-boosts/latest/v1`);
      const boostData = await boostRes.json();
      
      if (Array.isArray(boostData)) {
        const boostAddresses = boostData
          .filter((t: any) => t.chainId === "solana")
          .map((t: any) => t.tokenAddress)
          .filter(addr => !allTokens.find(t => t.address === addr));
        
        if (boostAddresses.length > 0) {
          const boostDetails = await fetchTokenDetails(boostAddresses);
          allTokens.push(...boostDetails);
        }
      }

      // 3. Also try to get trending from our API (Birdeye)
      try {
        const trendingRes = await fetch("/api/trending");
        const trendingData = await trendingRes.json();
        
        if (trendingData.tokens && Array.isArray(trendingData.tokens)) {
          trendingData.tokens.forEach((t: Token) => {
            if (!allTokens.find(existing => existing.address === t.address)) {
              allTokens.push(t);
            }
          });
        }
      } catch (e) {
        console.log("Trending API unavailable, continuing with DexScreener data");
      }

      // Sort by creation time (newest first) for "New" category
      const sortedTokens = allTokens.sort((a, b) => {
        const aTime = a.createdAt || 0;
        const bTime = b.createdAt || 0;
        return bTime - aTime;
      });

      // Update map
      sortedTokens.forEach(t => tokenMapRef.current.set(t.address, t));
      
      setTokens(sortedTokens);
      setHasMore(sortedTokens.length >= 20);
      
    } catch (err) {
      console.error("Load error:", err);
      setError("Failed to load tokens");
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    
    try {
      // Fetch more from boosted or search for popular terms
      const searchTerms = ["sol", "meme", "dog", "cat", "pepe", "ai"];
      const term = searchTerms[page % searchTerms.length];
      
      const response = await fetch(`${DEXSCREENER_API}/latest/dex/search?q=${term}`);
      const data = await response.json();
      
      if (data.pairs && Array.isArray(data.pairs)) {
        const newTokens: Token[] = [];
        const tokenMap = new Map<string, Token>();

        data.pairs
          .filter((p: DexToken) => p.chainId === "solana")
          .forEach((pair: DexToken) => {
            if (tokenMapRef.current.has(pair.baseToken.address)) return;
            
            const existing = tokenMap.get(pair.baseToken.address);
            const liquidity = pair.liquidity?.usd || 0;
            
            if (!existing || liquidity > existing.liquidity) {
              tokenMap.set(pair.baseToken.address, {
                address: pair.baseToken.address,
                symbol: pair.baseToken.symbol,
                name: pair.baseToken.name,
                decimals: 9,
                price: parseFloat(pair.priceUsd) || 0,
                priceChange24h: pair.priceChange?.h24 || 0,
                volume24h: pair.volume?.h24 || 0,
                liquidity: liquidity,
                marketCap: pair.fdv || 0,
                createdAt: pair.pairCreatedAt,
                platform: pair.pairAddress.toLowerCase().includes('pump') ? "pumpfun" : "raydium",
                logoURI: pair.info?.imageUrl,
              });
            }
          });

        Array.from(tokenMap.values()).forEach(t => {
          tokenMapRef.current.set(t.address, t);
          newTokens.push(t);
        });

        if (newTokens.length > 0) {
          setTokens(Array.from(tokenMapRef.current.values()));
          setPage(prev => prev + 1);
        } else {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page]);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

    // Refresh every 60 seconds for live data (less aggressive to prevent disruption)
    useEffect(() => {
      const interval = setInterval(() => {
        loadInitialData();
      }, 60000);
      return () => clearInterval(interval);
    }, [loadInitialData]);

  return { tokens, loading, loadingMore, error, hasMore, loadMore, refetch: loadInitialData };
}

export function useTokenSearch(query: string) {
  const [results, setResults] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${DEXSCREENER_API}/latest/dex/search?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        
        if (data.pairs && Array.isArray(data.pairs)) {
          const tokenMap = new Map<string, Token>();
          
          data.pairs
            .filter((p: DexToken) => p.chainId === "solana")
            .forEach((pair: DexToken) => {
              const existing = tokenMap.get(pair.baseToken.address);
              const liquidity = pair.liquidity?.usd || 0;
              
              if (!existing || liquidity > existing.liquidity) {
                tokenMap.set(pair.baseToken.address, {
                  address: pair.baseToken.address,
                  symbol: pair.baseToken.symbol,
                  name: pair.baseToken.name,
                  decimals: 9,
                  price: parseFloat(pair.priceUsd) || 0,
                  priceChange24h: pair.priceChange?.h24 || 0,
                  volume24h: pair.volume?.h24 || 0,
                  liquidity: liquidity,
                  marketCap: pair.fdv || 0,
                  createdAt: pair.pairCreatedAt,
                  platform: pair.pairAddress.toLowerCase().includes('pump') ? "pumpfun" : "raydium",
                  logoURI: pair.info?.imageUrl,
                });
              }
            });
          
          setResults(Array.from(tokenMap.values()));
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return { results, loading };
}
