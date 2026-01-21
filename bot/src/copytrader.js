/**
 * ============================================
 * COPY TRADING MODULE
 * ============================================
 * Monitors "smart money" wallets and replicates their trades.
 * 
 * Features:
 * - Real-time monitoring of specified wallet addresses
 * - Automatic trade replication with security checks
 * - Configurable copy amounts and delays
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { getLogger } from './utils/logger.js';
import { sleep, isValidPublicKey, shortenAddress, KNOWN_MINTS } from './utils/helpers.js';

export class CopyTrader extends EventEmitter {
  constructor(config, securityValidator) {
    super();
    this.config = config;
    this.securityValidator = securityValidator;
    this.logger = getLogger();
    
    this.ws = null;
    this.isConnected = false;
    this.walletsToMonitor = [];
    this.processedSignatures = new Set();
    this.maxProcessedSignatures = 5000;
    this.reconnectAttempts = 0;
    this.pingInterval = null;
  }

  /**
   * Initialize copy trading with wallets from config
   */
  async initialize() {
    const copyConfig = this.config.copyTrading;
    const envWallets = this.config.env.copyTrading.wallets || [];
    
    this.walletsToMonitor = [
      ...(copyConfig.wallets || []),
      ...envWallets
    ].filter((w, i, arr) => {
      if (!isValidPublicKey(w)) {
        this.logger.warn(`Invalid wallet address: ${w}`);
        return false;
      }
      return arr.indexOf(w) === i;
    });

    if (this.walletsToMonitor.length === 0) {
      this.logger.warn('No valid wallets configured for copy trading');
      return;
    }

    this.logger.info(`Copy trading initialized with ${this.walletsToMonitor.length} wallets`);
    this.walletsToMonitor.forEach(w => {
      this.logger.info(`  → ${shortenAddress(w)}`);
    });
  }

  /**
   * Start monitoring wallets
   */
  async start() {
    if (this.walletsToMonitor.length === 0) {
      this.logger.warn('No wallets to monitor. Skipping copy trading.');
      return;
    }

    if (!this.config.copyTrading.enabled) {
      this.logger.info('Copy trading is disabled in config');
      return;
    }

    this.logger.info('Starting copy trading monitor...');
    await this.connect();
  }

  /**
   * Connect to WebSocket for wallet monitoring
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.env.helius.wsUrl;
      
      if (!wsUrl) {
        reject(new Error('WebSocket URL not configured'));
        return;
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.success('Copy trading WebSocket connected');
        
        this.startPingInterval();
        this.subscribeToWallets();
        
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        this.logger.error('Copy trading WebSocket error', { error: error.message });
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        this.stopPingInterval();
        this.logger.warn('Copy trading WebSocket closed');
        this.attemptReconnect();
      });

      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Subscribe to wallet transactions
   */
  subscribeToWallets() {
    const subscribeRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'transactionSubscribe',
      params: [
        {
          failed: false,
          vote: false,
          accountInclude: this.walletsToMonitor
        },
        {
          commitment: 'processed',
          encoding: 'jsonParsed',
          transactionDetails: 'full',
          maxSupportedTransactionVersion: 0
        }
      ]
    };

    this.ws.send(JSON.stringify(subscribeRequest));
    this.logger.info('Subscribed to wallet transactions');
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());

      if (message.result !== undefined && message.id === 2) {
        this.logger.info(`Copy trading subscription confirmed: ${message.result}`);
        return;
      }

      if (message.method === 'transactionNotification' && message.params?.result) {
        this.processWalletTransaction(message.params.result);
      }
    } catch (error) {
      this.logger.error('Failed to parse copy trading message', { error: error.message });
    }
  }

  /**
   * Process wallet transaction
   */
  async processWalletTransaction(result) {
    const signature = result.signature;
    
    if (this.processedSignatures.has(signature)) {
      return;
    }
    this.processedSignatures.add(signature);

    if (this.processedSignatures.size > this.maxProcessedSignatures) {
      const keysToDelete = Array.from(this.processedSignatures).slice(0, 500);
      keysToDelete.forEach(key => this.processedSignatures.delete(key));
    }

    try {
      const transaction = result.transaction;
      const meta = transaction?.meta;
      const accountKeys = transaction?.transaction?.message?.accountKeys || [];
      
      const keys = accountKeys.map(k => typeof k === 'string' ? k : k.pubkey);
      
      const walletIndex = keys.findIndex(k => this.walletsToMonitor.includes(k));
      if (walletIndex === -1) return;

      const wallet = keys[walletIndex];
      
      const swapInfo = this.detectSwap(meta, keys);
      
      if (!swapInfo) return;

      if (this.config.copyTrading.copyBuyOnly && swapInfo.type !== 'BUY') {
        return;
      }

      this.logger.copyTrade(wallet, swapInfo.tokenMint, {
        type: swapInfo.type,
        signature
      });

      if (swapInfo.type === 'BUY') {
        if (this.config.copyTrading.delayMs > 0) {
          await sleep(this.config.copyTrading.delayMs);
        }

        if (this.config.copyTrading.requireSecurityCheck) {
          const securityResult = await this.securityValidator.validateToken(swapInfo.tokenMint);
          if (!securityResult.passed) {
            this.logger.warn(`Security check failed for copied trade: ${swapInfo.tokenMint}`);
            return;
          }
        }

        this.emit('copyTrade', {
          wallet,
          tokenMint: swapInfo.tokenMint,
          type: swapInfo.type,
          signature,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      this.logger.error('Error processing wallet transaction', { error: error.message });
    }
  }

  /**
   * Detect if transaction is a swap and extract details
   */
  detectSwap(meta, accountKeys) {
    const preBalances = meta?.preTokenBalances || [];
    const postBalances = meta?.postTokenBalances || [];
    
    const balanceChanges = new Map();

    for (const post of postBalances) {
      const pre = preBalances.find(
        p => p.accountIndex === post.accountIndex && p.mint === post.mint
      );
      
      const preAmount = pre?.uiTokenAmount?.uiAmount || 0;
      const postAmount = post?.uiTokenAmount?.uiAmount || 0;
      const change = postAmount - preAmount;
      
      if (change !== 0 && post.mint !== KNOWN_MINTS.SOL) {
        balanceChanges.set(post.mint, {
          mint: post.mint,
          change,
          owner: post.owner
        });
      }
    }

    for (const [mint, data] of balanceChanges) {
      if (data.change > 0) {
        return {
          type: 'BUY',
          tokenMint: mint,
          amount: data.change
        };
      }
    }

    return null;
  }

  /**
   * Start ping interval
   */
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
  }

  /**
   * Stop ping interval
   */
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Attempt reconnection
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= 10) {
      this.logger.error('Max copy trading reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = 5000 * Math.pow(2, this.reconnectAttempts - 1);
    
    this.logger.info(`Reconnecting copy trading in ${delay / 1000}s`);
    await sleep(delay);

    try {
      await this.connect();
    } catch (error) {
      this.logger.error('Copy trading reconnection failed', { error: error.message });
    }
  }

  /**
   * Add wallet to monitoring list
   */
  addWallet(walletAddress) {
    if (!isValidPublicKey(walletAddress)) {
      throw new Error('Invalid wallet address');
    }

    if (!this.walletsToMonitor.includes(walletAddress)) {
      this.walletsToMonitor.push(walletAddress);
      this.logger.info(`Added wallet to copy trading: ${shortenAddress(walletAddress)}`);
      
      if (this.isConnected) {
        this.ws.close();
        this.connect();
      }
    }
  }

  /**
   * Remove wallet from monitoring list
   */
  removeWallet(walletAddress) {
    const index = this.walletsToMonitor.indexOf(walletAddress);
    if (index !== -1) {
      this.walletsToMonitor.splice(index, 1);
      this.logger.info(`Removed wallet from copy trading: ${shortenAddress(walletAddress)}`);
      
      if (this.isConnected && this.walletsToMonitor.length > 0) {
        this.ws.close();
        this.connect();
      }
    }
  }

  /**
   * Get monitored wallets
   */
  getMonitoredWallets() {
    return [...this.walletsToMonitor];
  }

  /**
   * Stop copy trading
   */
  stop() {
    this.stopPingInterval();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.logger.info('Copy trading stopped');
  }
}

export default CopyTrader;
