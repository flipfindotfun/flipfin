"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { Token, Position, Trade, SmartWallet, WalletState } from "@/lib/types";
import { useTokenData } from "@/hooks/use-token-data";

interface AppContextType {
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  selectedToken: Token | null;
  setSelectedToken: (token: Token | null) => void;
  trades: Trade[];
  addTrade: (trade: Trade) => void;
  positions: Position[];
  setPositions: (positions: Position[]) => void;
  smartWallets: SmartWallet[];
  setSmartWallets: (wallets: SmartWallet[]) => void;
  toggleFollowWallet: (address: string) => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  solPrice: number;
  prefetchSecurity: (address: string) => void;
}

interface AppSettings {
  buyAmountSOL: number;
  slippagePercent: number;
  autoSellEnabled: boolean;
  profitTarget: number;
  stopLoss: number;
  priorityFee: number;
}

const defaultSettings: AppSettings = {
  buyAmountSOL: 0.1,
  slippagePercent: 15,
  autoSellEnabled: true,
  profitTarget: 100,
  stopLoss: 50,
  priorityFee: 0.001,
};

const AppContext = createContext<AppContextType | null>(null);

const DEXSCREENER_API = "https://api.dexscreener.com";

export function AppProvider({ children }: { children: ReactNode }) {
  const { 
    tokens: fetchedTokens, 
    loading, 
    loadingMore, 
    hasMore, 
    loadMore, 
    refetch 
  } = useTokenData();

  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [smartWallets, setSmartWallets] = useState<SmartWallet[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [solPrice, setSolPrice] = useState(0);
  const securityCache = useRef<Map<string, any>>(new Map());

  // Prefetch security data
  const prefetchSecurity = useCallback(async (address: string) => {
    if (securityCache.current.has(address)) return;
    
    // Mark as fetching to avoid duplicate calls
    securityCache.current.set(address, { loading: true });
    
    try {
      const response = await fetch(`/api/token/security?address=${address}`);
      const data = await response.json();
      if (data.success) {
        securityCache.current.set(address, data.security);
        
        // If this token is currently selected, update it immediately
        setSelectedToken(prev => 
          prev && prev.address === address ? { ...prev, security: data.security } : prev
        );
      }
    } catch (err) {
      console.error("Error prefetching security:", err);
      securityCache.current.delete(address);
    }
  }, []);

  // Sync tokens from hook to local state if needed or just use hook directly
  useEffect(() => {
    setTokens(fetchedTokens);
  }, [fetchedTokens]);

  const addTrade = useCallback((trade: Trade) => {
    setTrades((prev) => [trade, ...prev].slice(0, 50));
  }, []);

  const toggleFollowWallet = useCallback((address: string) => {
    setSmartWallets((prev) =>
      prev.map((w) =>
        w.address === address ? { ...w, following: !w.following } : w
      )
    );
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const fetchSolPrice = async () => {
    try {
      const response = await fetch(
        `${DEXSCREENER_API}/latest/dex/tokens/So11111111111111111111111111111111111111112`
      );
      const data = await response.json();
      if (data.pairs && data.pairs.length > 0) {
        setSolPrice(parseFloat(data.pairs[0].priceUsd) || 0);
      }
    } catch (err) {
      console.error("Error fetching SOL price:", err);
    }
  };

  useEffect(() => {
    fetchSolPrice();
    const priceInterval = setInterval(fetchSolPrice, 10000);
    return () => clearInterval(priceInterval);
  }, []);

  useEffect(() => {
    if (selectedToken && !selectedToken.security) {
      // Check cache first
      const cached = securityCache.current.get(selectedToken.address);
      if (cached && !cached.loading) {
        setSelectedToken(prev => prev ? { ...prev, security: cached } : null);
        return;
      }
      
      // If not in cache or still loading, the fetch logic in prefetchSecurity 
      // will handle updating the selected token when it finishes.
      // If it's not even in cache, start prefetching now.
      if (!cached) {
        prefetchSecurity(selectedToken.address);
      }
    }
  }, [selectedToken?.address, prefetchSecurity]);

  return (
    <AppContext.Provider
      value={{
        tokens,
        setTokens,
        selectedToken,
        setSelectedToken,
        trades,
        addTrade,
        positions,
        setPositions,
        smartWallets,
        setSmartWallets,
        toggleFollowWallet,
        settings,
        updateSettings,
        loading,
        loadingMore,
        hasMore,
        loadMore,
        solPrice,
        prefetchSecurity,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
