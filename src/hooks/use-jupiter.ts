"use client";

import { useState, useCallback } from "react";
import { 
  Connection, 
  VersionedTransaction, 
} from "@solana/web3.js";
import { useWallet } from "@/lib/wallet-context";

const PLATFORM_FEE_BPS = 50;

async function confirmTransactionWithRetry(
  connection: Connection,
  signature: string,
  maxRetries = 30,
  intervalMs = 2000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const status = await connection.getSignatureStatus(signature);
    
    if (status.value?.confirmationStatus === "confirmed" || 
        status.value?.confirmationStatus === "finalized") {
      if (status.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
      }
      return true;
    }
    
    if (status.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error("Transaction confirmation timeout - check your wallet for status");
}

export function useJupiter() {
  const { wallet, publicKey, refreshBalance } = useWallet();
  const [loading, setLoading] = useState(false);

  const getQuote = useCallback(async (
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps = 2500
  ) => {
    try {
      if (amount <= 0) {
        return { error: "Amount must be greater than 0" };
      }

      const response = await fetch("/api/jupiter/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputMint,
          outputMint,
          amount: Math.floor(amount),
          slippageBps,
        }),
      });

      const data = await response.json();
      
      console.log("Jupiter quote response:", data);

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
  }, []);

  const swap = useCallback(async (quoteResponse: any) => {
    if (!wallet || !publicKey) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    try {
      const response = await fetch("/api/jupiter/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: publicKey,
        }),
      });

      const swapData = await response.json();
      console.log("Jupiter swap response:", swapData);
      
      if (swapData.error) {
        throw new Error(swapData.error);
      }

      if (!swapData.swapTransaction) {
        throw new Error("No swap transaction returned");
      }

      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, "base64");
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      transaction.sign([wallet]);

        const signature = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: true,
          maxRetries: 2,
        });

      console.log("Transaction sent:", signature);

      await confirmTransactionWithRetry(connection, signature);

      refreshBalance();
      return signature;
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
