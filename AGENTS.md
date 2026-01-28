## Project Summary
A professional Solana sniper bot and trading platform built with Next.js, featuring real-time charts, advanced token analytics, and high-performance trading via Jupiter.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Framer Motion
- **Charting**: DexScreener (Primary), TradingView Lightweight Charts (Professional alternative with B/S markers)
- **Solana**: @solana/web3.js, Jupiter SDK (Swap/Quote)
- **Backend/API**: Birdeye (OHLCV/Analytics), DexScreener (Price/Pairs), Supabase (User data/Trades)
- **Icons**: Lucide React

## Architecture
- `src/app/trade/[address]`: Main trading interface with professional charting
- `src/components/lightweight-chart.tsx`: TradingView Lightweight Charts component with real-time Birdeye data
- `src/app/api/ohlcv`: Unified data endpoint favoring Birdeye for real-time accuracy
- `src/hooks/use-jupiter.ts`: Core trading logic for Solana swaps

## User Preferences
- No "AI slop" aesthetics; prefers clean, high-performance professional UI
- Strict requirement for real-time data over mocks
- Charting should support both Price and Market Cap views
- Direct Birdeye integration for price action accuracy

## Project Guidelines
- Use `LightweightChart` as the professional charting alternative to DexScreener
- Maintain a cohesive dark-themed aesthetic (ideally #0b0e11 / #0d1117 backgrounds)
- No console logs in production; use silent error handling for API fallbacks
- Favor Birdeye API for OHLCV data whenever possible

## Common Patterns
- OHLCV data fetching via `/api/ohlcv` with timeframe support
- Token security analysis displayed alongside trading panels
- Optimistic trade tracking in local state before Supabase confirmation

## Security & Deployment
- **Secrets Management**: Never commit `.env` or `.env.local` files. These are strictly for local development and are ignored via `.gitignore`.
- **Deployment**: All environment variables must be manually added to the deployment platform (e.g., Vercel, Railway) under Project Settings.
- **API Keys**: Use `process.env` for all sensitive keys (Jupiter, Birdeye, Groq, Supabase).
- **GitHub Push Protection**: If a push is blocked due to leaked secrets, use the GitHub provided "unblock" URL after ensuring the secret is no longer in the active codebase and has been rotated.
