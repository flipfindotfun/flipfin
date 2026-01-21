"use client";

import { Eye, EyeOff, ExternalLink, TrendingUp, Copy, UserPlus, UserMinus } from "lucide-react";
import { useApp } from "@/lib/context";
import { formatNumber, shortenAddress } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SmartMoneyPanel() {
  const { smartWallets, toggleFollowWallet } = useApp();

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied!");
  };

  const followingCount = smartWallets.filter((w) => w.following).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-[#00d991]" />
          <h2 className="font-semibold">Smart Money</h2>
          {followingCount > 0 && (
            <Badge className="bg-[#00d991]/20 text-[#00d991] border-0">
              {followingCount} Following
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {smartWallets.map((wallet) => (
            <div
              key={wallet.address}
              className={cn(
                "p-3 rounded-lg border transition-all",
                wallet.following
                  ? "border-[#00d991]/50 bg-[#00d991]/5"
                  : "border-[#262626] bg-[#111] hover:border-[#333]"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      wallet.following
                        ? "bg-[#00d991] text-black"
                        : "bg-[#1a1a1a] text-white"
                    )}
                  >
                    {wallet.label?.slice(0, 2).toUpperCase() || "SM"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {wallet.label || shortenAddress(wallet.address)}
                      </span>
                      {wallet.following && (
                        <Badge className="bg-[#00d991]/20 text-[#00d991] border-0 text-[10px] px-1">
                          Following
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="font-mono">{shortenAddress(wallet.address, 4)}</span>
                      <button
                        onClick={() => copyAddress(wallet.address)}
                        className="hover:text-[#00d991]"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <a
                        href={`https://solscan.io/account/${wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#00d991]"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={wallet.following ? "outline" : "default"}
                  onClick={() => toggleFollowWallet(wallet.address)}
                  className={cn(
                    "h-7 text-xs",
                    wallet.following
                      ? "border-[#262626] hover:border-red-500/50 hover:text-red-500"
                      : "bg-[#00d991] hover:bg-[#00c282] text-black"
                  )}
                >
                  {wallet.following ? (
                    <>
                      <UserMinus className="w-3 h-3 mr-1" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#1a1a1a]">
                <div>
                  <p className="text-xs text-gray-500">7D PnL</p>
                  <p
                    className={cn(
                      "font-semibold text-sm",
                      wallet.pnl7d >= 0 ? "text-[#00d991]" : "text-red-500"
                    )}
                  >
                    {wallet.pnl7d >= 0 ? "+" : ""}${formatNumber(wallet.pnl7d)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Win Rate</p>
                  <p className="font-semibold text-sm">{wallet.winRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Trades</p>
                  <p className="font-semibold text-sm">{wallet.trades}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-[#262626]">
        <Button variant="outline" className="w-full border-[#262626]">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Wallet to Track
        </Button>
      </div>
    </div>
  );
}
