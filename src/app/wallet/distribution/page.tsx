"use client";

import { useState, useCallback, useEffect } from "react";
import { 
  Coins, 
  Plus, 
  Trash2, 
  Send, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet, connection, withRetry } from "@/lib/wallet-context";
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import bs58 from "bs58";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "distribute" | "consolidate";

interface DistributionTarget {
  id: string;
  address: string;
  amount: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

interface ConsolidationSource {
  id: string;
  privateKey: string;
  address: string;
  balance: number;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

export default function DistributionPage() {
  const { wallet, publicKey, balance, refreshBalance } = useWallet();
  const [mode, setMode] = useState<Mode>("distribute");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Distribute State
  const [targets, setTargets] = useState<DistributionTarget[]>([
    { id: "1", address: "", amount: "", status: "pending" }
  ]);
  
  // Consolidate State
  const [sources, setSources] = useState<ConsolidationSource[]>([]);
  const [bulkPkInput, setBulkPkInput] = useState("");

  // Add target row
  const addTarget = () => {
    setTargets([...targets, { id: Math.random().toString(36).substr(2, 9), address: "", amount: "", status: "pending" }]);
  };

  // Remove target row
  const removeTarget = (id: string) => {
    if (targets.length > 1) {
      setTargets(targets.filter(t => t.id !== id));
    }
  };

  // Update target
  const updateTarget = (id: string, field: keyof DistributionTarget, value: string) => {
    setTargets(targets.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // Add source row
  const addSource = () => {
    setSources([...sources, { id: Math.random().toString(36).substr(2, 9), privateKey: "", address: "", balance: 0, status: "pending" }]);
  };

  // Remove source row
  const removeSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
  };

  // Update source and derive address/balance
  const updateSource = async (id: string, pk: string) => {
    let address = "";
    let bal = 0;
    let status: ConsolidationSource["status"] = "pending";
    let error = undefined;

    try {
      if (pk) {
        const secretKey = bs58.decode(pk);
        if (secretKey.length === 64) {
          const kp = Keypair.fromSecretKey(secretKey);
          address = kp.publicKey.toBase58();
          // Fetch balance
          const b = await connection.getBalance(kp.publicKey);
          bal = b / LAMPORTS_PER_SOL;
        } else {
          throw new Error("Invalid private key length");
        }
      }
    } catch (e: any) {
      status = "error";
      error = "Invalid Private Key";
    }

    setSources(sources.map(s => s.id === id ? { ...s, privateKey: pk, address, balance: bal, status, error } : s));
  };

  // Handle Bulk PK Import
  const handleBulkImport = async () => {
    const keys = bulkPkInput.split("\n").map(k => k.trim()).filter(k => k);
    const newSources: ConsolidationSource[] = [];
    
    for (const pk of keys) {
      try {
        const secretKey = bs58.decode(pk);
        if (secretKey.length === 64) {
          const kp = Keypair.fromSecretKey(secretKey);
          const b = await connection.getBalance(kp.publicKey);
          newSources.push({
            id: Math.random().toString(36).substr(2, 9),
            privateKey: pk,
            address: kp.publicKey.toBase58(),
            balance: b / LAMPORTS_PER_SOL,
            status: "pending"
          });
        }
      } catch (e) {
        toast.error(`Invalid key: ${pk.substring(0, 8)}...`);
      }
    }
    
    setSources([...sources, ...newSources]);
    setBulkPkInput("");
  };

  // Execute Distribution
  const executeDistribution = async () => {
    if (!wallet) {
      toast.error("Connect your main wallet first");
      return;
    }

    const validTargets = targets.filter(t => t.address && t.amount && parseFloat(t.amount) > 0);
    if (validTargets.length === 0) {
      toast.error("Add at least one valid recipient");
      return;
    }

    const totalAmount = validTargets.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    if (totalAmount > balance) {
      toast.error("Insufficient balance for distribution");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    for (const target of validTargets) {
      setTargets(prev => prev.map(t => t.id === target.id ? { ...t, status: "processing" } : t));
      
      try {
        const recipient = new PublicKey(target.address);
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: recipient,
            lamports: parseFloat(target.amount) * LAMPORTS_PER_SOL,
          })
        );

        const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
        console.log(`Distribution success: ${signature}`);
        
        setTargets(prev => prev.map(t => t.id === target.id ? { ...t, status: "success" } : t));
        successCount++;
      } catch (e: any) {
        console.error(`Distribution failed for ${target.address}:`, e);
        setTargets(prev => prev.map(t => t.id === target.id ? { ...t, status: "error", error: e.message } : t));
      }
    }

    setIsProcessing(false);
    refreshBalance();
    toast.success(`Distributed to ${successCount} wallets`);
  };

