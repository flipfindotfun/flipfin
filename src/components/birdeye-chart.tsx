"use client";

import { memo } from "react";

interface BirdeyeChartProps {
  tokenAddress: string;
  symbol: string;
}

export const BirdeyeChart = memo(function BirdeyeChart({
  tokenAddress,
  symbol,
}: BirdeyeChartProps) {
  return (
    <div className="w-full h-full min-h-[300px] bg-[#0b0e11]">
      <iframe
        src={`https://birdeye.so/tv-widget/solana/${tokenAddress}?chain=solana&chartType=CANDLE&chartInterval=15&chartTimezone=America%2FLos_Angeles&chartLeftToolbar=show&theme=dark`}
        className="w-full h-full border-0"
        allow="clipboard-write"
        allowFullScreen
      />
    </div>
  );
});
