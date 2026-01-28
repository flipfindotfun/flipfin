"use client";

import { useState } from "react";
import { Wallet, Copy, ExternalLink, ChevronDown, LogOut, Key, Plus, Import, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/lib/wallet-context";
import { shortenAddress } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function WalletButton() {
  const { 
    publicKey, 
    balance, 
    generateWallet, 
    importWallet, 
    disconnectWallet, 
    exportPrivateKey,
    isLoading 
  } = useWallet();
  
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState("");

  const handleImport = () => {
    if (importWallet(privateKeyInput)) {
      setIsImportOpen(false);
      setIsConnectModalOpen(false);
      setPrivateKeyInput("");
    }
  };

  const handleGenerate = () => {
    generateWallet();
    setIsConnectModalOpen(false);
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      toast.success("Address copied!");
    }
  };

  const handleExport = () => {
    const pk = exportPrivateKey();
    if (pk) {
      navigator.clipboard.writeText(pk);
      toast.success("Private key copied! Keep it safe.");
    }
  };

  if (isLoading) {
    return (
      <Button disabled variant="outline" size="sm" className="border-[#2b3139] bg-[#1e2329] h-8">
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (!publicKey) {
    return (
      <>
        <Button
          onClick={() => setIsConnectModalOpen(true)}
          size="sm"
          className="bg-[#02c076] hover:bg-[#02a566] text-black font-black italic uppercase h-8 px-3 sm:px-4 text-[10px] sm:text-xs"
        >
          <span className="hidden sm:inline">Connect</span>
          <Plus className="w-4 h-4 sm:hidden" />
        </Button>

        <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
          <DialogContent className="bg-[#0b0e11] border-[#1e2329] text-white max-w-[90vw] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-black italic uppercase tracking-tight text-white">Connect Wallet</DialogTitle>
              <DialogDescription className="text-gray-500 text-xs">
                Choose how you want to connect to Flip Finance.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Button
                onClick={handleGenerate}
                className="bg-[#02c076] hover:bg-[#02a566] text-black font-black italic uppercase h-12 text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Generate New Wallet
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#1e2329]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0b0e11] px-2 text-gray-500">Or</span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsImportOpen(true)}
                className="border-[#1e2329] bg-[#1e2329] hover:bg-[#2b3139] text-white font-black italic uppercase h-12 text-sm flex items-center justify-center gap-2"
              >
                <Import className="w-5 h-5" />
                Import Private Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogContent className="bg-[#0b0e11] border-[#1e2329] text-white max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black italic uppercase text-white">Import Wallet</DialogTitle>
              <DialogDescription className="text-gray-500 text-xs">
                Enter your private key (base58)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Input
                placeholder="Private key..."
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                className="bg-[#1e2329] border-[#2b3139] focus:border-[#02c076] h-12 text-sm font-mono"
              />
              <Button 
                onClick={handleImport}
                disabled={!privateKeyInput}
                className="w-full bg-[#02c076] hover:bg-[#02a566] text-black font-black italic uppercase h-12"
              >
                Import
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="border-[#1e2329] bg-[#1e2329] hover:bg-[#2b3139] h-8 px-2.5 sm:px-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#02c076] hidden sm:block" />
            <span className="font-mono text-[10px] hidden sm:inline">{shortenAddress(publicKey, 3)}</span>
            <span className="text-[#02c076] font-bold text-[10px]">{balance.toFixed(balance < 10 ? 2 : 1)} SOL</span>
            <Wallet className="w-4 h-4 text-[#02c076] hidden sm:block" />
            <ChevronDown className="w-3 h-3 text-gray-500 hidden sm:block" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-[#0b0e11] border-[#1e2329] text-white">
        <div className="px-3 py-2 border-b border-[#1e2329]">
          <p className="text-[9px] text-gray-500 uppercase mb-0.5">Wallet</p>
          <p className="font-mono text-[10px] text-gray-400 break-all">{publicKey}</p>
        </div>
        <DropdownMenuItem onClick={copyAddress} className="cursor-pointer text-xs py-2">
          <Copy className="w-3.5 h-3.5 mr-2" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExport} className="cursor-pointer text-xs py-2">
          <Key className="w-3.5 h-3.5 mr-2" />
          Export Key
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="text-xs py-2">
          <a href={`https://solscan.io/account/${publicKey}`} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
            <ExternalLink className="w-3.5 h-3.5 mr-2" />
            Solscan
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#1e2329]" />
        <DropdownMenuItem onClick={disconnectWallet} className="cursor-pointer text-[#f6465d] text-xs py-2">
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
