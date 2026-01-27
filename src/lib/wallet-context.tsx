"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { toast } from 'sonner';

interface WalletContextType {
  wallet: Keypair | null;
  publicKey: string | null;
  balance: number;
  isLoading: boolean;
  generateWallet: () => void;
  importWallet: (privateKey: string) => boolean;
  exportPrivateKey: () => string | null;
  refreshBalance: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Singleton connection to avoid multiple instances
export const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});

// Helper for RPC calls with basic retry logic
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes('429') || err.toString().includes('429')) {
        // Exponential backoff with jitter
        const delay = Math.pow(3, i) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Keypair | null>(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (wallet) {
      const pk = wallet.publicKey.toBase58();
      const ref = typeof window !== 'undefined' ? localStorage.getItem('orchids_ref') : null;
      
      fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: pk, referredBy: ref })
      }).catch(err => console.error('Error registering profile:', err));
    }
  }, [wallet, mounted]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedKey = localStorage.getItem('solana_private_key');
    if (storedKey) {
      try {
        const secretKey = bs58.decode(storedKey);
        const keypair = Keypair.fromSecretKey(secretKey);
        setWallet(keypair);
      } catch (error) {
        console.error('Failed to load wallet:', error);
        localStorage.removeItem('solana_private_key');
      }
    }
    setIsLoading(false);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    try {
      // Only fetch if tab is visible
      if (document.visibilityState !== 'visible') return;
      
      const bal = await withRetry(() => connection.getBalance(wallet.publicKey));
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [wallet]);

  useEffect(() => {
    if (wallet) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 60000); // Increased to 60s
      return () => clearInterval(interval);
    }
  }, [wallet, refreshBalance]);

  const generateWallet = () => {
    const newKeypair = Keypair.generate();
    const privateKey = bs58.encode(newKeypair.secretKey);
    localStorage.setItem('solana_private_key', privateKey);
    setWallet(newKeypair);
    toast.success('New wallet generated!');
  };

  const importWallet = (privateKey: string): boolean => {
    try {
      const secretKey = bs58.decode(privateKey);
      if (secretKey.length !== 64) throw new Error('Invalid private key length');
      const keypair = Keypair.fromSecretKey(secretKey);
      localStorage.setItem('solana_private_key', privateKey);
      setWallet(keypair);
      toast.success('Wallet imported successfully!');
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Invalid private key format');
      return false;
    }
  };

  const exportPrivateKey = () => {
    if (!wallet) return null;
    return bs58.encode(wallet.secretKey);
  };

  const disconnectWallet = () => {
    localStorage.removeItem('solana_private_key');
    setWallet(null);
    setBalance(0);
    toast.info('Wallet disconnected');
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        publicKey: wallet?.publicKey.toBase58() || null,
        balance,
        isLoading,
        generateWallet,
        importWallet,
        exportPrivateKey,
        refreshBalance,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
