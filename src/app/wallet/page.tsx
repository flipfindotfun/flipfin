"use client";

import { useState } from "react";
import { Wallet, Copy, ExternalLink, Key, Plus, Import, Download, Trash2, Eye, EyeOff, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/lib/wallet-context";
import { shortenAddress, formatNumber } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function WalletPage() {
  const { 
    publicKey, 
    balance, 
    generateWallet, 
    importWallet, 
    disconnectWallet, 
    exportPrivateKey,
    isLoading 
  } = useWallet();
  
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [exportedKey, setExportedKey] = useState<string | null>(null);

  const handleImport = () => {
    if (importWallet(privateKeyInput)) {
      setPrivateKeyInput("");
      setShowImport(false);
    }
  };

  const handleExport = () => {
    const pk = exportPrivateKey();
    if (pk) {
      setExportedKey(pk);
      setShowPrivateKey(true);
    }
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      toast.success("Address copied!");
    }
  };

  const copyPrivateKey = () => {
    if (exportedKey) {
      navigator.clipboard.writeText(exportedKey);
      toast.success("Private key copied! Keep it safe.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0b0e11]">
        <Loader2 className="w-8 h-8 animate-spin text-[#02c076]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-y-auto">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#1e2329]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1e2329] flex items-center justify-center">
            <Wallet className="w-5 h-5 text-[#02c076]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Wallet</h1>
            <p className="text-sm text-gray-500">Manage your trading wallet</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {!publicKey ? (
          /* No Wallet Connected */
          <div className="space-y-6">
            <div className="bg-[#0d1117] border border-[#1e2329] rounded-lg p-6 text-center">
              <Wallet className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-2">No Wallet Connected</h2>
              <p className="text-sm text-gray-500 mb-6">
                Create a new wallet or import an existing one to start trading
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={generateWallet}
                  className="bg-[#02c076] hover:bg-[#02a566] text-black font-bold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generate New Wallet
                </Button>
                <Button 
                  onClick={() => setShowImport(true)}
                  variant="outline"
                  className="border-[#2b3139] text-gray-400 hover:text-white"
                >
                  <Import className="w-4 h-4 mr-2" />
                  Import Wallet
                </Button>
              </div>
            </div>

            {showImport && (
              <div className="bg-[#0d1117] border border-[#1e2329] rounded-lg p-4">
                <h3 className="text-sm font-bold text-white mb-3">Import Wallet</h3>
                <Input
                  placeholder="Enter private key (base58)..."
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  className="bg-[#1e2329] border-[#2b3139] mb-3"
                  type="password"
                />
                <div className="flex gap-2">
                  <Button onClick={handleImport} className="bg-[#02c076] hover:bg-[#02a566] text-black">
                    Import
                  </Button>
                  <Button onClick={() => setShowImport(false)} variant="outline" className="border-[#2b3139]">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-yellow-500 mb-1">Security Notice</h3>
                  <p className="text-xs text-yellow-500/80">
                    Your wallet's private key is stored locally in your browser. Never share your private key with anyone. 
                    Make sure to backup your private key in a secure location.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Wallet Connected */
          <div className="space-y-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[#02c076]/20 to-[#02c076]/5 border border-[#02c076]/30 rounded-lg p-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Balance</p>
              <p className="text-3xl font-bold text-white mb-1">{balance.toFixed(4)} SOL</p>
              <p className="text-sm text-gray-400">≈ ${(balance * 200).toFixed(2)} USD</p>
            </div>

            {/* Wallet Address */}
            <div className="bg-[#0d1117] border border-[#1e2329] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Wallet Address</p>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#02c076]" />
                  <span className="text-[10px] text-gray-500">Connected</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-white break-all">{publicKey}</p>
                <button onClick={copyAddress} className="p-1.5 hover:bg-[#1e2329] rounded text-gray-500 hover:text-white flex-shrink-0">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <a
                  href={`https://solscan.io/account/${publicKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1e2329] hover:bg-[#2b3139] rounded text-gray-400 hover:text-white transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on Solscan
                </a>
              </div>
            </div>

            {/* Private Key */}
            <div className="bg-[#0d1117] border border-[#1e2329] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Private Key</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (!exportedKey) handleExport();
                      setShowPrivateKey(!showPrivateKey);
                    }}
                    className="p-1.5 hover:bg-[#1e2329] rounded text-gray-500 hover:text-white"
                  >
                    {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {showPrivateKey && exportedKey ? (
                <div className="space-y-2">
                  <div className="bg-[#1e2329] rounded p-3 font-mono text-xs text-gray-300 break-all">
                    {exportedKey}
                  </div>
                  <Button onClick={copyPrivateKey} variant="outline" size="sm" className="border-[#2b3139]">
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy Private Key
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Click the eye icon to reveal your private key</p>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-[#f6465d]/10 border border-[#f6465d]/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-[#f6465d]" />
                <p className="text-sm font-bold text-[#f6465d]">Danger Zone</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Disconnecting will remove the wallet from this browser. Make sure you have backed up your private key.
              </p>
              <Button 
                onClick={disconnectWallet}
                variant="outline"
                className="border-[#f6465d]/50 text-[#f6465d] hover:bg-[#f6465d]/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Disconnect Wallet
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
