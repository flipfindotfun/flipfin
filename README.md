# Flipfin.fun - Professional Solana Sniper & Trading Platform

Flipfin is a high-performance trading platform and sniper bot for the Solana blockchain, designed for professional traders who demand real-time accuracy and advanced analytics.

## 🚀 Key Features

- **Professional Charting**: Integrated DexScreener and high-performance Pro Charts with custom buy/sell markers.
- **Advanced Analytics**: Real-time token security analysis, holder distribution, and narrative tracking.
- **High-Speed Swaps**: Powered by Jupiter SDK for the best prices and lightning-fast execution on Solana.
- **Copy Trading**: Follow top traders and automate your strategies with precision.
- **User Dashboard**: Comprehensive portfolio tracking, PnL analysis, and trading history.
- **Rewards System**: Earn points through trading activity and platform engagement.

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Framer Motion
- **Charting**: DexScreener, @devexperts/dxcharts-lite
- **Solana Integration**: @solana/web3.js, Jupiter SDK
- **Backend**: Supabase (Database & Auth), Birdeye API (OHLCV & Analytics)
- **Styling**: Tailwind CSS with custom design tokens

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) or [npm](https://www.npmjs.com/)
- Solana Wallet (Phantom, Solflare, etc.)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/flipfin.git
   cd flipfin
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env.local` and fill in your API keys (Helius, Jupiter, Birdeye, Supabase, etc.).

4. Run the development server:
   ```bash
   bun dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛡 Security

Flipfin prioritizes user security. Private keys are never stored on our servers and all transactions are signed client-side or through secure non-custodial methods.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
