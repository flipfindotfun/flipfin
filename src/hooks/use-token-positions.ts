"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet, connection, withRetry } from "@/lib/wallet-context";

const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export interface TokenPosition {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  uiBalance: number;
  price: number;
  value: number;
  priceChange24h: number;
  logoURI?: string;
}

export function useTokenPositions() {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<TokenPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!publicKey) {
      setPositions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      
      if (heliusApiKey) {
        const response = await withRetry(() => fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'holdings',
            method: 'getAssetsByOwner',
            params: {
              ownerAddress: publicKey,
              page: 1,
              limit: 100,
              displayOptions: {
                showFungible: true,
                showNativeBalance: false,
              },
            },
          }),
        }));

        const data = await response.json();
        
        if (data.result?.items) {
          const fungibleTokens = data.result.items.filter(
            (item: any) => item.interface === 'FungibleToken' || item.interface === 'FungibleAsset'
          );

          const mints = fungibleTokens.map((t: any) => t.id);
          const priceData = await fetchTokenData(mints);

            const positionsWithPrices: TokenPosition[] = fungibleTokens.map((token: any) => {
              const mint = token.id;
              const data = priceData.get(mint);
              const balance = token.token_info?.balance || 0;
              const decimals = token.token_info?.decimals || 9;
              const uiBalance = balance / Math.pow(10, decimals);

              const heliusImage = token.content?.links?.image;
              const dexImage = data?.logoURI;
              const fallbackImage = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;
              
              return {
                mint,
                symbol: token.content?.metadata?.symbol || data?.symbol || mint.slice(0, 4) + "...",
                name: token.content?.metadata?.name || data?.name || "Unknown Token",
                balance,
                decimals,
                uiBalance,
                price: data?.price || 0,
                value: uiBalance * (data?.price || 0),
                priceChange24h: data?.priceChange24h || 0,
                logoURI: heliusImage || dexImage || fallbackImage,
              };
            });

          const sortedPositions = positionsWithPrices
            .filter(p => p.uiBalance > 0)
            .sort((a, b) => b.value - a.value);

          setPositions(sortedPositions);
          setLoading(false);
          return;
        }
      }

      const tokenAccounts = await withRetry(() => connection.getParsedTokenAccountsByOwner(
        new PublicKey(publicKey),
        { programId: new PublicKey(TOKEN_PROGRAM_ID) }
      ));

      const nonZeroAccounts = tokenAccounts.value.filter(
        (account) => {
          const amount = account.account.data.parsed.info.tokenAmount;
          return amount.uiAmount > 0;
        }
      );

      if (nonZeroAccounts.length === 0) {
        setPositions([]);
        setLoading(false);
        return;
      }

      const mints = nonZeroAccounts.map(
        (acc) => acc.account.data.parsed.info.mint
      );

      const tokenData = await fetchTokenData(mints);

      const positionsWithPrices: TokenPosition[] = nonZeroAccounts.map((account) => {
        const info = account.account.data.parsed.info;
        const mint = info.mint;
        const tokenAmount = info.tokenAmount;
        const data = tokenData.get(mint);

        return {
          mint,
          symbol: data?.symbol || mint.slice(0, 4) + "...",
          name: data?.name || "Unknown Token",
          balance: parseInt(tokenAmount.amount),
          decimals: tokenAmount.decimals,
          uiBalance: tokenAmount.uiAmount,
          price: data?.price || 0,
          value: tokenAmount.uiAmount * (data?.price || 0),
          priceChange24h: data?.priceChange24h || 0,
          logoURI: data?.logoURI || `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`,
        };
      });

      const sortedPositions = positionsWithPrices
        .sort((a, b) => b.value - a.value);

      setPositions(sortedPositions);
    } catch (err: any) {
      console.error("Error fetching positions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  useEffect(() => {
    if (!publicKey) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPositions();
      }
    }, 120000); // Increased to 120s
    return () => clearInterval(interval);
  }, [publicKey, fetchPositions]);

  return { positions, loading, error, refetch: fetchPositions };
}

