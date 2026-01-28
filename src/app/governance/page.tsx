"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { 
  Vote, 
  Plus, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Lock,
  MessageSquare,
  BarChart3,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Connection, PublicKey } from "@solana/web3.js";

const FLIP_CA = "DUkYuJ1gxHSuYh1Dky3CaGtawLCDWsqx7KVgLwCtpump";
const MIN_FLIP_FOR_PROPOSAL = 10000;

interface Proposal {
  id: string;
  title: string;
  description: string;
  creator_address: string;
  status: 'active' | 'passed' | 'rejected';
  created_at: string;
  ends_at: string;
  voteCounts: Record<string, number>;
  totalWeight: number;
  vote_count: number;
}

export default function GovernancePage() {
  const { publicKey } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [flipBalance, setFlipBalance] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Proposal Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const fetchProposals = async () => {
    try {
      const res = await fetch("/api/governance/proposals");
      const data = await res.json();
      setProposals(data);
    } catch (err) {
      console.error("Error fetching proposals:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkBalance = async () => {
    if (!publicKey) return;
    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);
      const pubkey = new PublicKey(publicKey);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
        mint: new PublicKey(FLIP_CA)
      });

      if (tokenAccounts.value.length > 0) {
        setFlipBalance(tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0);
      } else {
        setFlipBalance(0);
      }
    } catch (err) {
      console.error("Error checking balance:", err);
    }
  };

  useEffect(() => {
    fetchProposals();
    checkBalance();
  }, [publicKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return toast.error("Connect wallet first");
    if (flipBalance < MIN_FLIP_FOR_PROPOSAL) return toast.error(`Need ${MIN_FLIP_FOR_PROPOSAL.toLocaleString()} FLIP to create proposals`);

    setIsCreating(true);
    try {
      const res = await fetch("/api/governance/create", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          wallet_address: publicKey,
          duration_days: 7
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success("Proposal created successfully!");
      setShowCreate(false);
      setTitle("");
      setDescription("");
      fetchProposals();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleVote = async (proposalId: string, choice: string) => {
    if (!publicKey) return toast.error("Connect wallet first");
    if (flipBalance <= 0) return toast.error("Must hold FLIP to vote");

    const loadingToast = toast.loading("Submitting vote...");
    try {
      const res = await fetch("/api/governance/vote", {
        method: "POST",
        body: JSON.stringify({
          proposal_id: proposalId,
          wallet_address: publicKey,
          choice
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.dismiss(loadingToast);
      toast.success("Vote submitted successfully!");
      fetchProposals();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-hidden">
      <Header />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#02c076]/10 border border-[#02c076]/20 rounded-xl">
                    <Vote className="w-6 h-6 text-[#02c076]" />
                  </div>
                  <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Governance Portal</h1>
                </div>
                <p className="text-gray-500 text-sm font-medium">
                  The future of FlipFin is in your hands. Hold FLIP to vote and shape the platform.
                </p>
              </div>
              
              <Button 
                onClick={() => setShowCreate(!showCreate)}
                className="bg-[#02c076] hover:bg-[#03e28c] text-black font-black uppercase tracking-tighter italic h-12 px-6 rounded-xl shadow-lg shadow-[#02c076]/10 group"
              >
                <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                New Proposal
              </Button>
            </div>

            {/* Wallet Info / Creation Gate */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1e2329]/40 border border-[#2b3139] rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Voting Power</span>
                </div>
                <p className="text-2xl font-black text-white tracking-tight">{flipBalance.toLocaleString()} <span className="text-[#02c076] text-sm">FLIP</span></p>
                <p className="text-[10px] text-gray-500 mt-1 font-bold italic">Based on current wallet balance</p>
              </div>

              <div className="bg-[#1e2329]/40 border border-[#2b3139] rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Requirement</span>
                </div>
                <p className="text-2xl font-black text-white tracking-tight">{MIN_FLIP_FOR_PROPOSAL.toLocaleString()} <span className="text-blue-400 text-sm">FLIP</span></p>
                <p className="text-[10px] text-gray-500 mt-1 font-bold italic">Required to create new proposals</p>
              </div>

              <div className="bg-[#1e2329]/40 border border-[#2b3139] rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-4 h-4 text-orange-400" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Voters</span>
                </div>
                <p className="text-2xl font-black text-white tracking-tight">242</p>
                <p className="text-[10px] text-gray-500 mt-1 font-bold italic">Community members participating</p>
              </div>
            </div>

            {/* Create Proposal Form */}
            {showCreate && (
              <div className="bg-[#1e2329] border-2 border-[#02c076]/30 rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Create New Proposal</h2>
                  <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition-colors">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Title</label>
                    <Input 
                      placeholder="e.g. Integrate Polymarket Support"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-black/50 border-[#2b3139] h-12 rounded-xl text-white font-bold focus:border-[#02c076]/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Description</label>
                    <Textarea 
                      placeholder="Explain the proposal in detail..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-black/50 border-[#2b3139] min-h-[120px] rounded-xl text-white font-medium focus:border-[#02c076]/50 resize-none"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                    <p className="text-[10px] text-yellow-500/80 font-black uppercase tracking-wider">
                      Proposal will run for 7 days. You need {MIN_FLIP_FOR_PROPOSAL.toLocaleString()} FLIP to post.
                    </p>
                  </div>

                  <Button 
                    type="submit"
                    disabled={isCreating || flipBalance < MIN_FLIP_FOR_PROPOSAL}
                    className="w-full h-14 bg-[#02c076] hover:bg-[#03e28c] text-black font-black uppercase tracking-tighter italic rounded-xl shadow-xl shadow-[#02c076]/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publish Proposal"}
                  </Button>
                </form>
              </div>
            )}

            {/* Proposals List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#1e2329] pb-4">
                <h2 className="text-lg font-black text-white italic uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#02c076]" />
                  Recent Proposals
                </h2>
                <div className="flex gap-4">
                  <span className="text-[10px] font-black text-[#02c076] uppercase tracking-widest">Active</span>
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Passed</span>
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Rejected</span>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-[#02c076]" />
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Loading Governance...</p>
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-20 bg-[#1e2329]/20 border-2 border-dashed border-[#2b3139] rounded-[32px]">
                  <p className="text-gray-500 font-bold italic">No active proposals found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {proposals.map((proposal) => {
                    const isEnded = new Date(proposal.ends_at) < new Date();
                    const yesVotes = proposal.voteCounts?.['yes'] || 0;
                    const noVotes = proposal.voteCounts?.['no'] || 0;
                    const totalVotes = yesVotes + noVotes;
                    const yesPercent = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
                    const noPercent = totalVotes > 0 ? (noVotes / totalVotes) * 100 : 0;

                    return (
                      <div 
                        key={proposal.id}
                        className="bg-[#1e2329]/60 border border-[#2b3139] rounded-[32px] overflow-hidden hover:border-[#02c076]/40 transition-all group"
                      >
                        <div className="p-6 md:p-8 space-y-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <h3 className="text-xl font-black text-white tracking-tight italic group-hover:text-[#02c076] transition-colors">{proposal.title}</h3>
                              <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3" />
                                  {isEnded ? "Ended" : `Ends ${formatDistanceToNow(new Date(proposal.ends_at), { addSuffix: true })}`}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1.5">
                                  <MessageSquare className="w-3 h-3" />
                                  {proposal.vote_count} Votes
                                </span>
                              </div>
                            </div>
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              proposal.status === 'active' ? "bg-[#02c076]/10 text-[#02c076] border border-[#02c076]/20 animate-pulse" : "bg-gray-800 text-gray-500"
                            )}>
                              {proposal.status}
                            </div>
                          </div>

                          <p className="text-gray-400 text-sm leading-relaxed font-medium line-clamp-2 italic">
                            {proposal.description}
                          </p>

                          {/* Progress Bars */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-white">Yes</span>
                                <span className="text-[#02c076]">{yesPercent.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 bg-black/40 rounded-full overflow-hidden p-0.5">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#02c076] to-emerald-400 rounded-full transition-all duration-1000" 
                                  style={{ width: `${yesPercent}%` }}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-white">No</span>
                                <span className="text-[#f6465d]">{noPercent.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 bg-black/40 rounded-full overflow-hidden p-0.5">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#f6465d] to-rose-400 rounded-full transition-all duration-1000" 
                                  style={{ width: `${noPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Voting Actions */}
                          {!isEnded && (
                            <div className="flex gap-3 pt-2">
                              <button
                                onClick={() => handleVote(proposal.id, 'yes')}
                                className="flex-1 h-12 flex items-center justify-center gap-2 bg-black/40 hover:bg-[#02c076]/20 border border-[#2b3139] hover:border-[#02c076]/40 rounded-2xl text-white font-black uppercase tracking-tighter text-xs transition-all active:scale-95"
                              >
                                <CheckCircle2 className="w-4 h-4 text-[#02c076]" />
                                Support
                              </button>
                              <button
                                onClick={() => handleVote(proposal.id, 'no')}
                                className="flex-1 h-12 flex items-center justify-center gap-2 bg-black/40 hover:bg-[#f6465d]/20 border border-[#2b3139] hover:border-[#f6465d]/40 rounded-2xl text-white font-black uppercase tracking-tighter text-xs transition-all active:scale-95"
                              >
                                <XCircle className="w-4 h-4 text-[#f6465d]" />
                                Against
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </main>
    </div>
  );
}