  // Execute Consolidation
  const executeConsolidation = async () => {
    if (!publicKey) {
      toast.error("Connect your main wallet first");
      return;
    }

    const validSources = sources.filter(s => s.privateKey && s.balance > 0.001);
    if (validSources.length === 0) {
      toast.error("No source wallets with balance found");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    const recipient = new PublicKey(publicKey);

    for (const source of validSources) {
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, status: "processing" } : s));
      
      try {
        const secretKey = bs58.decode(source.privateKey);
        const kp = Keypair.fromSecretKey(secretKey);
        
        // Calculate max amount (balance - gas fee)
        const currentBal = await connection.getBalance(kp.publicKey);
        const fee = 5000; // standard fee
        const amount = currentBal - fee;

        if (amount <= 0) throw new Error("Balance too low for gas");

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: kp.publicKey,
            toPubkey: recipient,
            lamports: amount,
          })
        );

        await sendAndConfirmTransaction(connection, transaction, [kp]);
        
        setSources(prev => prev.map(s => s.id === source.id ? { ...s, status: "success", balance: 0 } : s));
        successCount++;
      } catch (e: any) {
        console.error(`Consolidation failed for ${source.address}:`, e);
        setSources(prev => prev.map(s => s.id === source.id ? { ...s, status: "error", error: e.message } : s));
      }
    }

    setIsProcessing(false);
    refreshBalance();
    toast.success(`Consolidated ${successCount} wallets`);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-y-auto">
      {/* Header */}
      <div className="px-4 sm:px-6 py-6 border-b border-[#1e2329]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#02c076]/10 flex items-center justify-center border border-[#02c076]/20">
              <Coins className="w-6 h-6 text-[#02c076]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Consolidate and Distribute</h1>
              <p className="text-sm text-gray-500 mt-1">Manage bulk transfers across multiple wallets</p>
            </div>
          </div>
          
          <div className="flex bg-[#1e2329] p-1 rounded-lg">
            <button
              onClick={() => setMode("distribute")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                mode === "distribute" ? "bg-[#2a3139] text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
              )}
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Distribute
            </button>
            <button
              onClick={() => setMode("consolidate")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                mode === "consolidate" ? "bg-[#2a3139] text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
              )}
            >
              <ArrowDownToLine className="w-4 h-4" />
              Consolidate
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Main Wallet Card */}
        <div className="bg-[#0d1117] border border-[#1e2329] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Main Account</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-white text-lg font-bold">{publicKey ? `${publicKey.slice(0, 8)}...${publicKey.slice(-8)}` : "Wallet Not Connected"}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#02c076]">{balance.toFixed(4)} SOL</span>
              <span className="text-sm text-gray-500">≈ ${(balance * 160).toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        {mode === "distribute" ? (
          /* DISTRIBUTE MODE */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Recipients
                <span className="px-2 py-0.5 rounded-full bg-[#1e2329] text-xs text-gray-400 font-normal">
                  {targets.length}
                </span>
              </h2>
              <Button 
                onClick={addTarget}
                variant="outline" 
                size="sm"
                className="border-[#2b3139] text-gray-400 hover:text-white hover:bg-[#1e2329]"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="space-y-3">
              {targets.map((target) => (
                <div key={target.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-[#0d1117] border border-[#1e2329] rounded-xl group transition-all hover:border-[#2b3139]">
                  <div className="flex-1">
                    <Input
                      placeholder="Recipient SOL Address"
                      value={target.address}
                      onChange={(e) => updateTarget(target.id, "address", e.target.value)}
                      className="bg-[#1e2329] border-[#2b3139] focus:border-[#02c076]/50 transition-all font-mono text-sm"
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <div className="relative">
                      <Input
                        placeholder="0.00"
                        type="number"
                        value={target.amount}
                        onChange={(e) => updateTarget(target.id, "amount", e.target.value)}
                        className="bg-[#1e2329] border-[#2b3139] pr-10 focus:border-[#02c076]/50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold">SOL</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:pl-2">
                    {target.status === "processing" && <Loader2 className="w-5 h-5 animate-spin text-[#02c076]" />}
                    {target.status === "success" && <CheckCircle2 className="w-5 h-5 text-[#02c076]" />}
                    {target.status === "error" && (
                      <div className="group/err relative">
                        <AlertCircle className="w-5 h-5 text-[#f6465d]" />
                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-[#f6465d] text-white text-[10px] rounded shadow-lg opacity-0 group-hover/err:opacity-100 transition-opacity z-50">
                          {target.error}
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={() => removeTarget(target.id)}
                      className="p-2 hover:bg-[#f6465d]/10 rounded-lg text-gray-500 hover:text-[#f6465d] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-[#1e2329]">
              <div className="bg-[#1e2329]/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-300">Important</h4>
                    <ul className="text-xs text-gray-500 space-y-1 mt-1 list-disc pl-4">
                      <li>Each transfer incurs a small network fee (approx 0.000005 SOL)</li>
                      <li>Transactions are executed sequentially</li>
                      <li>Make sure you have enough SOL for both transfers and fees</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={executeDistribution}
                disabled={isProcessing || !publicKey}
                className="w-full h-12 bg-[#02c076] hover:bg-[#02a566] text-black font-bold text-lg rounded-xl shadow-[0_4px_14px_0_rgba(2,192,118,0.3)] transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Distributing...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Distribution
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* CONSOLIDATE MODE */
          <div className="space-y-6">
            <div className="bg-[#0d1117] border border-[#1e2329] rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-2">Bulk Import Private Keys</h3>
              <p className="text-xs text-gray-500 mb-3">Enter one private key per line (base58 format)</p>
              <textarea
                value={bulkPkInput}
                onChange={(e) => setBulkPkInput(e.target.value)}
                placeholder="Ex: 5K...&#10;4H...&#10;8M..."
                className="w-full h-32 bg-[#1e2329] border border-[#2b3139] rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-[#02c076]/50 placeholder-gray-600 mb-3"
              />
              <Button 
                onClick={handleBulkImport}
                className="bg-[#1e2329] hover:bg-[#2a3139] text-white border border-[#2b3139]"
              >
                Import Keys
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Source Wallets
                  <span className="px-2 py-0.5 rounded-full bg-[#1e2329] text-xs text-gray-400 font-normal">
                    {sources.length}
                  </span>
                </h2>
                <Button 
                  onClick={addSource}
                  variant="outline" 
                  size="sm"
                  className="border-[#2b3139] text-gray-400 hover:text-white hover:bg-[#1e2329]"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Row
                </Button>
              </div>

              <div className="space-y-3">
                {sources.map((source) => (
                  <div key={source.id} className="p-3 bg-[#0d1117] border border-[#1e2329] rounded-xl space-y-3 transition-all hover:border-[#2b3139]">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Private Key (base58)"
                          type="password"
                          value={source.privateKey}
                          onChange={(e) => updateSource(source.id, e.target.value)}
                          className="bg-[#1e2329] border-[#2b3139] focus:border-[#02c076]/50 transition-all font-mono text-sm"
                        />
                      </div>
                      <button 
                        onClick={() => removeSource(source.id)}
                        className="p-2 hover:bg-[#f6465d]/10 rounded-lg text-gray-500 hover:text-[#f6465d] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {source.address && (
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-[10px] text-gray-400 font-mono">{source.address}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[#02c076]">{source.balance.toFixed(4)} SOL</span>
                          {source.status === "processing" && <Loader2 className="w-4 h-4 animate-spin text-[#02c076]" />}
                          {source.status === "success" && <CheckCircle2 className="w-4 h-4 text-[#02c076]" />}
                          {source.status === "error" && <AlertCircle className="w-4 h-4 text-[#f6465d]" />}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-[#1e2329]">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-yellow-500">Security Warning</h4>
                    <p className="text-xs text-yellow-500/80 mt-1">
                      This action will sweep all SOL from the provided wallets into your main account. Private keys are used only for transaction signing and are NOT stored.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={executeConsolidation}
                disabled={isProcessing || !publicKey || sources.length === 0}
                className="w-full h-12 bg-[#02c076] hover:bg-[#02a566] text-black font-bold text-lg rounded-xl shadow-[0_4px_14px_0_rgba(2,192,118,0.3)] transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Consolidating...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-5 h-5 mr-2" />
                    Consolidate All to Main Account
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
