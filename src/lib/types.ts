export interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  decimals: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  holders?: number;
  createdAt?: number;
  platform?: 'pumpfun' | 'raydium' | 'pumpswap' | 'unknown' | 'meteora';
  security?: TokenSecurity;
  pairAddress?: string;
  twitter?: string | null;
  telegram?: string | null;
  website?: string | null;
}

export interface TokenSecurity {
  score: number;
  isHoneypot: boolean;
  isMintable: boolean;
  isFreezable: boolean;
  ownershipRenounced: boolean;
  liquidityLocked: boolean;
  topHolderPercent: number;
  buyTax: number;
  sellTax: number;
}

export interface Trade {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  type: 'buy' | 'sell';
  amountIn: number;
  amountOut: number;
  price: number;
  timestamp: number;
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface Position {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  entryTime: number;
}

export interface SmartWallet {
  address: string;
  label?: string;
  pnl7d: number;
  winRate: number;
  trades: number;
  following: boolean;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  positions: Position[];
}

export function formatNumber(num: number | undefined | null, decimals = 2): string {
  if (num === undefined || num === null || isNaN(num)) return "0";
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  return num.toFixed(decimals);
}

export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) return "0.00";
  if (price === 0) return "0.00";
  if (price < 0.000000001) return price.toExponential(2);
  if (price < 0.0001) return price.toFixed(10);
  if (price < 1) return price.toFixed(8);
  return price.toFixed(4);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
