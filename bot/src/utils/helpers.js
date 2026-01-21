/**
 * ============================================
 * HELPER UTILITIES
 * ============================================
 * Common utility functions used across the bot.
 */

import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelayMs - Base delay between retries
 * @returns {Promise<any>}
 */
export async function retry(fn, maxRetries = 3, baseDelayMs = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Format SOL amount from lamports
 * @param {number|bigint} lamports - Amount in lamports
 * @returns {string} Formatted SOL amount
 */
export function formatSOL(lamports) {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  return sol.toFixed(4);
}

/**
 * Convert SOL to lamports
 * @param {number} sol - Amount in SOL
 * @returns {number} Amount in lamports
 */
export function solToLamports(sol) {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Validate Solana public key
 * @param {string} address - Address to validate
 * @returns {boolean}
 */
export function isValidPublicKey(address) {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Shorten address for display
 * @param {string} address - Full address
 * @param {number} chars - Characters to show on each end
 * @returns {string}
 */
export function shortenAddress(address, chars = 4) {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Calculate percentage change
 * @param {number} oldValue - Original value
 * @param {number} newValue - New value
 * @returns {number} Percentage change
 */
export function percentChange(oldValue, newValue) {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string}
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format USD amount
 * @param {number} amount - Amount in USD
 * @returns {string}
 */
export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async waitForSlot() {
    const now = Date.now();
    
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await sleep(waitTime);
      return this.waitForSlot();
    }
    
    this.requests.push(now);
  }
}

/**
 * Token metadata structure
 */
export const TOKEN_DECIMALS = {
  SOL: 9,
  USDC: 6,
  USDT: 6
};

/**
 * Known token mints
 */
export const KNOWN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  WSOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
};

/**
 * Program IDs for monitoring
 */
export const PROGRAM_IDS = {
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  PUMP_SWAP: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
  RAYDIUM_AMM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_CPMM: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TOKEN_2022: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
};

/**
 * Create a debounced function
 * @param {Function} func - Function to debounce
 * @param {number} waitMs - Wait time in ms
 * @returns {Function}
 */
export function debounce(func, waitMs) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, waitMs);
  };
}

/**
 * Parse transaction logs to extract relevant data
 * @param {string[]} logs - Transaction log messages
 * @returns {object} Parsed data
 */
export function parseTransactionLogs(logs) {
  const result = {
    instructions: [],
    errors: [],
    programs: new Set()
  };

  for (const log of logs) {
    if (log.includes('Program log:')) {
      result.instructions.push(log.replace('Program log: ', ''));
    }
    if (log.includes('Error:')) {
      result.errors.push(log);
    }
    const programMatch = log.match(/Program (\w+) invoke/);
    if (programMatch) {
      result.programs.add(programMatch[1]);
    }
  }

  return result;
}

export default {
  sleep,
  retry,
  formatSOL,
  solToLamports,
  isValidPublicKey,
  shortenAddress,
  percentChange,
  formatNumber,
  formatUSD,
  RateLimiter,
  TOKEN_DECIMALS,
  KNOWN_MINTS,
  PROGRAM_IDS,
  debounce,
  parseTransactionLogs
};
