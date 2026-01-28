"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  DollarSign,
  Activity,
  LogOut,
  RefreshCw,
  Loader2,
  BarChart3,
  Clock,
  Wallet,
  Crown,
  Terminal,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Coins,
  Trash2,
  Filter,
  Copy,
  ExternalLink,
  Plus,
  Search,
  Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { XPostGenerator } from "@/components/admin/x-post-generator";

interface DashboardData {
  stats: {
    totalUsers: number;
    totalTrades: number;
    totalVolume: number;
  };
  recentUsers: Array<{
    wallet_address: string;
    created_at: string;
    total_points: number;
    total_volume: number;
  }>;
  topTraders: Array<{
    wallet_address: string;
    total_points: number;
    total_volume: number;
  }>;
}

interface FeaturedToken {
  id: string;
  token_address: string;
  symbol: string;
  name: string;
  logo_url: string;
  featured_until: string;
  created_at: string;
  status: "active" | "queued" | "expired";
  duration_hours: number;
}

interface APIHealth {
  name: string;
  endpoint: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  error?: string;
}

interface HealthData {
  overall: "healthy" | "degraded" | "down";
  summary: { healthy: number; degraded: number; down: number };
  services: APIHealth[];
}

interface SystemLog {
  id: string;
  level: string;
  message: string;
  metadata: any;
  source: string;
  created_at: string;
}

interface FeeData {
  fees: Array<{
    id: string;
    wallet_address: string;
    fee_amount: number;
    fee_token: string;
    status: string;
    created_at: string;
    collected_at: string | null;
    tx_hash: string | null;
  }>;
  summary: {
    pendingTotal: number;
    collectedTotal: number;
    pendingCount: number;
    collectedCount: number;
    feeWallet?: string;
  };
}

