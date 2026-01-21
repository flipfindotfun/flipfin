/**
 * ============================================
 * BLOCKCHAIN MONITORING MODULE
 * ============================================
 * Monitors Solana blockchain for new token launches via WebSocket.
 * Supports: pump.fun, PumpSwap, Raydium AMM V4
 * 
 * Uses Helius Enhanced WebSockets for real-time transaction detection.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { getLogger } from './utils/logger.js';
import { PROGRAM_IDS, sleep } from './utils/helpers.js';

export class BlockchainMonitor extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.logger = getLogger();
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.pingInterval = null;
    this.subscriptionId = null;
    this.processedSignatures = new Set();
    this.maxProcessedSignatures = 10000;
  }

  /**
   * Start monitoring blockchain for new tokens
   */
  async start() {
    this.logger.info('Starting blockchain monitor...');
    await this.connect();
  }

  /**
   * Connect to Helius WebSocket
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.env.helius.wsUrl;
      
      if (!wsUrl) {
        reject(new Error('WebSocket URL not configured'));
        return;
      }

      this.logger.info(`Connecting to WebSocket: ${wsUrl.replace(/api-key=.*/, 'api-key=***')}`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.success('WebSocket connected');
        
        this.startPingInterval();
        this.subscribeToTransactions();
        
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        this.logger.error('WebSocket error', { error: error.message });
      });

      this.ws.on('close', (code, reason) => {
        this.isConnected = false;
        this.stopPingInterval();
        this.logger.warn(`WebSocket closed: ${code} - ${reason}`);
        
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
   * Subscribe to transactions from monitored programs
   */
  subscribeToTransactions() {
    const platforms = this.config.monitoring.platforms || ['pumpfun', 'raydium'];
    const accountsToMonitor = [];

    if (platforms.includes('pumpfun')) {
      accountsToMonitor.push(PROGRAM_IDS.PUMP_FUN);
    }
    if (platforms.includes('pumpswap')) {
      accountsToMonitor.push(PROGRAM_IDS.PUMP_SWAP);
    }
    if (platforms.includes('raydium')) {
      accountsToMonitor.push(PROGRAM_IDS.RAYDIUM_AMM_V4);
    }

    if (accountsToMonitor.length === 0) {
      this.logger.warn('No platforms configured for monitoring');
      return;
    }

    this.logger.info(`Subscribing to programs: ${accountsToMonitor.join(', ')}`);

    const subscribeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'transactionSubscribe',
      params: [
        {
          failed: false,
          vote: false,
          accountInclude: accountsToMonitor
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
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());

      if (message.result !== undefined && message.id === 1) {
        this.subscriptionId = message.result;
        this.logger.info(`Subscription confirmed: ${this.subscriptionId}`);
        return;
      }

      if (message.method === 'transactionNotification' && message.params?.result) {
        this.processTransaction(message.params.result);
      }
    } catch (error) {
      this.logger.error('Failed to parse WebSocket message', { error: error.message });
    }
  }

  /**
   * Process incoming transaction
   */
  processTransaction(result) {
    try {
      const signature = result.signature;
      
      if (this.processedSignatures.has(signature)) {
        return;
      }
      this.processedSignatures.add(signature);

      if (this.processedSignatures.size > this.maxProcessedSignatures) {
        const keysToDelete = Array.from(this.processedSignatures).slice(0, 1000);
        keysToDelete.forEach(key => this.processedSignatures.delete(key));
      }

      const transaction = result.transaction;
      const meta = transaction?.meta;
      const logs = meta?.logMessages || [];
      const accountKeys = transaction?.transaction?.message?.accountKeys || [];

      const pumpFunToken = this.detectPumpFunToken(logs, accountKeys, signature);
      if (pumpFunToken) {
        this.emit('newToken', pumpFunToken);
        return;
      }

      const pumpSwapPool = this.detectPumpSwapPool(logs, accountKeys, signature);
      if (pumpSwapPool) {
        this.emit('newToken', pumpSwapPool);
        return;
      }

      const raydiumPool = this.detectRaydiumPool(logs, accountKeys, signature, meta);
      if (raydiumPool) {
        this.emit('newToken', raydiumPool);
        return;
      }
    } catch (error) {
      this.logger.error('Error processing transaction', { error: error.message });
    }
  }

  /**
   * Detect new pump.fun token creation
   */
  detectPumpFunToken(logs, accountKeys, signature) {
    const isCreate = logs.some(log => 
      log.includes('Program log: Instruction: InitializeMint2') ||
      log.includes('Program log: Instruction: Create')
    );

    if (!isCreate) return null;

    const keys = accountKeys.map(k => typeof k === 'string' ? k : k.pubkey);
    
    const tokenData = {
      platform: 'pump.fun',
      signature,
      mint: keys[1] || null,
      creator: keys[0] || null,
      timestamp: Date.now(),
      metadata: {
        source: 'websocket',
        logs: logs.filter(l => l.includes('Program log:'))
      }
    };

    if (tokenData.mint) {
      this.logger.newToken('pump.fun', tokenData.mint, {
        creator: tokenData.creator,
        signature
      });
      return tokenData;
    }

    return null;
  }

  /**
   * Detect PumpSwap pool creation (pump.fun migration)
   */
  detectPumpSwapPool(logs, accountKeys, signature) {
    const isPoolCreate = logs.some(log => 
      log.includes('create_pool') || 
      log.includes('Program log: Instruction: Initialize')
    );

    if (!isPoolCreate) return null;

    const keys = accountKeys.map(k => typeof k === 'string' ? k : k.pubkey);

    for (const key of keys) {
      if (key === PROGRAM_IDS.PUMP_SWAP) {
        const tokenData = {
          platform: 'pumpswap',
          signature,
          mint: keys[2] || null,
          poolId: keys[1] || null,
          creator: keys[0] || null,
          timestamp: Date.now(),
          metadata: {
            source: 'websocket',
            migratedFromPumpFun: true
          }
        };

        if (tokenData.mint) {
          this.logger.newToken('PumpSwap', tokenData.mint, {
            poolId: tokenData.poolId,
            signature
          });
          return tokenData;
        }
      }
    }

    return null;
  }

  /**
   * Detect Raydium AMM pool creation
   */
  detectRaydiumPool(logs, accountKeys, signature, meta) {
    const isInitialize = logs.some(log => 
      log.includes('initialize2: InitializeInstruction2') ||
      log.includes('Program log: Instruction: Initialize2')
    );

    if (!isInitialize) return null;

    const keys = accountKeys.map(k => typeof k === 'string' ? k : k.pubkey);

    let baseMint = null;
    let quoteMint = null;

    const postTokenBalances = meta?.postTokenBalances || [];
    for (const balance of postTokenBalances) {
      if (balance.mint && balance.mint !== PROGRAM_IDS.TOKEN_PROGRAM) {
        if (!baseMint) {
          baseMint = balance.mint;
        } else if (!quoteMint && balance.mint !== baseMint) {
          quoteMint = balance.mint;
        }
      }
    }

    const tokenData = {
      platform: 'raydium',
      signature,
      ammId: keys[4] || null,
      baseMint,
      quoteMint,
      mint: baseMint,
      creator: keys[17] || keys[0] || null,
      timestamp: Date.now(),
      metadata: {
        source: 'websocket',
        poolType: 'AMM_V4'
      }
    };

    if (tokenData.ammId && tokenData.baseMint) {
      this.logger.newToken('Raydium', tokenData.baseMint, {
        ammId: tokenData.ammId,
        quoteMint: tokenData.quoteMint,
        signature
      });
      return tokenData;
    }

    return null;
  }

  /**
   * Start ping interval to keep connection alive
   */
  startPingInterval() {
    const pingIntervalMs = this.config.monitoring.pingIntervalMs || 30000;
    
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, pingIntervalMs);
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
   * Attempt to reconnect after disconnect
   */
  async attemptReconnect() {
    const maxAttempts = this.config.monitoring.maxReconnectAttempts || 10;
    const baseDelay = this.config.monitoring.reconnectDelayMs || 5000;

    if (this.reconnectAttempts >= maxAttempts) {
      this.logger.error('Max reconnection attempts reached. Stopping monitor.');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.logger.info(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${maxAttempts})`);
    
    await sleep(delay);

    try {
      await this.connect();
    } catch (error) {
      this.logger.error('Reconnection failed', { error: error.message });
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.logger.info('Stopping blockchain monitor...');
    this.stopPingInterval();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.processedSignatures.clear();
  }
}

export default BlockchainMonitor;
