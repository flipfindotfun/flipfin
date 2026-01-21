"use client";

import { memo } from "react";

interface DexChartProps {
  tokenAddress: string;
  symbol: string;
}

export const BirdeyeChart = memo(function DexChart({
  tokenAddress,
}: DexChartProps) {
  return (
    <div className="w-full h-full min-h-[300px] bg-[#0b0e11]">
      <iframe
        src={`https://dexscreener.com/solana/${tokenAddress}?embed=1&loadChartSettings=0&trades=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15`}
        className="w-full h-full border-0"
        allow="clipboard-write"
        allowFullScreen
      />
    </div>
  );
});