async function fetchTokenData(mints: string[]): Promise<Map<string, {
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  logoURI?: string;
}>> {
  const dataMap = new Map();

  if (mints.length === 0) return dataMap;

    try {
      const batchSize = 30;
      for (let i = 0; i < mints.length; i += batchSize) {
        const batch = mints.slice(i, i + batchSize);
        const mintString = batch.join(",");

        const [dexRes, jupRes] = await Promise.all([
          withRetry(() => fetch(`https://api.dexscreener.com/tokens/v1/solana/${mintString}`)),
          withRetry(() => fetch(`https://api.jup.ag/price/v2?ids=${mintString}`))
        ]);

        const pairs = await dexRes.json();
        const jupData = await jupRes.json();

        if (Array.isArray(pairs)) {
          pairs.forEach((pair: any) => {
            if (pair.baseToken && !dataMap.has(pair.baseToken.address)) {
              dataMap.set(pair.baseToken.address, {
                symbol: pair.baseToken.symbol,
                name: pair.baseToken.name,
                price: parseFloat(pair.priceUsd) || 0,
                priceChange24h: pair.priceChange?.h24 || 0,
                logoURI: pair.info?.imageUrl,
              });
            }
          });
        }

        // Fill in missing prices from Jupiter
        batch.forEach(mint => {
          if (!dataMap.has(mint) || dataMap.get(mint).price === 0) {
            const priceInfo = jupData.data?.[mint];
            if (priceInfo) {
              const existing = dataMap.get(mint);
              dataMap.set(mint, {
                symbol: existing?.symbol || "Unknown",
                name: existing?.name || "Unknown Token",
                price: parseFloat(priceInfo.price) || 0,
                priceChange24h: existing?.priceChange24h || 0,
                logoURI: existing?.logoURI,
              });
            }
          }
        });
      }
    } catch (err) {
    console.error("Error fetching token data:", err);
  }

  return dataMap;
}

export function useTokenPosition(tokenMint: string) {
  const { publicKey } = useWallet();
  const [position, setPosition] = useState<TokenPosition | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPosition = useCallback(async () => {
    if (!publicKey || !tokenMint) {
      setPosition(null);
      return;
    }

    setLoading(true);

    try {
      const tokenAccounts = await withRetry(() => connection.getParsedTokenAccountsByOwner(
        new PublicKey(publicKey),
        { mint: new PublicKey(tokenMint) }
      ));

      if (tokenAccounts.value.length === 0) {
        setPosition(null);
        setLoading(false);
        return;
      }

      const account = tokenAccounts.value[0];
      const info = account.account.data.parsed.info;
      const tokenAmount = info.tokenAmount;

      const tokenDataMap = await fetchTokenData([tokenMint]);
      const data = tokenDataMap.get(tokenMint);

      setPosition({
        mint: tokenMint,
        symbol: data?.symbol || tokenMint.slice(0, 4) + "...",
        name: data?.name || "Unknown Token",
        balance: parseInt(tokenAmount.amount),
        decimals: tokenAmount.decimals,
        uiBalance: tokenAmount.uiAmount,
        price: data?.price || 0,
        value: tokenAmount.uiAmount * (data?.price || 0),
        priceChange24h: data?.priceChange24h || 0,
        logoURI: data?.logoURI,
      });
    } catch (err) {
      console.error("Error fetching position:", err);
      setPosition(null);
    } finally {
      setLoading(false);
    }
  }, [publicKey, tokenMint]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  useEffect(() => {
    if (!publicKey || !tokenMint) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPosition();
      }
    }, 30000); // Increased to 30s
    return () => clearInterval(interval);
  }, [publicKey, tokenMint, fetchPosition]);

  return { position, loading, refetch: fetchPosition };
}
