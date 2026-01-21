"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { TokenColumns } from "@/components/token-columns";

function ReferralHandler() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("pendingReferralCode", ref);
    }
  }, [searchParams]);
  
  return null;
}

export default function Home() {
  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-hidden">
      <Suspense fallback={null}>
        <ReferralHandler />
      </Suspense>
      <Header />
      <div className="flex-1 overflow-hidden">
        <TokenColumns />
      </div>
    </div>
  );
}
