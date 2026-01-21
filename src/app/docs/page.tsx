"use client";

import { Header } from "@/components/header";
import { 
  BookOpen, 
  Shield, 
  Scale, 
  AlertTriangle, 
  Zap, 
  TrendingUp, 
  Gift, 
  ChevronRight,
  ExternalLink,
  Download,
  Mail,
  Copy,
  Check,
  Coins,
  Rocket,
  Sparkles,
  Terminal,
  Wallet,
  BarChart3,
  Users,
  ArrowRight,
  Globe,
  Lock,
  Eye
} from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const DEV_EMAIL = "developer@flipfin.fun";
const DEV_TWITTER = "@shyharvs";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GlowOrb({ className }: { className?: string }) {
  return (
    <div className={cn("absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none", className)} />
  );
}

const sections = [
  {
    id: "about",
    title: "About Flip Finance",
    subtitle: "Next-gen DeFi terminal",
    icon: Zap,
    gradient: "from-[#02c076] to-emerald-400",
    content: [
      {
        type: "hero",
        title: "Trade Solana Like a Pro",
        description: "Flip Finance is a next-generation DeFi trading terminal built for speed, efficiency, and maximum alpha extraction on Solana."
      },
      {
        type: "features",
        items: [
          { icon: Terminal, title: "Direct Wallet Access", desc: "No extensions needed - import your key or generate fresh" },
          { icon: Zap, title: "Lightning Execution", desc: "Jupiter aggregator for best rates & fastest fills" },
          { icon: BarChart3, title: "Real-time Analytics", desc: "Live prices, P&L tracking, money flow maps" },
          { icon: Users, title: "Social Alpha", desc: "X sentiment, wallet tracking, copy trading" },
        ]
      },
      {
        type: "text",
        content: "Your keys, your crypto. True DeFi means full control - and full responsibility. We never have access to your private keys."
      }
    ]
  },
  {
    id: "getting-started",
    title: "Getting Started",
    subtitle: "5 minutes to your first trade",
    icon: Rocket,
    gradient: "from-blue-500 to-cyan-400",
    content: [
      {
        type: "steps",
        items: [
          { step: "01", title: "Create Wallet", desc: "Click 'New' to generate a fresh Solana keypair, or import an existing private key", icon: Wallet },
          { step: "02", title: "Fund Account", desc: "Copy your address and send SOL from any exchange or wallet", icon: Coins },
          { step: "03", title: "Find Alpha", desc: "Browse trending tokens, use search, or paste any contract address", icon: Eye },
          { step: "04", title: "Execute Trade", desc: "One-click buy/sell through Jupiter with customizable slippage", icon: Zap },
          { step: "05", title: "Track Gains", desc: "Monitor P&L in your portfolio, export trades, share wins", icon: TrendingUp },
        ]
      },
      {
        type: "warning",
        content: "Always backup your private key in a secure location. Lost keys = lost funds. This is irreversible."
      }
    ]
  },
  {
    id: "features",
    title: "Features",
    subtitle: "Your trading arsenal",
    icon: Sparkles,
    gradient: "from-purple-500 to-pink-400",
    content: [
      {
        type: "grid",
        items: [
          { title: "Token Explorer", desc: "Real-time trending tokens with volume, MC, and price changes", tag: "HOME" },
          { title: "Trading Terminal", desc: "Professional interface with security checks & holder analysis", tag: "TRADE" },
          { title: "Money Flow", desc: "Visualize capital movement between tokens in real-time", tag: "FLOW" },
          { title: "Narrative Tracker", desc: "Track market narratives, momentum, and smart money moves", tag: "ALPHA" },
          { title: "Hype Feed", desc: "Live X sentiment analysis from BullX - catch the wave early", tag: "SOCIAL" },
          { title: "Wallet Tracker", desc: "Monitor whales, copy successful traders, get alerts", tag: "COPY" },
          { title: "Portfolio PnL", desc: "Full holdings view with unrealized gains and CSV export", tag: "TRACK" },
          { title: "Points System", desc: "Earn rewards for trading volume and referrals", tag: "EARN" },
        ]
      }
    ]
  },
  {
    id: "wallet",
    title: "Wallet Security",
    subtitle: "Your keys, your crypto",
    icon: Shield,
    gradient: "from-amber-500 to-orange-400",
    content: [
      {
        type: "security",
        items: [
          { icon: Lock, title: "Local Storage Only", desc: "Your private key never leaves your browser. We can't access it." },
          { icon: Eye, title: "No Tracking", desc: "We don't collect personal data, IPs, or identification info." },
          { icon: Shield, title: "Direct Transactions", desc: "Sign transactions locally - nothing goes through our servers." },
        ]
      },
      {
        type: "checklist",
        title: "Security Best Practices",
        items: [
          "Backup your private key in multiple secure locations",
          "Never share your key with anyone - we will never ask for it",
          "Use a dedicated trading wallet with limited funds",
          "Clearing browser data removes your wallet - backup first"
        ]
      },
      {
        type: "danger",
        content: "Your private key = your funds. If you lose it or share it, your funds are gone forever. We cannot help recover lost keys."
      }
    ]
  },
  {
    id: "token",
    title: "$FLIP Token",
    subtitle: "Coming to PumpFun",
    icon: Coins,
    gradient: "from-[#02c076] to-emerald-300",
    content: [
      {
        type: "tokenomics",
        items: [
          { label: "Total Supply", value: "1B", sub: "$FLIP" },
          { label: "Dev Allocation", value: "10%", sub: "Transparent" },
          { label: "Public Sale", value: "90%", sub: "Fair Launch" },
          { label: "Liquidity", value: "100%", sub: "Burned Forever" },
        ]
      },
      {
        type: "utility",
        items: [
          "Governance voting on platform features",
          "Fee discounts on trades",
          "Access to premium features",
          "Future staking rewards",
          "Revenue sharing (roadmap)"
        ]
      },
      {
        type: "cta",
        title: "Get $FLIP",
        description: "Follow for launch announcements",
        link: `https://x.com/${DEV_TWITTER.replace('@', '')}`,
        button: "Follow on X"
      }
    ]
  },
  {
    id: "rewards",
    title: "Rewards",
    subtitle: "Trade more, earn more",
    icon: Gift,
    gradient: "from-rose-500 to-red-400",
    content: [
      {
        type: "rewards",
        items: [
          { value: "1 PT", label: "per $1 traded", desc: "Points accumulate automatically" },
          { value: "20%", label: "Level 1 referral", desc: "From direct referrals" },
          { value: "5%", label: "Level 2 referral", desc: "From indirect referrals" },
        ]
      },
      {
        type: "text",
        content: "Points convert to $FLIP airdrop allocations at token launch. The more you trade and refer, the larger your allocation."
      },
      {
        type: "note",
        content: "Point values and reward structures may change before the airdrop."
      }
    ]
  },
  {
    id: "terms",
    title: "Terms of Service",
    subtitle: "Updated January 2026",
    icon: Scale,
    gradient: "from-slate-500 to-gray-400",
    content: [
      {
        type: "legal",
        sections: [
          { title: "Acceptance", content: "By using Flip Finance, you agree to these Terms. If you disagree, don't use the platform." },
          { title: "Eligibility", content: "You must be 18+ and legally permitted to use crypto/DeFi services in your jurisdiction." },
          { title: "Nature of Service", content: "We provide a trading interface. We don't custody funds, execute trades on your behalf, or provide financial advice." },
          { title: "Your Responsibility", content: "You're responsible for your private key security and all trading decisions." },
          { title: "Limitation of Liability", content: "We're not liable for losses from trading, smart contract failures, or third-party outages." },
        ]
      }
    ]
  },
  {
    id: "privacy",
    title: "Privacy",
    subtitle: "What we collect (almost nothing)",
    icon: Eye,
    gradient: "from-indigo-500 to-violet-400",
    content: [
      {
        type: "privacy",
        collected: [
          "Wallet addresses (public blockchain data)",
          "Trading activity (public blockchain data)",
          "Referral relationships (for points)"
        ],
        notCollected: [
          "Personal identification info",
          "IP addresses",
          "Email (unless you provide it)",
          "Private keys (never)"
        ]
      },
      {
        type: "text",
        content: "Your private key is stored ONLY in your browser's localStorage. It never leaves your device. This is the foundation of true DeFi."
      }
    ]
  },
  {
    id: "disclaimer",
    title: "Risk Disclaimer",
    subtitle: "Read this carefully",
    icon: AlertTriangle,
    gradient: "from-red-500 to-rose-400",
    content: [
      {
        type: "danger",
        content: "Cryptocurrency trading involves substantial risk. You can lose your entire investment. Only trade what you can afford to lose completely."
      },
      {
        type: "risks",
        items: [
          "Token prices can go to zero instantly",
          "Rug pulls and scams are extremely common",
          "Smart contracts may have exploits",
          "Liquidity can vanish without warning",
          "Most new tokens fail"
        ]
      },
      {
        type: "text",
        content: "DYOR - Do Your Own Research. Verify contracts, check teams, understand tokenomics. Nothing on Flip Finance is financial advice."
      }
    ]
  },
  {
    id: "contact",
    title: "Contact",
    subtitle: "Get in touch",
    icon: Mail,
    gradient: "from-cyan-500 to-blue-400",
    content: [
      {
        type: "contact",
        email: DEV_EMAIL,
        twitter: DEV_TWITTER
      }
    ]
  },
];

