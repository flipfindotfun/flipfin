"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { useProfile } from "@/hooks/use-profile";
import { useWallet } from "@/lib/wallet-context";
import { 
  Trophy, 
  Users, 
  Gift, 
  ChevronRight, 
  Copy, 
  Share2, 
  Star, 
  TrendingUp, 
  ShieldCheck,
  ArrowUpRight,
  Info,
  Loader2,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  Medal,
  Crown,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  points: number;
  volume: number;
}

export default function RewardsPage() {
  const { publicKey } = useWallet();
  const { profile, refreshProfile } = useProfile();
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState<"points" | "volume">("points");
  const [userRank, setUserRank] = useState<number | null>(null);
  const [editingReferralCode, setEditingReferralCode] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState("");
  const [savingReferralCode, setSavingReferralCode] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchHistory();
      fetchReferralData();
      
      const pendingRef = localStorage.getItem("pendingReferralCode");
      if (pendingRef && !referralData?.myReferral) {
        setReferralCode(pendingRef);
        localStorage.removeItem("pendingReferralCode");
      }
    }
    fetchLeaderboard();
  }, [publicKey]);

  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType]);

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/leaderboard?type=${leaderboardType}&limit=50`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      
      if (publicKey && data.leaderboard) {
        const rank = data.leaderboard.findIndex((e: LeaderboardEntry) => e.wallet === publicKey);
        setUserRank(rank >= 0 ? rank + 1 : null);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const fetchReferralData = async () => {
    if (!publicKey) return;
    setLoadingReferrals(true);
    try {
      const res = await fetch(`/api/referral?wallet=${publicKey}`);
      const data = await res.json();
      setReferralData(data);
    } catch (err) {
      console.error("Error fetching referral data:", err);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const applyReferralCode = async () => {
    if (!referralCode.trim() || !publicKey) return;
    setApplyingCode(true);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey, referralCode: referralCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Referral code applied!");
        setReferralCode("");
        refreshProfile();
        fetchReferralData();
        fetchHistory();
      } else {
        toast.error(data.error || "Failed to apply referral code");
      }
    } catch (err) {
      toast.error("Failed to apply referral code");
    } finally {
      setApplyingCode(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/points/history?wallet=${publicKey}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const copyReferral = () => {
    if (!profile?.referral_code) return;
    const url = `${window.location.origin}?ref=${profile.referral_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Referral link copied!");
  };

  const saveNewReferralCode = async () => {
    if (!newReferralCode.trim() || !publicKey) return;
    setSavingReferralCode(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey, newReferralCode: newReferralCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Referral code updated!");
        setEditingReferralCode(false);
        setNewReferralCode("");
        refreshProfile();
      } else {
        toast.error(data.error || "Failed to update referral code");
      }
    } catch (err) {
      toast.error("Failed to update referral code");
    } finally {
      setSavingReferralCode(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-y-auto">
      <Header />
      
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-20">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#02c076]/20 via-[#0d1117] to-[#0b0e11] border border-[#02c076]/20 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#02c076]/10 border border-[#02c076]/20 text-[#02c076] text-xs font-bold uppercase tracking-wider">
                  <Gift className="w-3.5 h-3.5" />
                  Airdrop Season 1
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white italic tracking-tight">
                  EARN <span className="text-[#02c076]">POINTS</span> FOR EVERY TRADE
                </h1>
                <p className="text-gray-400 text-sm sm:text-base max-w-lg">
                    Trade on Flip Finance and earn points. Airdrop coming SOON - no ETA yet. 
                    Stay updated and keep earning to maximize your allocation!
                  </p>
              </div>
            
            <div className="bg-[#1e2329]/80 backdrop-blur-sm border border-[#2b3139] rounded-2xl p-6 min-w-[200px] flex flex-col items-center justify-center text-center shadow-2xl">
              <span className="text-gray-400 text-xs font-medium uppercase mb-1">Your Total Points</span>
              <span className="text-4xl font-black text-white tabular-nums">
                {profile?.total_points ? Math.floor(profile.total_points).toLocaleString() : "0"}
              </span>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                <BarChart3 className="w-3.5 h-3.5" />
                Volume: ${profile?.total_volume ? Math.floor(profile.total_volume).toLocaleString() : "0"}
              </div>
                <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#02c076]/10 text-[#02c076] rounded-lg text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5" />
                  Rank: {userRank ? `#${userRank}` : "-"}
                </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#02c076]/5 rounded-full blur-[100px] -mr-32 -mt-32" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <RewardCard 
            icon={<TrendingUp className="text-blue-400" />}
            title="Trading Rewards"
            value="1$ = 1 Point"
            description="Earn points for every dollar traded on the platform."
          />
          <RewardCard 
            icon={<Users className="text-purple-400" />}
            title="Referral Bonus"
            value="20% Direct"
            description="Earn 20% of the points your friends earn from trading."
          />
          <RewardCard 
            icon={<ShieldCheck className="text-yellow-400" />}
            title="Downline Bonus"
            value="5% Indirect"
            description="Earn 5% of the points from your friends' referrals (Level 2)."
          />
        </div>

          {/* Apply Referral Code */}
          {!referralData?.myReferral && publicKey && (
            <Card className="bg-[#14191f] border-[#1e2329] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Gift className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Have a Referral Code?</h2>
                  <p className="text-xs text-gray-500">Enter a referral code to get 20 bonus points instantly!</p>
                </div>
              </div>
              <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Enter referral code"
                    className="flex-1 bg-[#0b0e11] border border-[#1e2329] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#02c076]"
                  />
                <Button 
                  onClick={applyReferralCode}
                  disabled={!referralCode.trim() || applyingCode}
                  className="bg-[#02c076] hover:bg-[#02a566] text-black font-bold px-6"
                >
                  {applyingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            </Card>
          )}

          {/* Already Applied Code Status */}
          {referralData?.myReferral && (
            <Card className="bg-[#14191f] border-[#1e2329] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    referralData.myReferral.status === "validated" ? "bg-[#02c076]/10" : "bg-yellow-500/10"
                  )}>
                    {referralData.myReferral.status === "validated" ? (
                      <CheckCircle className="w-5 h-5 text-[#02c076]" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Referral Status</h2>
                    <p className="text-xs text-gray-500">
                      {referralData.myReferral.status === "validated" 
                        ? "Your referral is validated! Referrer earned 30 points." 
                        : `Trade $${Math.max(0, 50 - (referralData.myReferral.referee_volume || 0)).toFixed(0)} more to validate`}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  referralData.myReferral.status === "validated" 
                    ? "bg-[#02c076]/10 text-[#02c076]" 
                    : "bg-yellow-500/10 text-yellow-500"
                )}>
                  {referralData.myReferral.status}
                </div>
              </div>
              {referralData.myReferral.status === "pending" && (
                <div className="mt-4 bg-[#0b0e11] rounded-lg p-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Volume Progress</span>
                    <span className="text-white font-bold">${referralData.myReferral.referee_volume || 0} / $50</span>
                  </div>
                  <div className="h-2 bg-[#1e2329] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#02c076] to-[#02a566] transition-all"
                      style={{ width: `${Math.min(100, ((referralData.myReferral.referee_volume || 0) / 50) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Referral Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#14191f] border-[#1e2329] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#02c076]" />
                  Your Referral Link
                </h2>
                <div className="text-xs text-gray-500">
                  Validated: <span className="text-[#02c076] font-bold">{referralData?.stats?.validated || 0}</span> / {referralData?.stats?.total || 0}
                </div>
              </div>

<div className="space-y-3">
                  <p className="text-sm text-gray-400">Share your referral link. Get 30 points when they reach $50 volume!</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#0b0e11] border border-[#1e2329] rounded-lg px-3 py-2 text-xs font-mono text-gray-400 truncate flex items-center">
                      {profile ? `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${profile.referral_code}` : "Generate wallet to see link"}
                    </div>
                    <Button 
                      onClick={copyReferral}
                      disabled={!profile}
                      size="sm"
                      className="bg-[#02c076] hover:bg-[#02a566] text-black font-bold h-9"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {profile && !profile.referral_code_changed_at && (
                    <div className="pt-2">
                      {!editingReferralCode ? (
                        <button
                          onClick={() => setEditingReferralCode(true)}
                          className="text-xs text-[#02c076] hover:underline"
                        >
                          Customize your referral code (one-time only)
                        </button>
                      ) : (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newReferralCode}
                                onChange={(e) => setNewReferralCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12))}
                                placeholder="Enter custom code (4-12 chars)"
                                className="flex-1 bg-[#0b0e11] border border-[#1e2329] rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#02c076]"
                              />
                            <Button 
                              onClick={saveNewReferralCode}
                              disabled={newReferralCode.length < 4 || savingReferralCode}
                              size="sm"
                              className="bg-[#02c076] hover:bg-[#02a566] text-black font-bold h-9"
                            >
                              {savingReferralCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                            </Button>
                            <Button 
                              onClick={() => { setEditingReferralCode(false); setNewReferralCode(""); }}
                              size="sm"
                              variant="outline"
                              className="border-[#1e2329] text-gray-400 h-9"
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="text-[10px] text-yellow-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Warning: You can only change your referral code once!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {profile?.referral_code_changed_at && (
                    <p className="text-[10px] text-gray-500">Referral code already customized</p>
                  )}
                </div>

              {/* Referrals List */}
              {referralData?.referrals && referralData.referrals.length > 0 && (
                <div className="pt-4 border-t border-[#1e2329] space-y-2">
                  <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Your Referrals</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {referralData.referrals.map((ref: any) => (
                      <div key={ref.id} className="flex items-center justify-between bg-[#0b0e11] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          {ref.status === "validated" ? (
                            <CheckCircle className="w-4 h-4 text-[#02c076]" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className="text-xs text-gray-400 font-mono">
                            {ref.referee_wallet.slice(0, 4)}...{ref.referee_wallet.slice(-4)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-xs font-bold",
                            ref.status === "validated" ? "text-[#02c076]" : "text-yellow-500"
                          )}>
                            ${ref.referee_volume || 0}
                          </span>
                          <span className="text-[10px] text-gray-600"> / $50</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[#1e2329]">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Info className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white italic uppercase tracking-wider">How it works</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      1. Share your link - referee gets 20 points instantly<br/>
                      2. Referee trades $50+ volume - you get 30 points<br/>
                      3. Earn 20% of their trading points forever!
                    </p>
                  </div>
                </div>
              </div>
            </Card>

          <Card className="bg-[#14191f] border-[#1e2329] flex flex-col">
            <div className="p-6 border-b border-[#1e2329] flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Recent Activity
              </h2>
              <button onClick={fetchHistory} className="text-gray-500 hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 min-h-[300px] overflow-y-auto">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-[#02c076]" />
                </div>
              ) : history.length > 0 ? (
                <div className="divide-y divide-[#1e2329]">
                  {history.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-[#1e2329]/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs",
                          item.type === 'trade' ? "bg-blue-500/10 text-blue-400" : "bg-[#02c076]/10 text-[#02c076]"
                        )}>
                          {item.type === 'trade' ? <TrendingUp className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{item.description}</p>
                          <p className="text-[10px] text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-[#02c076]">+{Math.floor(item.amount)}</p>
                        <p className="text-[9px] text-gray-500 uppercase font-medium">Points</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2">
                  <Gift className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No activity yet. Start trading!</p>
                </div>
              )}
            </div>
            </Card>
          </div>

          {/* Leaderboard Section */}
          <Card className="bg-[#14191f] border-[#1e2329]">
            <div className="p-6 border-b border-[#1e2329]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Leaderboard
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLeaderboardType("points")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
                      leaderboardType === "points"
                        ? "bg-[#02c076] text-black"
                        : "bg-[#1e2329] text-gray-400 hover:text-white"
                    )}
                  >
                    Points
                  </button>
                  <button
                    onClick={() => setLeaderboardType("volume")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
                      leaderboardType === "volume"
                        ? "bg-[#02c076] text-black"
                        : "bg-[#1e2329] text-gray-400 hover:text-white"
                    )}
                  >
                    Volume
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loadingLeaderboard ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#02c076]" />
                </div>
              ) : leaderboard.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-[#1e2329]">
                      <th className="text-left p-4 font-medium">Rank</th>
                      <th className="text-left p-4 font-medium">Wallet</th>
                      <th className="text-right p-4 font-medium">Points</th>
                      <th className="text-right p-4 font-medium">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => {
                      const isUser = publicKey && entry.wallet === publicKey;
                      return (
                        <tr
                          key={entry.wallet}
                          className={cn(
                            "border-b border-[#1e2329] hover:bg-[#1e2329]/50 transition-colors",
                            isUser && "bg-[#02c076]/5"
                          )}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {entry.rank === 1 && (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                                  <Crown className="w-4 h-4 text-white" />
                                </div>
                              )}
                              {entry.rank === 2 && (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                                  <Medal className="w-4 h-4 text-white" />
                                </div>
                              )}
                              {entry.rank === 3 && (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                                  <Medal className="w-4 h-4 text-white" />
                                </div>
                              )}
                              {entry.rank > 3 && (
                                <span className="w-7 h-7 flex items-center justify-center text-sm font-bold text-gray-400">
                                  {entry.rank}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-mono",
                                isUser ? "text-[#02c076] font-bold" : "text-gray-300"
                              )}>
                                {entry.wallet.slice(0, 4)}...{entry.wallet.slice(-4)}
                              </span>
                              {isUser && (
                                <span className="px-1.5 py-0.5 bg-[#02c076]/10 text-[#02c076] text-[10px] font-bold rounded">
                                  YOU
                                </span>
                              )}
                              {entry.rank <= 3 && (
                                <Flame className="w-4 h-4 text-orange-500" />
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className={cn(
                              "text-sm font-bold tabular-nums",
                              entry.rank <= 3 ? "text-[#02c076]" : "text-white"
                            )}>
                              {Math.floor(entry.points).toLocaleString()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-sm text-gray-400 tabular-nums">
                              ${Math.floor(entry.volume).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-600 space-y-2">
                  <Trophy className="w-10 h-10 opacity-20" />
                  <p className="text-sm">No traders yet. Be the first!</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
}

function RewardCard({ icon, title, value, description }: { 
  icon: React.ReactNode; 
  title: string; 
  value: string; 
  description: string;
}) {
  return (
    <Card className="bg-[#14191f] border-[#1e2329] p-5 hover:border-[#02c076]/30 transition-all group">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-[#1e2329] rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-black text-white">{value}</p>
          <p className="text-[11px] text-gray-500 leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  );
}
