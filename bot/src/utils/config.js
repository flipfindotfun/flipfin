/**
 * ============================================
 * CONFIG LOADER
 * ============================================
 * Loads and validates configuration from config.json and environment variables.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Load configuration from config.json
 * @returns {object} Configuration object
 */
export function loadConfig() {
  const configPath = path.join(__dirname, '../../config.json');
  
  try {
    const configFile = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configFile);
    
    return {
      ...config,
      env: loadEnvConfig()
    };
  } catch (error) {
    console.error('Failed to load config.json:', error.message);
    throw new Error('Configuration file not found or invalid');
  }
}

/**
 * Load environment-based configuration
 * @returns {object} Environment configuration
 */
export function loadEnvConfig() {
  const network = process.env.NETWORK || 'mainnet';
  const isDevnet = network === 'devnet';

  return {
    network,
    isDevnet,
    
    privateKey: process.env.PRIVATE_KEY,
    
    helius: {
      apiKey: process.env.HELIUS_API_KEY,
      rpcUrl: isDevnet 
        ? process.env.HELIUS_DEVNET_RPC_URL 
        : process.env.HELIUS_RPC_URL,
      wsUrl: isDevnet
        ? process.env.HELIUS_DEVNET_WS_URL
        : process.env.HELIUS_WS_URL
    },
    
    jupiter: {
      apiKey: process.env.JUPITER_API_KEY,
      swapApiUrl: 'https://api.jup.ag/swap/v1',
      ultraApiUrl: 'https://api.jup.ag/ultra/v1'
    },
    
    birdeye: {
      apiKey: process.env.BIRDEYE_API_KEY,
      apiUrl: 'https://public-api.birdeye.so'
    },
    
    dexscreener: {
      apiUrl: 'https://api.dexscreener.com'
    },
    
    copyTrading: {
      wallets: (process.env.SMART_MONEY_WALLETS || '')
        .split(',')
        .map(w => w.trim())
        .filter(Boolean)
    },
    
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      toFile: process.env.LOG_TO_FILE === 'true'
    }
  };
}

/**
 * Validate configuration
 * @param {object} config - Configuration to validate
 * @returns {object} Validation result
 */
export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config.env.helius.apiKey) {
    errors.push('HELIUS_API_KEY is required');
  }

  if (!config.env.helius.rpcUrl) {
    errors.push('HELIUS_RPC_URL is required');
  }

  if (!config.env.jupiter.apiKey) {
    warnings.push('JUPITER_API_KEY not set - may hit rate limits');
  }

  if (!config.env.birdeye.apiKey) {
    warnings.push('BIRDEYE_API_KEY not set - security checks will be limited');
  }

  if (!config.env.privateKey || config.env.privateKey === 'your_base58_encoded_private_key_here') {
    warnings.push('No private key configured - a new wallet will be generated');
  }

  if (config.trading.buyAmountSOL > config.trading.maxBuyAmountSOL) {
    errors.push('buyAmountSOL cannot exceed maxBuyAmountSOL');
  }

  if (config.trading.slippageBps > 5000) {
    warnings.push('High slippage configured (>50%) - you may receive worse prices');
  }

  if (config.copyTrading.enabled && config.env.copyTrading.wallets.length === 0) {
    warnings.push('Copy trading enabled but no wallets configured');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get network-specific endpoints
 * @param {string} network - Network name (mainnet/devnet)
 * @returns {object} Network endpoints
 */
export function getNetworkEndpoints(network = 'mainnet') {
  const apiKey = process.env.HELIUS_API_KEY;
  
  const endpoints = {
    mainnet: {
      rpc: `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
      ws: `wss://mainnet.helius-rpc.com/?api-key=${apiKey}`,
      wsEnhanced: `wss://atlas-mainnet.helius-rpc.com/?api-key=${apiKey}`
    },
    devnet: {
      rpc: `https://devnet.helius-rpc.com/?api-key=${apiKey}`,
      ws: `wss://devnet.helius-rpc.com/?api-key=${apiKey}`,
      wsEnhanced: `wss://atlas-devnet.helius-rpc.com/?api-key=${apiKey}`
    }
  };

  return endpoints[network] || endpoints.mainnet;
}

export default {
  loadConfig,
  loadEnvConfig,
  validateConfig,
  getNetworkEndpoints
};