function ContentRenderer({ content, sectionId }: { content: any[]; sectionId: string }) {
  return (
    <div className="space-y-8">
      {content.map((block, idx) => {
        switch (block.type) {
          case "hero":
            return (
              <div key={idx} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e2329] to-[#0b0e11] border border-[#2b3139] p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#02c076]/10 rounded-full blur-[100px]" />
                <h3 className="text-3xl font-black text-white mb-3 relative">{block.title}</h3>
                <p className="text-gray-400 text-lg leading-relaxed max-w-2xl relative">{block.description}</p>
              </div>
            );

          case "features":
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {block.items.map((item: any, i: number) => (
                  <div key={i} className="group relative overflow-hidden rounded-xl bg-[#1e2329]/50 border border-[#2b3139] p-5 hover:border-[#02c076]/50 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#02c076]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-[#02c076]/10 text-[#02c076]">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">{item.title}</h4>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );

          case "steps":
            return (
              <div key={idx} className="space-y-4">
                {block.items.map((item: any, i: number) => (
                  <div key={i} className="group flex items-start gap-4 p-4 rounded-xl bg-[#1e2329]/30 border border-[#2b3139]/50 hover:border-[#02c076]/30 transition-colors">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#02c076] to-emerald-400 flex items-center justify-center">
                      <span className="text-sm font-black text-black">{item.step}</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                        {item.title}
                        <item.icon className="w-4 h-4 text-gray-500" />
                      </h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#02c076] transition-colors mt-3" />
                  </div>
                ))}
              </div>
            );

          case "grid":
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {block.items.map((item: any, i: number) => (
                  <div key={i} className="group relative p-4 rounded-xl bg-[#1e2329]/30 border border-[#2b3139]/50 hover:bg-[#1e2329]/60 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-white">{item.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#02c076]/10 text-[#02c076]">{item.tag}</span>
                    </div>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            );

          case "security":
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {block.items.map((item: any, i: number) => (
                  <div key={i} className="text-center p-6 rounded-2xl bg-gradient-to-b from-[#1e2329] to-[#0b0e11] border border-[#2b3139]">
                    <div className="inline-flex p-3 rounded-xl bg-[#02c076]/10 mb-4">
                      <item.icon className="w-6 h-6 text-[#02c076]" />
                    </div>
                    <h4 className="font-bold text-white mb-2">{item.title}</h4>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            );

          case "checklist":
            return (
              <div key={idx} className="rounded-xl bg-[#1e2329]/50 border border-[#2b3139] p-5">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#02c076]" />
                  {block.title}
                </h4>
                <div className="space-y-3">
                  {block.items.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#02c076]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[#02c076]" />
                      </div>
                      <span className="text-sm text-gray-400">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );

          case "tokenomics":
            return (
              <div key={idx} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {block.items.map((item: any, i: number) => (
                  <div key={i} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e2329] to-[#0b0e11] border border-[#2b3139] p-5 text-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#02c076]/5 to-transparent" />
                    <p className="text-3xl font-black text-white relative">{item.value}</p>
                    <p className="text-xs text-gray-500 mt-1 relative">{item.label}</p>
                    <p className="text-[10px] text-[#02c076] font-medium mt-1 relative">{item.sub}</p>
                  </div>
                ))}
              </div>
            );

          case "utility":
            return (
              <div key={idx} className="rounded-xl bg-[#1e2329]/30 border border-[#2b3139]/50 p-5">
                <h4 className="font-bold text-white mb-4">Token Utility</h4>
                <div className="flex flex-wrap gap-2">
                  {block.items.map((item: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-[#02c076]/10 text-[#02c076] text-xs font-medium">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            );

          case "cta":
            return (
              <div key={idx} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#02c076] to-emerald-400 p-6">
                <div className="absolute inset-0 bg-[url('/static/noise.png')] opacity-10" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-black text-black">{block.title}</h4>
                    <p className="text-black/70 text-sm">{block.description}</p>
                  </div>
                  <a
                    href={block.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white font-bold rounded-xl hover:bg-black/80 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                    {block.button}
                  </a>
                </div>
              </div>
            );

          case "rewards":
            return (
              <div key={idx} className="grid grid-cols-3 gap-4">
                {block.items.map((item: any, i: number) => (
                  <div key={i} className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1e2329] to-[#0b0e11] border border-[#2b3139] p-5 text-center">
                    <p className="text-3xl font-black text-[#02c076]">{item.value}</p>
                    <p className="text-sm font-medium text-white mt-1">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            );

          case "legal":
            return (
              <div key={idx} className="space-y-4">
                {block.sections.map((section: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-[#1e2329]/30 border border-[#2b3139]/50">
                    <h4 className="font-bold text-white mb-2 text-sm">{i + 1}. {section.title}</h4>
                    <p className="text-sm text-gray-500">{section.content}</p>
                  </div>
                ))}
              </div>
            );

          case "privacy":
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#1e2329]/30 border border-[#2b3139]/50 p-5">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    What we see
                  </h4>
                  <div className="space-y-2">
                    {block.collected.map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-[#02c076]/5 border border-[#02c076]/20 p-5">
                  <h4 className="font-bold text-[#02c076] mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Never collected
                  </h4>
                  <div className="space-y-2">
                    {block.notCollected.map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                        <Check className="w-3.5 h-3.5 text-[#02c076]" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );

          case "risks":
            return (
              <div key={idx} className="rounded-xl bg-[#f6465d]/5 border border-[#f6465d]/20 p-5">
                <h4 className="font-bold text-[#f6465d] mb-4">Key Risks</h4>
                <div className="space-y-2">
                  {block.items.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-400">
                      <AlertTriangle className="w-4 h-4 text-[#f6465d] flex-shrink-0 mt-0.5" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );

          case "contact":
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href={`mailto:${block.email}`}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e2329] to-[#0b0e11] border border-[#2b3139] p-6 hover:border-[#02c076]/50 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#02c076]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="inline-flex p-3 rounded-xl bg-[#02c076]/10 mb-4">
                      <Mail className="w-6 h-6 text-[#02c076]" />
                    </div>
                    <h4 className="font-bold text-white mb-1">Email</h4>
                    <p className="text-sm text-gray-500">{block.email}</p>
                  </div>
                  <ArrowRight className="absolute bottom-6 right-6 w-5 h-5 text-gray-600 group-hover:text-[#02c076] group-hover:translate-x-1 transition-all" />
                </a>
                <a
                  href={`https://x.com/${block.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e2329] to-[#0b0e11] border border-[#2b3139] p-6 hover:border-white/30 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="inline-flex p-3 rounded-xl bg-white/10 mb-4">
                      <XIcon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-white mb-1">X / Twitter</h4>
                    <p className="text-sm text-gray-500">{block.twitter}</p>
                  </div>
                  <ArrowRight className="absolute bottom-6 right-6 w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </a>
              </div>
            );

          case "text":
            return (
              <p key={idx} className="text-gray-400 leading-relaxed">{block.content}</p>
            );

          case "warning":
            return (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">{block.content}</p>
              </div>
            );

          case "danger":
            return (
              <div key={idx} className="relative overflow-hidden rounded-xl bg-[#f6465d]/10 border border-[#f6465d]/30 p-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#f6465d]/20 rounded-full blur-[60px]" />
                <div className="relative flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#f6465d] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#f6465d]/90 font-medium">{block.content}</p>
                </div>
              </div>
            );

          case "note":
            return (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-[#1e2329]/50 border-l-2 border-[#02c076]">
                <p className="text-sm text-gray-500 italic">{block.content}</p>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("about");
  const [copied, setCopied] = useState(false);

  const currentSection = sections.find(s => s.id === activeSection);

  const copyEmail = () => {
    navigator.clipboard.writeText(DEV_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    doc.setFontSize(24);
    doc.setTextColor(2, 192, 118);
    doc.text("Flip Finance Documentation", margin, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
    y += 15;

    doc.setDrawColor(30, 35, 41);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    for (const section of sections) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(section.title, margin, y);
      y += 6;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(section.subtitle, margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(180, 180, 180);
      
      for (const block of section.content) {
        if (block.type === "text" || block.type === "warning" || block.type === "danger" || block.type === "note") {
          const lines = doc.splitTextToSize(block.content, maxWidth);
          for (const line of lines) {
            if (y > 280) {
              doc.addPage();
              y = 20;
            }
            doc.text(line, margin, y);
            y += 5;
          }
          y += 3;
        }
      }
      
      y += 10;
    }

    doc.save("Flip-Finance-Documentation.pdf");
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-hidden">
      <Header />
      
      <div className="flex-1 flex overflow-hidden relative">
        <GlowOrb className="bg-[#02c076] -left-64 top-0" />
        <GlowOrb className="bg-purple-500 right-0 bottom-0" />
        
        <main className="flex-1 overflow-y-auto relative">
          <div className="lg:hidden sticky top-0 z-20 border-b border-[#1e2329] bg-[#0b0e11]/95 backdrop-blur-xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-[#02c076] to-emerald-400">
                    <BookOpen className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h1 className="font-bold text-white">Docs</h1>
                    <p className="text-xs text-gray-500">Flip Finance</p>
                  </div>
                </div>
                <button
                  onClick={downloadPDF}
                  className="p-2.5 bg-[#1e2329] rounded-xl hover:bg-[#2b3139] transition-colors"
                >
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
                      activeSection === section.id
                        ? "bg-[#02c076] text-black"
                        : "bg-[#1e2329] text-gray-400 hover:text-white"
                    )}
                  >
                    <section.icon className="w-3.5 h-3.5" />
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-10 lg:pr-80 max-w-4xl mx-auto">
            {currentSection && (
              <div className="space-y-8">
                <div className="relative">
                  <div className={cn(
                    "absolute -left-4 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b",
                    currentSection.gradient
                  )} />
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-2xl bg-gradient-to-br",
                      currentSection.gradient
                    )}>
                      <currentSection.icon className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">{currentSection.title}</h2>
                      <p className="text-sm text-gray-500 mt-1">{currentSection.subtitle}</p>
                    </div>
                  </div>
                </div>

                <ContentRenderer content={currentSection.content} sectionId={currentSection.id} />
              </div>
            )}

            <div className="mt-16 pt-8 border-t border-[#1e2329]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-600">Flip Finance</p>
                  <p className="text-[10px] text-gray-700">Your keys, your crypto</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1e2329] rounded-xl text-xs text-gray-400 hover:text-white hover:bg-[#2b3139] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <a
                    href={`https://x.com/${DEV_TWITTER.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#1e2329] rounded-xl text-xs text-gray-400 hover:text-white hover:bg-[#2b3139] transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                    {DEV_TWITTER}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden lg:flex w-72 flex-col border-l border-[#1e2329] bg-[#0b0e11]/80 backdrop-blur-xl fixed right-0 top-[49px] bottom-0 z-10">
          <div className="p-5 border-b border-[#1e2329]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#02c076] to-emerald-400">
                <BookOpen className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="font-bold text-white">Documentation</h1>
                <p className="text-[10px] text-gray-500">Flip Finance v1.0</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all",
                  activeSection === section.id
                    ? "bg-gradient-to-r from-[#02c076]/20 to-transparent text-[#02c076]"
                    : "text-gray-500 hover:text-white hover:bg-[#1e2329]/50"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  activeSection === section.id
                    ? "bg-[#02c076]/20"
                    : "bg-[#1e2329] group-hover:bg-[#2b3139]"
                )}>
                  <section.icon className="w-4 h-4" />
                </div>
                <span className="font-medium">{section.title}</span>
                {activeSection === section.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </nav>
          
          <div className="p-4 border-t border-[#1e2329] space-y-3">
            <div className="bg-[#1e2329]/50 rounded-xl p-4">
              <h3 className="text-xs font-bold text-white mb-3">Quick Contact</h3>
              <div className="space-y-2">
                <button
                  onClick={copyEmail}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-[#0b0e11] rounded-lg text-xs hover:bg-[#2b3139] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#02c076]" />
                    <span className="text-gray-400 group-hover:text-white transition-colors">{DEV_EMAIL}</span>
                  </div>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#02c076]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400" />
                  )}
                </button>
                <a
                  href={`https://x.com/${DEV_TWITTER.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-[#0b0e11] rounded-lg text-xs hover:bg-[#2b3139] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <XIcon className="w-3.5 h-3.5 text-white" />
                    <span className="text-gray-400 group-hover:text-white transition-colors">{DEV_TWITTER}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400" />
                </a>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={downloadPDF}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1e2329] text-gray-400 text-xs font-medium rounded-xl hover:bg-[#2b3139] hover:text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#02c076] to-emerald-400 text-black text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                Trade
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
