## Project Summary
A professional Solana sniper bot and trading platform built with Next.js, featuring real-time charts, advanced token analytics, and high-performance trading via Jupiter.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Framer Motion
- **Charting**: DexScreener (Primary for trade execution), @devexperts/dxcharts-lite (Secondary)
- **Solana**: @solana/web3.js, Jupiter SDK (Swap/Quote)
- **Backend/API**: Birdeye (OHLCV/Analytics), DexScreener (Price/Pairs), Supabase (User data/Trades)
- **Icons**: Lucide React

## Architecture
- `src/app/trade/[address]`: Main trading interface with professional charting
- `src/components/dx-chart.tsx`: Performance-optimized chart component using dxcharts-lite
- `src/app/api/ohlcv`: Unified data endpoint favoring Birdeye for real-time accuracy
- `src/hooks/use-jupiter.ts`: Core trading logic for Solana swaps

## User Preferences
- No "AI slop" aesthetics; prefers clean, high-performance professional UI
- Strict requirement for real-time data over mocks
- Charting should support both Price and Market Cap views
- Direct Birdeye integration for price action accuracy

## Project Guidelines
- Use `DxChart` for all charting requirements
- Maintain a cohesive dark-themed aesthetic (ideally #0b0e11 / #0d1117 backgrounds)
- No console logs in production; use silent error handling for API fallbacks
- Favor Birdeye API for OHLCV data whenever possible

## Common Patterns
- OHLCV data fetching via `/api/ohlcv` with timeframe support
- Token security analysis displayed alongside trading panels
- Optimistic trade tracking in local state before Supabase confirmation
