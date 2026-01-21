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
  ChevronDown,
  ExternalLink,
  FileText,
  Download,
  Mail,
  Copy,
  Check,
  Coins
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

const sections = [
  {
    id: "about",
    title: "About Flip Finance",
    icon: Zap,
    content: `Flip Finance (Flip Finance) is a next-generation DeFi trading terminal built on Solana. We provide professional-grade tools for trading meme coins and tokens with maximum speed and efficiency.

**What is Flip Finance?**
Flip Finance is a decentralized finance (DeFi) platform that combines advanced trading tools with a seamless user experience. Trade directly from your browser without external wallet extensions - just import your private key or generate a new wallet.

**Key Features:**
- Direct private key wallet management (generate or import)
- Real-time token tracking with live prices
- One-click trading through Jupiter aggregator
- Portfolio analytics with P&L tracking
- Money flow visualization between tokens
- Narrative tracker for market trends
- Social sentiment from X via BullX
- Wallet tracker and copy trading
- Points rewards program with referrals

**Why Flip Finance?**
- True DeFi - your keys, your crypto
- No browser extension wallets needed
- Fast execution through Jupiter DEX aggregator
- Real-time data from DexScreener & Birdeye
- Clean, professional trading interface
- Completely free to use
- Points system for future $FLIP airdrop`
  },
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    content: `**1. Create or Import Wallet**
Click "New" in the header to generate a fresh Solana wallet, or click the import icon to enter an existing private key (base58 format). Your key is stored locally in your browser - we never have access to it.

**2. Fund Your Wallet**
Copy your wallet address and send SOL from an exchange or another wallet. You'll need SOL for trading and transaction fees.

**3. Explore Tokens**
Browse trending tokens on the home page. Use the search bar to find any token by name or paste a contract address (CA) directly.

**4. Trade**
Click any token to open the trading interface. Select Buy or Sell, enter your amount, and execute trades directly through Jupiter aggregator for best rates.

**5. Track Portfolio**
View your holdings in the Portfolio (PnL) section. See unrealized gains/losses and export your trade history.

**6. Earn Points**
Every dollar you trade earns you 1 point. Refer friends to earn bonus points from their trading activity. Points will be used for the $FLIP airdrop.

**7. Backup Your Key**
Go to /wallet page or click Export Key in the wallet dropdown to backup your private key. Store it securely - if you lose it, your funds are gone forever.`
  },
  {
    id: "features",
    title: "Features Guide",
    icon: TrendingUp,
    content: `**Token Explorer (Home)**
Discover trending tokens with real-time prices, 24h volume, market cap, and price changes. Tokens are sorted by volume and activity.

**Trading Interface**
- Buy/Sell tabs with quick amount presets
- Jupiter DEX aggregator for best rates
- Adjustable slippage (default 1%)
- Real-time quote before execution
- Security indicators (mint authority, freeze, burn status)
- Top holders analysis

**Money Flow Map**
- Visualize capital flows between tokens
- Drag tokens to rearrange the layout
- Color-coded by price performance (green = gains, red = losses)
- Click any token to trade instantly

**Narrative Tracker**
- Track market narratives (AI Agents, Animal Memes, Political, Viral)
- Momentum scores and lifecycle stages
- Capital inflow tracking per narrative
- Smart wallet exposure metrics

**Hype Feed**
- Real-time crypto posts from X via BullX API
- Sentiment analysis (bullish/bearish/neutral)
- Filter by trending topics

**Wallet Tracker**
- Monitor any Solana wallet address
- Track whale movements in real-time
- Copy trades from successful traders

**Portfolio (PnL)**
- View all your token holdings
- Unrealized P&L calculations
- Trade history with CSV export
- Shareable P&L cards`
  },
  {
    id: "wallet",
    title: "Wallet Management",
    icon: Shield,
    content: `**Private Key Wallet System**
Flip Finance uses a direct private key system - no browser extensions or external wallet apps required. Your private key is stored locally in your browser's localStorage. We never have access to your keys.

**Generate New Wallet**
Click the "New" button in the header to create a fresh Solana keypair. A new address and private key will be generated instantly.

**Import Existing Wallet**
Click the import icon and paste your existing private key (base58 format). This lets you use any existing Solana wallet.

**Export Private Key**
Click your wallet address > "Export Key" to copy your private key. You can also view it on the /wallet page.

**Security Best Practices:**
- Always backup your private key in a secure location
- Never share your private key with anyone
- Consider using a dedicated trading wallet with limited funds
- Clearing browser data will remove your wallet - backup first!

**Important Warning:**
Your private key = your funds. If you lose it or share it, your funds are gone forever. We cannot recover lost keys. This is true DeFi - you have full control and full responsibility.`
  },
  {
    id: "token",
    title: "$FLIP Token",
    icon: Coins,
    content: `**Coming Soon on PumpFun**
The $FLIP token - the native token of Flip Finance - will be launching on PumpFun. Follow ${DEV_TWITTER} on X for launch announcements.

**Tokenomics:**
- Total Supply: 1,000,000,000 (1B) $FLIP
- Dev Allocation: 10%
- Public Sale: 90%
- Liquidity: 100% Burned (locked forever)

**Fair Launch**
- No presale or private sale
- No VC allocation
- 100% of liquidity burned at launch
- Fully transparent distribution

**Utility:**
- Governance voting on Flip Finance features
- Fee discounts on the platform
- Access to premium trading features
- Staking rewards (future roadmap)
- Revenue sharing (future roadmap)

**How to Get $FLIP:**
1. Follow ${DEV_TWITTER} on X for launch announcement
2. Buy on PumpFun when it launches
3. Trade on Raydium/Jupiter after bonding curve completes

**Airdrop:**
Flip Finance points will be converted to $FLIP airdrop allocations. The more you trade and refer, the larger your airdrop.`
  },
  {
    id: "rewards",
    title: "Rewards Program",
    icon: Gift,
    content: `**How Points Work**
- Earn 1 point for every $1 in trading volume
- Points accumulate automatically with each trade
- No minimum trading amount required
- Points are tied to your wallet address

**Referral Rewards**
- Get a unique referral link in the Rewards section
- Earn 20% of points from direct referrals (Level 1)
- Earn 5% of points from indirect referrals (Level 2)
- Unlimited referral earnings potential

**Leaderboard**
- Compete with other traders globally
- Weekly and all-time rankings
- Top traders featured on the platform

**$FLIP Airdrop**
Flip Finance points will be converted to $FLIP token allocations when the token launches. The more points you accumulate, the larger your airdrop allocation will be.

*Note: Point values and reward structures may change before the airdrop. Keep trading and referring to maximize your allocation.*`
  },
  {
    id: "terms",
    title: "Terms of Service",
    icon: Scale,
    content: `**Last Updated: January 2026**

By accessing and using Flip Finance ("the Platform"), you agree to be bound by these Terms of Service.

**1. Acceptance of Terms**
By using Flip Finance, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, do not use the Platform.

**2. Eligibility**
You must be at least 18 years old and legally permitted to use cryptocurrency and DeFi services in your jurisdiction. You are solely responsible for compliance with applicable laws.

**3. Nature of Service**
Flip Finance is a decentralized trading interface that provides tools for interacting with the Solana blockchain. We do NOT:
- Hold or custody your funds (your keys, your crypto)
- Execute trades on your behalf
- Provide financial, investment, or legal advice
- Guarantee any returns or profits

**4. Private Key Responsibility**
You are solely responsible for securing your private key. Keys are stored locally in your browser - we cannot recover them if lost. This is the nature of true DeFi.

**5. No Financial Advice**
Nothing on Flip Finance constitutes financial advice. All content is for informational purposes only. Always do your own research (DYOR).

**6. Limitation of Liability**
Flip Finance shall not be liable for any losses arising from your use of the Platform, trading decisions, smart contract failures, or third-party service outages.

**7. Modifications**
We reserve the right to modify these Terms at any time. Continued use constitutes acceptance of new Terms.`
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    icon: Shield,
    content: `**Last Updated: January 2026**

**Information We Collect**
- Wallet addresses (public blockchain data)
- Trading activity (public blockchain data)
- Referral relationships (for points calculation)

**What We Don't Collect**
- Personal identification information
- IP addresses (not stored)
- Email addresses (unless voluntarily provided)

**Private Keys**
Your private key is stored ONLY in your browser's localStorage. We never have access to it. It never leaves your device. This is the foundation of DeFi.

**How We Use Data**
- To display your portfolio and holdings
- To calculate points and referral bonuses
- To show trading history
- To improve platform functionality

**Third-Party Services**
Flip Finance integrates with:
- Jupiter (DEX aggregation and trade execution)
- Birdeye & DexScreener (price and market data)
- BullX (X/Twitter feed data)
- Helius (Solana RPC provider)
- GeckoTerminal (market data)

These services have their own privacy policies.

**Contact**
For privacy inquiries: ${DEV_EMAIL}`
  },
  {
    id: "disclaimer",
    title: "Risk Disclaimer",
    icon: AlertTriangle,
    content: `**HIGH RISK WARNING**

Cryptocurrency trading, especially meme coins and new tokens, involves substantial risk of loss. You can lose your entire investment. Only trade with funds you can afford to lose completely.

**DeFi & Meme Coin Risks:**
- Token prices can go to zero instantly
- Rug pulls and scam tokens are extremely common
- Smart contracts may contain bugs or exploits
- Liquidity can be removed without warning
- Pump and dump schemes are frequent
- Most new tokens fail

**DYOR - Do Your Own Research**
Flip Finance provides data and tools, but YOU are responsible for:
- Verifying token contracts on-chain
- Checking team legitimacy and history
- Understanding tokenomics and supply
- Evaluating liquidity depth and rug risk
- Checking for honeypot contracts
- Assessing holder distribution

**Private Key Risks:**
- Lost keys = lost funds (unrecoverable by anyone)
- Shared keys = stolen funds
- Clearing browser data removes your wallet
- Always backup before any browser changes

**No Guarantees**
- Past performance does not equal future results
- We make no profit guarantees whatsoever
- Trading bots and whales may front-run you
- Slippage can result in worse execution prices

**Not Financial Advice**
Nothing on Flip Finance is financial advice. We are not registered financial advisors. All trading decisions are yours alone.

**Only Trade What You Can Afford to Lose**
Treat this as high-risk speculation.`
  },
  {
    id: "contact",
    title: "Contact Us",
    icon: Mail,
    content: `**Get in Touch**

We're here to help! Reach out through any of the following channels:

**Developer**
- Email: ${DEV_EMAIL}
- X: ${DEV_TWITTER}

**Support**
For technical issues, bug reports, or feature requests, contact us via email or X DM.

**Community**
Follow us on X for updates, announcements, $FLIP token launch info, and alpha.

**Business Inquiries**
For partnerships, integrations, or business-related matters, email us at ${DEV_EMAIL}.

**Response Time**
We typically respond within 24-48 hours. For urgent issues, X DM is fastest.

**Report a Bug**
Found a bug? DM us on X with:
1. What you were trying to do
2. What happened instead
3. Your browser and device
4. Screenshots if possible`
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("about");
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(180, 180, 180);
      
      const cleanContent = section.content
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/\n\n/g, '\n');
      
      const lines = doc.splitTextToSize(cleanContent, maxWidth);
      
      for (const line of lines) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 5;
      }
      
      y += 10;
    }

    doc.addPage();
    y = 20;
    doc.setFontSize(14);
    doc.setTextColor(2, 192, 118);
    doc.text("Contact Information", margin, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text(`Email: ${DEV_EMAIL}`, margin, y);
    y += 6;
    doc.text(`X: ${DEV_TWITTER}`, margin, y);
    y += 6;
    doc.text("Website: https://flipfin.fun", margin, y);

    doc.save("Flip-Finance-Documentation.pdf");
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-hidden">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="lg:hidden border-b border-[#1e2329] bg-[#0d1117] p-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#02c076]" />
                Documentation
              </h1>
              <button
                onClick={downloadPDF}
                className="p-2 bg-[#1e2329] rounded-lg"
              >
                <Download className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-1">
              {sections.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => {
                      setActiveSection(section.id);
                      setExpandedMobile(expandedMobile === section.id ? null : section.id);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors",
                      activeSection === section.id
                        ? "bg-[#02c076]/10 text-[#02c076]"
                        : "text-gray-400 hover:text-white hover:bg-[#1e2329]"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <section.icon className="w-4 h-4" />
                      {section.title}
                    </span>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      expandedMobile === section.id && "rotate-180"
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div ref={contentRef} className="p-6 lg:p-10 lg:pr-80 max-w-4xl">
            {currentSection && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-[#02c076]/10">
                    <currentSection.icon className="w-6 h-6 text-[#02c076]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{currentSection.title}</h2>
                    <p className="text-xs text-gray-500 mt-1">Last updated: January 2026</p>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none">
                  {currentSection.content.split('\n\n').map((paragraph, idx) => {
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return (
                        <h3 key={idx} className="text-lg font-bold text-white mt-8 mb-3 flex items-center gap-2">
                          <div className="w-1 h-5 bg-[#02c076] rounded-full" />
                          {paragraph.replace(/\*\*/g, '')}
                        </h3>
                      );
                    }
                    
                    if (paragraph.includes('**')) {
                      const parts = paragraph.split(/(\*\*[^*]+\*\*)/);
                      return (
                        <p key={idx} className="text-gray-400 leading-relaxed mb-4">
                          {parts.map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={i} className="text-white font-medium">{part.replace(/\*\*/g, '')}</strong>;
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </p>
                      );
                    }
                    
                    if (paragraph.startsWith('- ')) {
                      const items = paragraph.split('\n').filter(l => l.startsWith('- '));
                      return (
                        <ul key={idx} className="space-y-2 text-gray-400 mb-4">
                          {items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#02c076] mt-2 flex-shrink-0" />
                              <span>{item.replace('- ', '')}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    
                    if (paragraph.startsWith('*') && paragraph.endsWith('*')) {
                      return (
                        <p key={idx} className="text-gray-500 italic text-sm mb-4 bg-[#1e2329] rounded-lg p-3 border-l-2 border-[#02c076]">
                          {paragraph.replace(/^\*|\*$/g, '')}
                        </p>
                      );
                    }
                    
                    return (
                      <p key={idx} className="text-gray-400 leading-relaxed mb-4">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>

                {currentSection.id === "contact" && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a
                      href={`mailto:${DEV_EMAIL}`}
                      className="flex items-center gap-4 p-4 bg-[#1e2329] rounded-xl hover:bg-[#2b3139] transition-colors group"
                    >
                      <div className="p-3 rounded-xl bg-[#02c076]/10 group-hover:bg-[#02c076]/20 transition-colors">
                        <Mail className="w-6 h-6 text-[#02c076]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Email Us</p>
                        <p className="text-xs text-gray-500">{DEV_EMAIL}</p>
                      </div>
                    </a>
                    <a
                      href={`https://x.com/${DEV_TWITTER.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-[#1e2329] rounded-xl hover:bg-[#2b3139] transition-colors group"
                    >
                      <div className="p-3 rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors">
                        <XIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Follow on X</p>
                        <p className="text-xs text-gray-500">{DEV_TWITTER}</p>
                      </div>
                    </a>
                  </div>
                )}

                {currentSection.id === "token" && (
                  <div className="mt-8 p-6 bg-gradient-to-br from-[#02c076]/20 to-[#02c076]/5 border border-[#02c076]/30 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <Coins className="w-8 h-8 text-[#02c076]" />
                      <div>
                        <h4 className="text-lg font-bold text-white">$FLIP Token Launch</h4>
                        <p className="text-xs text-gray-400">Coming soon on PumpFun</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-[#0b0e11]/50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-white">10%</p>
                        <p className="text-xs text-gray-500">Dev</p>
                      </div>
                      <div className="bg-[#0b0e11]/50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-white">90%</p>
                        <p className="text-xs text-gray-500">Public</p>
                      </div>
                      <div className="bg-[#0b0e11]/50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-[#02c076]">100%</p>
                        <p className="text-xs text-gray-500">Liq Burned</p>
                      </div>
                      <div className="bg-[#0b0e11]/50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-white">1B</p>
                        <p className="text-xs text-gray-500">Supply</p>
                      </div>
                    </div>
                    <a
                      href={`https://x.com/${DEV_TWITTER.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-[#02c076] text-black font-bold rounded-lg hover:bg-[#02a566] transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                      Follow for Launch Updates
                    </a>
                  </div>
                )}
              </>
            )}

            <div className="mt-12 pt-8 border-t border-[#1e2329]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-xs text-gray-500">
                    <p>Flip Finance - Solana DeFi Trading Terminal</p>
                    <p>Your keys, your crypto</p>
                  </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={downloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1e2329] rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#2b3139] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                  <a
                    href={`https://x.com/${DEV_TWITTER.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#1e2329] rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#2b3139] transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                    {DEV_TWITTER}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden lg:flex w-72 flex-col border-l border-[#1e2329] bg-[#0d1117] fixed right-0 top-[49px] bottom-0">
          <div className="p-4 border-b border-[#1e2329]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#02c076]" />
                <h1 className="font-bold text-white">Documentation</h1>
              </div>
              <button
                onClick={downloadPDF}
                className="p-2 hover:bg-[#1e2329] rounded-lg transition-colors group"
                title="Download PDF"
              >
                <Download className="w-4 h-4 text-gray-500 group-hover:text-[#02c076]" />
              </button>
            </div>
          </div>
          
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors",
                  activeSection === section.id
                    ? "bg-[#02c076]/10 text-[#02c076]"
                    : "text-gray-400 hover:text-white hover:bg-[#1e2329]"
                )}
              >
                <section.icon className="w-4 h-4 flex-shrink-0" />
                {section.title}
              </button>
            ))}
          </nav>
          
          <div className="p-4 border-t border-[#1e2329] space-y-3">
            <div className="bg-[#1e2329] rounded-xl p-4">
              <h3 className="text-xs font-medium text-white mb-3">Contact Developer</h3>
              <div className="space-y-2">
                <button
                  onClick={copyEmail}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#0b0e11] rounded-lg text-xs hover:bg-[#2b3139] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#02c076]" />
                    <span className="text-gray-400">{DEV_EMAIL}</span>
                  </div>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#02c076]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </button>
                <a
                  href={`https://x.com/${DEV_TWITTER.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#0b0e11] rounded-lg text-xs hover:bg-[#2b3139] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <XIcon className="w-3.5 h-3.5 text-white" />
                    <span className="text-gray-400">{DEV_TWITTER}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                </a>
              </div>
            </div>
            
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#02c076] text-black text-sm font-bold rounded-lg hover:bg-[#02a566] transition-colors"
            >
              Start Trading
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
