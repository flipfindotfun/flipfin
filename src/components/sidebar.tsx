"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search,
  LayoutGrid,
  TrendingUp,
  Wallet,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Gift,
  Eye,
  FileText,
  Coins,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { icon: Search, label: "Explore", href: "/" },
  { icon: Coins, label: "Tokens", href: "/tokens" },
  { icon: LayoutGrid, label: "Portfolio", href: "/portfolio" },
  { icon: Gift, label: "Rewards", href: "/rewards" },
  { icon: Eye, label: "Tracker", href: "/tracker" },
  { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
  { icon: FileText, label: "Docs", href: "/docs" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isTradeRoute = pathname.startsWith("/trade/");

  if (isTradeRoute) return null;

  return (
    <aside className={cn(
      "hidden md:flex flex-col h-full border-r border-[#1e2329] bg-[#0b0e11] transition-all duration-200",
      collapsed ? "w-[60px]" : "w-[200px]"
    )}>
      <div className="flex items-center justify-between p-3 border-b border-[#1e2329]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="Flip Finance" className="w-full h-full object-contain" />
          </div>
          {!collapsed && <span className="font-bold text-white text-lg tracking-tight">Flip Finance</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-[#1e2329] rounded text-gray-500 hover:text-white"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all",
                isActive
                  ? "bg-[#02c076]/10 text-[#02c076]"
                  : "text-gray-400 hover:text-white hover:bg-[#1e2329]"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#1e2329]">
        <div className={cn(
          "flex items-center gap-2 px-2 py-1.5 bg-[#1e2329] rounded-lg",
          collapsed && "justify-center"
        )}>
          <div className="w-2 h-2 rounded-full bg-[#02c076] animate-pulse" />
          {!collapsed && <span className="text-[10px] text-gray-400">Live Data</span>}
        </div>
      </div>
    </aside>
  );
}

const mobileNavItems = [
  { icon: Search, label: "Explore", href: "/" },
  { icon: Coins, label: "Tokens", href: "/tokens" },
  { icon: LayoutGrid, label: "Portfolio", href: "/portfolio" },
  { icon: Gift, label: "Rewards", href: "/rewards" },
  { icon: Eye, label: "Tracker", href: "/tracker" },
];

export function MobileNav() {
  const pathname = usePathname();
  const isTradeRoute = pathname.startsWith("/trade/");

  if (isTradeRoute) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-14 border-t border-[#1e2329] bg-[#0b0e11]">
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5",
              isActive ? "text-[#02c076]" : "text-gray-500"
            )}
          >
            <item.icon className="w-5 h-5" />
          </Link>
        );
      })}
    </nav>
  );
}
