"use client";

import { X, ExternalLink, Copy, TrendingUp, Wallet, Clock, BarChart3 } from "lucide-react";
import { FlowNode } from "@/app/flow/page";
import Link from "next/link";
import { formatNumber } from "@/lib/types";
import { useState } from "react";

interface FlowSidebarProps {
  selectedNode: FlowNode | null;
  onClose: () => void;
}

export function FlowSidebar({ selectedNode, onClose }: FlowSidebarProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (selectedNode) {
      navigator.clipboard.writeText(selectedNode.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-[#1e2329] bg-[#0d1117] p-4 hidden lg:block">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#1e2329] flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-sm font-medium text-white mb-2">Select a Node</h3>
          <p className="text-xs text-gray-500">
            Click on any wallet or token on the map to view detailed flow information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[#1e2329]">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: selectedNode.color + "30" }}
          >
            {selectedNode.type === "wallet" ? (
              <Wallet className="w-4 h-4" style={{ color: selectedNode.color }} />
            ) : (
              <BarChart3 className="w-4 h-4" style={{ color: selectedNode.color }} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{selectedNode.label}</h3>
            <p className="text-[10px] text-gray-500 capitalize">{selectedNode.type}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#1e2329] rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-[#1e2329] rounded-lg p-3">
          <p className="text-[10px] text-gray-500 mb-1">Address</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-white font-mono flex-1 truncate">
              {selectedNode.id}
            </code>
            <button
              onClick={copyAddress}
              className="p-1 hover:bg-[#2b3139] rounded transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          {copied && <p className="text-[10px] text-[#02c076] mt-1">Copied!</p>}
        </div>

        {selectedNode.cluster && (
          <div className="bg-[#1e2329] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 mb-1">Cluster Type</p>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedNode.color }}
              />
              <span className="text-sm font-medium text-white capitalize">
                {selectedNode.cluster}
              </span>
            </div>
          </div>
        )}

        {selectedNode.volume !== undefined && (
          <div className="bg-[#1e2329] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 mb-1">Total Volume</p>
            <span className="text-lg font-bold text-white">
              ${formatNumber(selectedNode.volume)}
            </span>
          </div>
        )}

        {selectedNode.metadata && (
          <>
            {selectedNode.metadata.winRate !== undefined && (
              <div className="bg-[#1e2329] rounded-lg p-3">
                <p className="text-[10px] text-gray-500 mb-1">Win Rate</p>
                <span className="text-lg font-bold text-[#02c076]">
                  {selectedNode.metadata.winRate}%
                </span>
              </div>
            )}

            {selectedNode.metadata.pnl !== undefined && (
              <div className="bg-[#1e2329] rounded-lg p-3">
                <p className="text-[10px] text-gray-500 mb-1">Total PnL</p>
                <span
                  className={`text-lg font-bold ${
                    selectedNode.metadata.pnl >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                  }`}
                >
                  {selectedNode.metadata.pnl >= 0 ? "+" : ""}
                  ${formatNumber(Math.abs(selectedNode.metadata.pnl))}
                </span>
              </div>
            )}

            {selectedNode.metadata.lastActive && (
              <div className="bg-[#1e2329] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <p className="text-[10px] text-gray-500">Last Active</p>
                </div>
                <span className="text-sm text-white">
                  {new Date(selectedNode.metadata.lastActive).toLocaleString()}
                </span>
              </div>
            )}

            {selectedNode.metadata.recentTokens && (
              <div className="bg-[#1e2329] rounded-lg p-3">
                <p className="text-[10px] text-gray-500 mb-2">Recent Tokens</p>
                <div className="space-y-2">
                  {selectedNode.metadata.recentTokens.map((t: any) => (
                    <Link
                      key={t.address}
                      href={`/trade/${t.address}`}
                      className="flex items-center justify-between p-2 bg-[#0b0e11] rounded hover:bg-[#1a1d21] transition-colors"
                    >
                      <span className="text-xs font-medium text-white">{t.symbol}</span>
                      <span
                        className={`text-xs ${
                          t.pnl >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
                        }`}
                      >
                        {t.pnl >= 0 ? "+" : ""}
                        {t.pnl}%
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-[#1e2329]">
        {selectedNode.type === "token" ? (
          <Link
            href={`/trade/${selectedNode.id}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#02c076] text-black text-sm font-bold rounded-lg hover:bg-[#02a566] transition-colors"
          >
            Trade Token
            <ExternalLink className="w-4 h-4" />
          </Link>
        ) : (
          <a
            href={`https://solscan.io/account/${selectedNode.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1e2329] text-white text-sm font-medium rounded-lg hover:bg-[#2b3139] transition-colors"
          >
            View on Solscan
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
