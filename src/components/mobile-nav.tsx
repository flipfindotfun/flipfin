"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Search, 
  Activity, 
  PieChart, 
  Trophy, 
  Eye, 
  BookOpen, 
  Shield,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Search, label: "Explore" },
  { href: "/portfolio", icon: PieChart, label: "Portfolio" },
  { href: "/rewards", icon: Trophy, label: "Rewards" },
  { href: "/tracker", icon: Eye, label: "Tracker" },
  { href: "/leaderboard", icon: LayoutGrid, label: "Leaderboard" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d1117] border-t border-[#1e2329] safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[60px]",
                isActive 
                  ? "text-[#02c076]" 
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-[#02c076]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
