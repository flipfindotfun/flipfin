"use client";

import { memo, useState, useEffect } from "react";

interface DexScreenerChartProps {
  tokenAddress: string;
  symbol: string;
}

const STORAGE_KEY = "dex_chart_interval";

export const DexScreenerChart = memo(function DexScreenerChart({
  tokenAddress,
}: DexScreenerChartProps) {
  // Use "1" as default (1 minute)
  const [interval, setIntervalState] = useState("1");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setIntervalState(saved);
    }
  }, []);

  // We can't easily detect the timeframe change inside the iframe
  // But we can provide a small selector outside if needed, 
  // or just rely on the fact that if we set it in the URL, it will be the starting point.
  // The user said: "when i changed in other TF and i refresh the page it should stay on that TF"
  // If they change it INSIDE the DexScreener iframe, we won't know about it.
  // To fulfill this request, we might need a small timeframe picker outside the iframe 
  // that updates the iframe URL and saves to localStorage.

  const handleIntervalChange = (newInterval: string) => {
    setIntervalState(newInterval);
    localStorage.setItem(STORAGE_KEY, newInterval);
  };

  const timeframes = [
    { label: "1m", value: "1" },
    { label: "5m", value: "5" },
    { label: "15m", value: "15" },
    { label: "1h", value: "60" },
    { label: "4h", value: "240" },
    { label: "1d", value: "1D" },
  ];

  return (
    <div className="flex flex-col w-full h-full bg-[#0b0e11] overflow-hidden">
      <div className="flex-1 relative overflow-hidden">
        <iframe
          key={tokenAddress}
          src={`https://dexscreener.com/solana/${tokenAddress}?embed=1&theme=dark&trades=0&info=0`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 'calc(100% + 38px)',
            border: 0,
          }}
          allow="clipboard-write"
          allowFullScreen
        />
      </div>
    </div>
  );
});
