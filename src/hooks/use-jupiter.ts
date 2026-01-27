"use client";

import { useState, useCallback } from "react";
import { VersionedTransaction } from "@solana/web3.js";
import { useWallet } from "@/lib/wallet-context";

const PLATFORM_FEE_BPS = 50;

export function useJupiter() {
  const { wallet, publicKey, refreshBalance } = useWallet();
  const [loading, setLoading] = useState(false);

    const getQuote = useCallback(async (
      inputMint: string,
      outputMint: string,
      amount: number,
      slippageBps?: number
    ) => {
      try {
        if (amount <= 0) {
          return { error: "Amount must be greater than 0" };
        }
  
        const params = new URLSearchParams({
          inputMint,
          outputMint,
          amount: Math.floor(amount).toString(),
        });
  
        if (publicKey) {
          params.append("taker", publicKey);
        }

        if (slippageBps) {
          params.append("slippageBps", slippageBps.toString());
        }


      const response = await fetch(`/api/jupiter/quote?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      
      console.log("Jupiter Ultra order response:", data);

      if (data.error) {
        return { error: data.error };
      }

      if (!data.outAmount) {
        return { error: "No route found for this swap" };
      }

      return data;
    } catch (error: any) {
      console.error("Quote error:", error);
      return { error: error.message || "Failed to get quote" };
    }
  }, [publicKey]);

  const swap = useCallback(async (orderResponse: any) => {
    if (!wallet || !publicKey) {
      throw new Error("Wallet not connected");
    }

    if (!orderResponse.transaction) {
      throw new Error("No transaction in order response");
    }

    if (!orderResponse.requestId) {
      throw new Error("No requestId in order response");
    }

    setLoading(true);

    try {
      const txBuf = Buffer.from(orderResponse.transaction, "base64");
      const transaction = VersionedTransaction.deserialize(txBuf);
      
      transaction.sign([wallet]);
      
      const signedTx = Buffer.from(transaction.serialize()).toString("base64");

      const response = await fetch("/api/jupiter/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedTransaction: signedTx,
          requestId: orderResponse.requestId,
          walletAddress: publicKey,
          inputAmount: orderResponse.inAmount,
          outputAmount: orderResponse.outAmount,
          inputMint: orderResponse.inputMint,
          outputMint: orderResponse.outputMint,
        }),
      });

      const executeData = await response.json();
      console.log("Jupiter Ultra execute response:", executeData);
      
      if (executeData.error) {
        throw new Error(executeData.error);
      }

      if (executeData.status === "Failed") {
        throw new Error("Swap failed");
      }

      refreshBalance();
      return executeData.signature;
    } catch (error: any) {
      console.error("Swap error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet, publicKey, refreshBalance]);

  const getPrice = useCallback(async (tokenMint: string) => {
    try {
      const response = await fetch(`https://api.jup.ag/price/v2?ids=${tokenMint}`);
      const data = await response.json();
      return data.data?.[tokenMint]?.price || 0;
    } catch {
      return 0;
    }
  }, []);

  return { getQuote, swap, getPrice, loading, PLATFORM_FEE_BPS };
}
