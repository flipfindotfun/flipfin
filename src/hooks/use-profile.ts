"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import { toast } from "sonner";

export interface Profile {
  wallet_address: string;
  referral_code: string;
  referred_by: string | null;
  total_points: number;
  total_volume: number;
  referral_count: number;
}

export interface Favorite {
  token_address: string;
  symbol: string;
  name: string;
  image_url: string;
}

export function useProfile() {
  const { publicKey } = useWallet();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!publicKey) return;
    try {
      const res = await fetch(`/api/user/profile?wallet=${publicKey}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, [publicKey]);

  const fetchFavorites = useCallback(async () => {
    if (!publicKey) return;
    try {
      const res = await fetch(`/api/favorites?wallet=${publicKey}`);
      const data = await res.json();
      if (!data.error) {
        setFavorites(data.map((f: any) => ({
          token_address: f.token_address,
          symbol: f.symbol,
          name: f.name,
          image_url: f.image_url
        })));
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
    }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) {
      fetchProfile();
      fetchFavorites();
    } else {
      setProfile(null);
      setFavorites([]);
    }
  }, [publicKey, fetchProfile, fetchFavorites]);

  const toggleFavorite = async (token: { address: string; symbol: string; name: string; logoURI?: string }) => {
    if (!publicKey) {
      toast.error("Please connect wallet first");
      return;
    }

    const isFavorite = favorites.some(f => f.token_address === token.address);

    try {
      if (isFavorite) {
        const res = await fetch(`/api/favorites?wallet=${publicKey}&tokenAddress=${token.address}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setFavorites(prev => prev.filter(f => f.token_address !== token.address));
          toast.success("Removed from favorites");
        }
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: publicKey,
            tokenAddress: token.address,
            symbol: token.symbol,
            name: token.name,
            imageUrl: token.logoURI
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setFavorites(prev => [{
            token_address: data.token_address,
            symbol: data.symbol,
            name: data.name,
            image_url: data.image_url
          }, ...prev]);
          toast.success("Added to favorites");
        }
      }
    } catch (err) {
      toast.error("Failed to update favorites");
    }
  };

  const addPoints = async (amount: number, type: string, description: string) => {
    if (!publicKey) return;
    try {
      const res = await fetch("/api/points/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey, amount, type, description }),
      });
      if (res.ok) {
        fetchProfile();
      }
    } catch (err) {
      console.error("Error adding points:", err);
    }
  };

  return {
    profile,
    favorites,
    loading,
    toggleFavorite,
    addPoints,
    refreshProfile: fetchProfile
  };
}