type TabType = "overview" | "health" | "logs" | "fees" | "featured";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [feeData, setFeeData] = useState<FeeData | null>(null);
  const [featuredTokens, setFeaturedTokens] = useState<FeaturedToken[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [logFilter, setLogFilter] = useState("all");
  const [selectedTokenForX, setSelectedTokenForX] = useState<{
    symbol: string;
    name: string;
    logo_url: string;
    address: string;
  } | null>(null);
  const [ataInput, setAtaInput] = useState("");
  const [ataResult, setAtaResult] = useState<{ ata: string; exists: boolean; balance: string; transaction?: string } | null>(null);
  const [ataLoading, setAtaLoading] = useState(false);
  const [ataError, setAtaError] = useState("");

  const [featuredInput, setFeaturedInput] = useState({
    address: "",
    duration: "12"
  });
  const [featuredLoading, setFeaturedLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (admin) {
      if (activeTab === "overview") fetchDashboard();
      if (activeTab === "health") fetchHealth();
      if (activeTab === "logs") fetchLogs();
      if (activeTab === "fees") fetchFees();
      if (activeTab === "featured") fetchFeaturedTokens();
    }
  }, [activeTab, admin]);

  const fetchFeaturedTokens = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/featured?admin=true");
      if (res.ok) setFeaturedTokens(await res.json());
    } catch (err) {
      console.error("Featured error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const addFeaturedToken = async (status: "active" | "queued" = "active") => {
    if (!featuredInput.address) return;
    setFeaturedLoading(true);
    try {
      // First get token info from DexScreener
      const dexRes = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${featuredInput.address}`);
      const pairs = await dexRes.json();
      
      if (!Array.isArray(pairs) || pairs.length === 0) {
        alert("Token not found on DexScreener");
        return;
      }
      
      const pair = pairs[0];
      const res = await fetch("/api/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_address: featuredInput.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          logo_url: pair.info?.imageUrl,
          duration_hours: parseInt(featuredInput.duration),
          status
        })
      });

      if (res.ok) {
        setFeaturedInput({ address: "", duration: "12" });
        fetchFeaturedTokens();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add featured token");
      }
    } catch (err) {
      console.error("Add featured error:", err);
    } finally {
      setFeaturedLoading(false);
    }
  };

  const updateFeaturedTokenStatus = async (id: string, action: "activate" | "deactivate") => {
    try {
      const res = await fetch("/api/featured", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action })
      });
      if (res.ok) fetchFeaturedTokens();
    } catch (err) {
      console.error("Update featured status error:", err);
    }
  };

  const deleteFeaturedToken = async (id: string) => {
    if (!confirm("Remove this featured token?")) return;
    try {
      const res = await fetch(`/api/featured?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchFeaturedTokens();
    } catch (err) {
      console.error("Delete featured error:", err);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/auth");
      const result = await res.json();
      if (!result.authenticated) {
        router.push("/auth/admin");
        return;
      }
      setAdmin(result.admin);
      await fetchDashboard();
    } catch (err) {
      router.push("/auth/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchHealth = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) setHealthData(await res.json());
    } catch (err) {
      console.error("Health error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchLogs = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/logs?type=system&level=${logFilter}&limit=100`);
      if (res.ok) {
        const result = await res.json();
        setLogs(result.logs || []);
      }
    } catch (err) {
      console.error("Logs error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchFees = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/fees");
      if (res.ok) setFeeData(await res.json());
    } catch (err) {
      console.error("Fees error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm("Clear logs older than 7 days?")) return;
    try {
      await fetch("/api/admin/logs?type=system&days=7", { method: "DELETE" });
      fetchLogs();
    } catch (err) {
      console.error("Clear logs error:", err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/auth/admin");
  };

  const checkAta = async () => {
    if (!ataInput.trim()) return;
    setAtaLoading(true);
    setAtaError("");
    setAtaResult(null);
    try {
      const res = await fetch(`/api/admin/ata?mint=${ataInput.trim()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAtaResult(data);
    } catch (err: any) {
      setAtaError(err.message);
    } finally {
      setAtaLoading(false);
    }
  };

  const createAta = async () => {
    if (!ataInput.trim()) return;
    setAtaLoading(true);
    setAtaError("");
    try {
      const res = await fetch("/api/admin/ata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mintAddress: ataInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.alreadyExists) {
        setAtaResult({ ata: data.ata, exists: true, balance: "0" });
      } else {
        setAtaResult({ ata: data.ata, exists: false, balance: "0", transaction: data.transaction });
      }
    } catch (err: any) {
      setAtaError(err.message);
    } finally {
      setAtaLoading(false);
    }
  };

  const formatWallet = (wallet: string) => `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  const formatNumber = (num: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num);
  const formatCurrency = (num: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(num);
  const formatDate = (date: string) => new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#02c076]" />
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "health", label: "API Health", icon: Server },
    { id: "logs", label: "Console", icon: Terminal },
    { id: "fees", label: "Fees", icon: Coins },
    { id: "featured", label: "Featured", icon: Crown },
  ];

  return (
    <div className="min-h-screen bg-[#0b0e11]">
      <header className="bg-[#14191f] border-b border-[#1e2329] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#02c076] to-[#00a86b] flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white truncate">FlipFin Admin</h1>
                <p className="text-xs text-gray-500 truncate">{admin?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button onClick={() => { if (activeTab === "overview") fetchDashboard(); if (activeTab === "health") fetchHealth(); if (activeTab === "logs") fetchLogs(); if (activeTab === "fees") fetchFees(); }} disabled={refreshing} className="p-2 rounded-lg bg-[#1e2329] text-gray-400 hover:text-white transition-colors disabled:opacity-50">
                <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 pb-0 overflow-x-auto no-scrollbar">
            <div className="flex gap-1 border-b border-[#1e2329] min-w-max">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px", activeTab === tab.id ? "text-[#02c076] border-[#02c076]" : "text-gray-500 border-transparent hover:text-gray-300")}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#14191f] rounded-xl border border-[#1e2329] p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-blue-500/10"><Users className="w-6 h-6 text-blue-400" /></div>
                  <span className="text-gray-400 text-sm">Total Users</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{formatNumber(data?.stats.totalUsers || 0)}</p>
              </div>
              <div className="bg-[#14191f] rounded-xl border border-[#1e2329] p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-purple-500/10"><Activity className="w-6 h-6 text-purple-400" /></div>
                  <span className="text-gray-400 text-sm">Total Trades</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{formatNumber(data?.stats.totalTrades || 0)}</p>
              </div>
              <div className="bg-[#14191f] rounded-xl border border-[#1e2329] p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-green-500/10"><DollarSign className="w-6 h-6 text-green-400" /></div>
                  <span className="text-gray-400 text-sm">Total Volume</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{formatCurrency(data?.stats.totalVolume || 0)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#14191f] rounded-xl border border-[#1e2329] overflow-hidden">
                <div className="p-4 border-b border-[#1e2329] flex items-center gap-2"><Clock className="w-5 h-5 text-[#02c076]" /><h2 className="text-lg font-bold text-white">Recent Users</h2></div>
                <div className="divide-y divide-[#1e2329] max-h-80 overflow-y-auto">
                  {(data?.recentUsers || []).length === 0 ? <p className="p-4 text-gray-500 text-sm text-center">No users yet</p> : data?.recentUsers.map((user, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1e2329] flex items-center justify-center flex-shrink-0"><Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" /></div>
                        <div className="min-w-0">
                          <p className="font-mono text-white text-xs sm:text-sm truncate">{formatWallet(user.wallet_address)}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">{formatDate(user.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-xs sm:text-sm font-bold text-[#02c076]">{formatNumber(user.total_points)} pts</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">{formatCurrency(user.total_volume)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#14191f] rounded-xl border border-[#1e2329] overflow-hidden">
                <div className="p-4 border-b border-[#1e2329] flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-500" /><h2 className="text-lg font-bold text-white">Top Traders</h2></div>
                <div className="divide-y divide-[#1e2329] max-h-80 overflow-y-auto">
                  {(data?.topTraders || []).length === 0 ? <p className="p-4 text-gray-500 text-sm text-center">No traders yet</p> : data?.topTraders.map((trader, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0", idx === 0 ? "bg-yellow-500/20 text-yellow-400" : idx === 1 ? "bg-gray-400/20 text-gray-300" : idx === 2 ? "bg-orange-500/20 text-orange-400" : "bg-[#1e2329] text-gray-500")}>{idx + 1}</div>
                        <p className="font-mono text-white text-xs sm:text-sm truncate">{formatWallet(trader.wallet_address)}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-xs sm:text-sm font-bold text-white">{formatCurrency(trader.total_volume)}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">{formatNumber(trader.total_points)} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="bg-[#14191f] rounded-xl border border-[#1e2329] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">System Status</h2>
                {healthData && (
                  <div className={cn("px-3 py-1.5 rounded-lg text-sm font-bold", healthData.overall === "healthy" ? "bg-green-500/10 text-green-400" : healthData.overall === "degraded" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400")}>
                    {healthData.overall.toUpperCase()}
                  </div>
                )}
              </div>
              {healthData && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                    <p className="text-2xl font-bold text-green-400">{healthData.summary.healthy}</p>
                    <p className="text-xs text-gray-500">Healthy</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                    <p className="text-2xl font-bold text-yellow-400">{healthData.summary.degraded}</p>
                    <p className="text-xs text-gray-500">Degraded</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                    <p className="text-2xl font-bold text-red-400">{healthData.summary.down}</p>
                    <p className="text-xs text-gray-500">Down</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {(healthData?.services || []).map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-[#1e2329] rounded-lg">
                    <div className="flex items-center gap-3">
                      {service.status === "healthy" ? <CheckCircle className="w-5 h-5 text-green-400" /> : service.status === "degraded" ? <AlertTriangle className="w-5 h-5 text-yellow-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                      <div>
                        <p className="text-sm font-medium text-white">{service.name}</p>
                        <p className="text-xs text-gray-500 font-mono truncate max-w-xs">{service.endpoint}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold", service.status === "healthy" ? "text-green-400" : service.status === "degraded" ? "text-yellow-400" : "text-red-400")}>{service.responseTime}ms</p>
                      {service.error && <p className="text-xs text-red-400">{service.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select value={logFilter} onChange={(e) => { setLogFilter(e.target.value); }} className="bg-[#1e2329] border border-[#2a3139] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                  <option value="all">All Levels</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
                <button onClick={fetchLogs} className="px-3 py-2 bg-[#1e2329] text-gray-400 rounded-lg text-sm hover:text-white">Refresh</button>
              </div>
              <button onClick={clearLogs} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                <Trash2 className="w-4 h-4" />Clear Old
              </button>
            </div>
            <div className="bg-[#0d1117] rounded-xl border border-[#1e2329] font-mono text-sm overflow-hidden">
              <div className="p-3 bg-[#161b22] border-b border-[#1e2329] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#02c076]" />
                <span className="text-gray-400">System Console</span>
                <span className="ml-auto text-xs text-gray-600">{logs.length} entries</span>
              </div>
              <div className="h-[500px] overflow-y-auto p-4 space-y-1">
                {logs.length === 0 ? <p className="text-gray-600 text-center py-8">No logs found</p> : logs.map((log) => (
                  <div key={log.id} className="flex gap-3 py-1 hover:bg-[#1e2329]/50 px-2 rounded">
                    <span className="text-gray-600 text-xs flex-shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
                    <span className={cn("text-xs font-bold flex-shrink-0 w-12", log.level === "error" ? "text-red-400" : log.level === "warn" ? "text-yellow-400" : log.level === "info" ? "text-blue-400" : "text-gray-400")}>[{log.level.toUpperCase()}]</span>
                    <span className="text-gray-300 break-all">{log.message}</span>
                    {log.source && <span className="text-gray-600 text-xs ml-auto flex-shrink-0">({log.source})</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

          {activeTab === "fees" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-[#02c076]/10 to-[#14191f] rounded-xl border border-[#02c076]/30 p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[#02c076]/20">
                      <Coins className="w-6 h-6 text-[#02c076]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">Platform Fee: 0.5% on All Trades</h3>
                      <p className="text-sm text-gray-400 mb-3">
                        Every swap made through flipfin.fun automatically includes a 0.5% platform fee. 
                        Fees are collected in the output token of each trade via Jupiter&apos;s referral program.
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2329] rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-gray-300">Auto-collected on SOL swaps</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2329] rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-gray-300">Requires ATA for token swaps</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#14191f] rounded-xl border border-[#1e2329] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#02c076]/10">
                      <Wallet className="w-5 h-5 text-[#02c076]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Fee Collection Wallet</p>
                      <p className="text-sm font-mono text-white">{feeData?.summary.feeWallet || "Not configured"}</p>
                    </div>
                  </div>
                  {feeData?.summary.feeWallet && (
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://solscan.io/account/${feeData.summary.feeWallet}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#02c076]"
                      >
                        View on Solscan <ExternalLink className="w-3 h-3" />
                      </a>
                      <button 
                        onClick={() => navigator.clipboard.writeText(feeData.summary.feeWallet!)}
                        className="text-xs text-[#02c076] hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#14191f] rounded-xl border border-[#1e2329] p-6">
                  <p className="text-gray-500 text-sm mb-2">Recorded Swaps</p>
                  <p className="text-2xl font-bold text-white">{feeData?.summary.collectedCount || 0}</p>
                  <p className="text-xs text-gray-600">Total swaps with fees</p>
                </div>
                <div className="bg-[#14191f] rounded-xl border border-[#1e2329] p-6">
                  <p className="text-gray-500 text-sm mb-3">Claim Your Fees</p>
                  <a
                    href="https://referral.jup.ag/dashboard-ultra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[#02c076] text-black font-bold rounded-lg hover:bg-[#02a566]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Jupiter Referral Dashboard
                  </a>
                  <p className="text-xs text-gray-500 mt-2">Fees accumulate in Jupiter&apos;s referral program. Claim them there.</p>
                </div>
              </div>

              <div className="bg-[#14191f] rounded-xl border border-[#1e2329] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-5 h-5 text-[#02c076]" />
                    <h3 className="text-lg font-bold text-white">Create Token Account (ATA)</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    For token-to-token swaps (not SOL output), your fee wallet needs an Associated Token Account to receive the 0.5% fee in that token. 
                    Most users swap TO SOL, which doesn&apos;t need this. Only create ATAs for popular tokens if needed.
                  </p>
                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={ataInput}
                    onChange={(e) => setAtaInput(e.target.value)}
                    placeholder="Token mint address (e.g., EPjFW...)"
                    className="flex-1 bg-[#1e2329] border border-[#2a3139] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#02c076]"
                  />
                  <button
                    onClick={checkAta}
                    disabled={ataLoading || !ataInput.trim()}
                    className="flex items-center gap-2 px-4 py-3 bg-[#1e2329] text-white font-medium rounded-lg hover:bg-[#2a3139] disabled:opacity-50"
                  >
                    {ataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Check
                  </button>
                  <button
                    onClick={createAta}
                    disabled={ataLoading || !ataInput.trim()}
                    className="flex items-center gap-2 px-4 py-3 bg-[#02c076] text-black font-bold rounded-lg hover:bg-[#02a566] disabled:opacity-50"
                  >
                    {ataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create ATA
                  </button>
                </div>
                {ataError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                    <p className="text-sm text-red-400">{ataError}</p>
                  </div>
                )}
                {ataResult && (
                  <div className={cn("p-4 rounded-lg border", ataResult.exists ? "bg-green-500/10 border-green-500/20" : "bg-yellow-500/10 border-yellow-500/20")}>
                    <div className="flex items-center gap-2 mb-2">
                      {ataResult.exists ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      )}
                      <span className={cn("font-bold", ataResult.exists ? "text-green-400" : "text-yellow-400")}>
                        {ataResult.exists ? "ATA Exists" : "ATA Does Not Exist"}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">ATA Address:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white">{ataResult.ata}</span>
                          <button onClick={() => navigator.clipboard.writeText(ataResult.ata)} className="text-gray-500 hover:text-[#02c076]">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {ataResult.exists && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Balance:</span>
                          <span className="font-mono text-white">{ataResult.balance}</span>
                        </div>
                      )}
                      {ataResult.transaction && (
                        <div className="mt-4 p-3 bg-[#1e2329] rounded-lg">
                          <p className="text-xs text-gray-400 mb-2">Transaction ready to sign. Copy and sign with your wallet:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs text-[#02c076] break-all">{ataResult.transaction.slice(0, 60)}...</code>
                            <button onClick={() => navigator.clipboard.writeText(ataResult.transaction!)} className="flex-shrink-0 px-3 py-1.5 bg-[#02c076] text-black text-xs font-bold rounded hover:bg-[#02a566]">
                              Copy TX
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#14191f] rounded-xl border border-[#1e2329]">
                <div className="p-4 border-b border-[#1e2329] flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Swap History</h2>
                  <p className="text-xs text-gray-500">Recorded swaps with 0.5% fee</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-[#1e2329]">
                        <th className="text-left p-4 font-medium">Wallet</th>
                        <th className="text-right p-4 font-medium">Est. Fee</th>
                        <th className="text-center p-4 font-medium">Transaction</th>
                        <th className="text-right p-4 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(feeData?.fees || []).length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">No swaps recorded yet</td></tr>
                      ) : feeData?.fees.map((fee) => (
                        <tr key={fee.id} className="border-b border-[#1e2329] hover:bg-[#1e2329]/50">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-white">{formatWallet(fee.wallet_address)}</span>
                              <button onClick={() => navigator.clipboard.writeText(fee.wallet_address)} className="text-gray-500 hover:text-[#02c076]" title="Copy wallet address">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-right text-sm font-bold text-white">{Number(fee.fee_amount).toFixed(6)} {fee.fee_token}</td>
                          <td className="p-4 text-center">
                            {fee.tx_hash ? (
                              <a href={`https://solscan.io/tx/${fee.tx_hash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#02c076] hover:underline">
                                <span className="font-mono">{fee.tx_hash.slice(0, 8)}...</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-gray-600">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right text-sm text-gray-500">{formatDate(fee.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "featured" && (
            <div className="space-y-6">
              <div className="bg-[#14191f] rounded-xl border border-[#1e2329] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-lg font-bold text-white">Manage Featured Tokens</h2>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Token Address (Solana)</label>
                    <input
                      type="text"
                      value={featuredInput.address}
                      onChange={(e) => setFeaturedInput({ ...featuredInput, address: e.target.value })}
                      placeholder="Enter token mint address"
                      className="w-full bg-[#1e2329] border border-[#2a3139] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#02c076]"
                    />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-xs text-gray-500 mb-1">Duration (Hours)</label>
                    <select
                      value={featuredInput.duration}
                      onChange={(e) => setFeaturedInput({ ...featuredInput, duration: e.target.value })}
                      className="w-full bg-[#1e2329] border border-[#2a3139] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#02c076]"
                    >
                      <option value="1">1 Hour</option>
                      <option value="6">6 Hours</option>
                      <option value="12">12 Hours</option>
                      <option value="24">24 Hours</option>
                      <option value="168">7 Days</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => addFeaturedToken("active")}
                      disabled={featuredLoading || !featuredInput.address}
                      className="flex-1 md:w-auto px-6 py-3 bg-[#02c076] text-black font-bold rounded-lg hover:bg-[#02a566] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {featuredLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Feature Now
                    </button>
                    <button
                      onClick={() => addFeaturedToken("queued")}
                      disabled={featuredLoading || !featuredInput.address}
                      className="flex-1 md:w-auto px-6 py-3 bg-[#1e2329] text-[#02c076] font-bold rounded-lg border border-[#02c076]/30 hover:bg-[#02c076]/10 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {featuredLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      Add to Queue
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Tokens */}
              <div className="bg-[#14191f] rounded-xl border border-[#1e2329]">
                <div className="p-4 border-b border-[#1e2329] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    <h2 className="text-lg font-bold text-white">Active Featured</h2>
                  </div>
                  <p className="text-xs text-gray-500">{featuredTokens.filter(t => t.status === "active").length} active</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-[#1e2329]">
                        <th className="text-left p-4 font-medium">Token</th>
                        <th className="text-left p-4 font-medium">Address</th>
                        <th className="text-left p-4 font-medium">Featured Until</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featuredTokens.filter(t => t.status === "active").length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">No active featured tokens</td></tr>
                      ) : featuredTokens.filter(t => t.status === "active").map((token) => (
                        <tr key={token.id} className="border-b border-[#1e2329] hover:bg-[#1e2329]/50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {token.logo_url ? (
                                <img src={token.logo_url} alt={token.symbol} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#02c076] flex items-center justify-center text-[10px] font-bold text-black">
                                  {token.symbol.slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-white text-sm">{token.symbol}</p>
                                <p className="text-xs text-gray-500">{token.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-gray-400">{formatWallet(token.token_address)}</span>
                              <button onClick={() => navigator.clipboard.writeText(token.token_address)} className="text-gray-600 hover:text-[#02c076]">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-300">
                            {formatDate(token.featured_until)}
                            <p className="text-[10px] text-gray-500">
                              Expires in {Math.max(0, Math.round((new Date(token.featured_until).getTime() - Date.now()) / 3600000))} hours
                            </p>
                          </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedTokenForX({
                                    symbol: token.symbol,
                                    name: token.name,
                                    logo_url: token.logo_url,
                                    address: token.token_address
                                  })}
                                  className="p-2 text-gray-500 hover:text-[#1DA1F2] transition-colors"
                                  title="Generate X Post"
                                >
                                  <Twitter className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => updateFeaturedTokenStatus(token.id, "deactivate")}
                                className="p-2 text-gray-500 hover:text-yellow-400 transition-colors"
                                title="Expire Now"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteFeaturedToken(token.id)}
                                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Queued Tokens */}
              <div className="bg-[#14191f] rounded-xl border border-[#1e2329]">
                <div className="p-4 border-b border-[#1e2329] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <h2 className="text-lg font-bold text-white">Featured Queue</h2>
                  </div>
                  <p className="text-xs text-gray-500">{featuredTokens.filter(t => t.status === "queued").length} queued</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-[#1e2329]">
                        <th className="text-left p-4 font-medium">Token</th>
                        <th className="text-left p-4 font-medium">Address</th>
                        <th className="text-left p-4 font-medium">Duration</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featuredTokens.filter(t => t.status === "queued").length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">No queued tokens</td></tr>
                      ) : featuredTokens.filter(t => t.status === "queued").map((token) => (
                        <tr key={token.id} className="border-b border-[#1e2329] hover:bg-[#1e2329]/50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {token.logo_url ? (
                                <img src={token.logo_url} alt={token.symbol} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#02c076] flex items-center justify-center text-[10px] font-bold text-black">
                                  {token.symbol.slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-white text-sm">{token.symbol}</p>
                                <p className="text-xs text-gray-500">{token.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-gray-400">{formatWallet(token.token_address)}</span>
                              <button onClick={() => navigator.clipboard.writeText(token.token_address)} className="text-gray-600 hover:text-[#02c076]">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-300">
                            {token.duration_hours} Hours
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => updateFeaturedTokenStatus(token.id, "activate")}
                                className="px-3 py-1 bg-[#02c076]/10 text-[#02c076] text-xs font-bold rounded border border-[#02c076]/20 hover:bg-[#02c076]/20 transition-colors"
                              >
                                Activate
                              </button>
                              <button
                                onClick={() => deleteFeaturedToken(token.id)}
                                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        {selectedTokenForX && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <XPostGenerator 
                token={selectedTokenForX} 
                onClose={() => setSelectedTokenForX(null)} 
              />
            </div>
          </div>
        )}
      </div>
    );
  }

