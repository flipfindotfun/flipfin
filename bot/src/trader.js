/**
 * ============================================
 * TRADING MODULE
 * ============================================
 * Handles all trading operations using Jupiter Aggregator.
 * 
 * Features:
 * - Buy/Sell execution via Jupiter Swap API v1
 * - Auto-sell with profit targets and trailing stop-loss
 * - Transaction retry with exponential backoff
 * - Position tracking and P&L calculation
 */

import { Connection, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createJupiterApiClient } from '@jup-ag/api';
import { getLogger } from './utils/logger.js';
import { 
  retry, 
  sleep, 
  solToLamports, 
  formatSOL, 
  shortenAddress,
  KNOWN_MINTS 
} from './utils/helpers.js';


export class TradingEngine {
  constructor(config, connection, walletManager) {
    this.config = config;
    this.connection = connection;
    this.walletManager = walletManager;
    this.logger = getLogger();
    
    this.jupiter = createJupiterApiClient({
      basePath: config.env.jupiter.swapApiUrl,
      fetchOptions: {
        headers: config.env.jupiter.apiKey 
          ? { 'x-api-key': config.env.jupiter.apiKey }
          : {}
      }
    });

    this.positions = new Map();
    this.pendingOrders = new Map();
    this.tradeHistory = [];
    
    this.autoSellMonitorInterval = null;
  }

  /**
   * Initialize trading engine and start auto-sell monitor
   */
  async initialize() {
    this.logger.info('Initializing trading engine...');
    
    if (this.config.trading.autoSell.enabled) {
      this.startAutoSellMonitor();
    }

    this.logger.success('Trading engine initialized');
  }

  /**
   * Execute a buy order for a token
   * @param {string} tokenMint - Token to buy
   * @param {number} amountSOL - Amount of SOL to spend
   * @returns {object} Trade result
   */
  async buy(tokenMint, amountSOL = null) {
    const buyAmount = amountSOL || this.config.trading.buyAmountSOL;
    
    if (buyAmount > this.config.trading.maxBuyAmountSOL) {
      throw new Error(`Buy amount ${buyAmount} SOL exceeds max ${this.config.trading.maxBuyAmountSOL} SOL`);
    }

    const hasBalance = await this.walletManager.hasSufficientBalance(buyAmount + 0.01);
    if (!hasBalance) {
      throw new Error('Insufficient SOL balance');
    }

    this.logger.trade('BUY_INITIATED', tokenMint, { amountSOL: buyAmount });

    try {
      const result = await retry(
        () => this.executeSwap(KNOWN_MINTS.SOL, tokenMint, solToLamports(buyAmount)),
        this.config.trading.maxRetries,
        this.config.trading.retryDelayMs
      );

      const position = {
        tokenMint,
        entryAmountSOL: buyAmount,
        entryTokenAmount: result.outputAmount,
        entryPrice: buyAmount / result.outputAmount,
        entryTime: Date.now(),
        signature: result.signature,
        peakValue: buyAmount,
        currentValue: buyAmount
      };

      this.positions.set(tokenMint, position);

      this.tradeHistory.push({
        type: 'BUY',
        tokenMint,
        amountSOL: buyAmount,
        tokenAmount: result.outputAmount,
        signature: result.signature,
        timestamp: Date.now()
      });

      this.logger.trade('BUY_SUCCESS', tokenMint, {
        amountSOL: buyAmount,
        tokensReceived: result.outputAmount,
        signature: shortenAddress(result.signature, 8)
      });

      return {
        success: true,
        ...result,
        position
      };

    } catch (error) {
      this.logger.error(`Buy failed for ${tokenMint}`, { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a sell order for a token
   * @param {string} tokenMint - Token to sell
   * @param {number} percentageToSell - Percentage of holdings to sell (0-100)
   * @returns {object} Trade result
   */
  async sell(tokenMint, percentageToSell = 100) {
    const position = this.positions.get(tokenMint);
    
    if (!position) {
      throw new Error(`No position found for ${tokenMint}`);
    }

    const amountToSell = Math.floor(position.entryTokenAmount * (percentageToSell / 100));
    
    this.logger.trade('SELL_INITIATED', tokenMint, { 
      percentage: percentageToSell,
      tokenAmount: amountToSell 
    });

    try {
      const result = await retry(
        () => this.executeSwap(tokenMint, KNOWN_MINTS.SOL, amountToSell),
        this.config.trading.maxRetries,
        this.config.trading.retryDelayMs
      );

      const solReceived = Number(result.outputAmount) / LAMPORTS_PER_SOL;
      const profit = solReceived - (position.entryAmountSOL * (percentageToSell / 100));
      const profitPercent = (profit / (position.entryAmountSOL * (percentageToSell / 100))) * 100;

      if (percentageToSell >= 100) {
        this.positions.delete(tokenMint);
      } else {
        position.entryTokenAmount -= amountToSell;
        position.entryAmountSOL *= (1 - percentageToSell / 100);
      }

      this.tradeHistory.push({
        type: 'SELL',
        tokenMint,
        amountSOL: solReceived,
        tokenAmount: amountToSell,
        profit,
        profitPercent,
        signature: result.signature,
        timestamp: Date.now()
      });

      this.logger.trade('SELL_SUCCESS', tokenMint, {
        solReceived: solReceived.toFixed(4),
        profit: profit.toFixed(4),
        profitPercent: profitPercent.toFixed(2) + '%',
        signature: shortenAddress(result.signature, 8)
      });

      return {
        success: true,
        ...result,
        solReceived,
        profit,
        profitPercent
      };

    } catch (error) {
      this.logger.error(`Sell failed for ${tokenMint}`, { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a swap via Jupiter
   * @param {string} inputMint - Input token mint
   * @param {string} outputMint - Output token mint
   * @param {number} amount - Amount in smallest units
   * @returns {object} Swap result
   */
  async executeSwap(inputMint, outputMint, amount) {
    const keypair = this.walletManager.getKeypair();
    
    if (!keypair) {
      throw new Error('Wallet not initialized');
    }

    this.logger.debug('Getting quote...', { inputMint, outputMint, amount });

    const quoteResponse = await this.jupiter.quoteGet({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: this.config.trading.slippageBps,
      onlyDirectRoutes: false
    });

    if (!quoteResponse) {
      throw new Error('Failed to get quote from Jupiter');
    }

    this.logger.debug('Quote received', {
      inAmount: quoteResponse.inAmount,
      outAmount: quoteResponse.outAmount,
      priceImpact: quoteResponse.priceImpactPct
    });

    const swapResponse = await this.jupiter.swapPost({
      swapRequest: {
        quoteResponse,
        userPublicKey: keypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            priorityLevel: 'veryHigh',
            maxLamports: this.config.trading.priorityFeeLamports
          }
        }
      }
    });

    if (!swapResponse?.swapTransaction) {
      throw new Error('Failed to get swap transaction from Jupiter');
    }

    const transactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuf);

    transaction.sign([keypair]);

    const signature = await this.connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: this.config.advanced.skipPreflight,
        maxRetries: 2
      }
    );

    this.logger.debug('Transaction sent', { signature });

    const confirmation = await this.connection.confirmTransaction(
      signature,
      this.config.advanced.commitment || 'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return {
      signature,
      inputAmount: Number(quoteResponse.inAmount),
      outputAmount: Number(quoteResponse.outAmount),
      priceImpact: quoteResponse.priceImpactPct
    };
  }

  /**
   * Start auto-sell monitoring for positions
   */
  startAutoSellMonitor() {
    const checkInterval = 5000;

    this.autoSellMonitorInterval = setInterval(async () => {
      await this.checkAutoSellConditions();
    }, checkInterval);

    this.logger.info('Auto-sell monitor started');
  }

  /**
   * Check all positions for auto-sell conditions
   */
  async checkAutoSellConditions() {
    for (const [tokenMint, position] of this.positions) {
      try {
        const currentValue = await this.getPositionValue(tokenMint, position);
        
        if (currentValue === null) continue;

        position.currentValue = currentValue;

        if (currentValue > position.peakValue) {
          position.peakValue = currentValue;
        }

        const autoSell = this.config.trading.autoSell;
        const multiplier = currentValue / position.entryAmountSOL;

        if (multiplier >= autoSell.secondProfitTargetMultiplier) {
          this.logger.info(`Second profit target hit for ${shortenAddress(tokenMint)}: ${multiplier.toFixed(2)}x`);
          await this.sell(tokenMint, 100);
          continue;
        }

        if (multiplier >= autoSell.profitTargetMultiplier && !position.firstTargetHit) {
          this.logger.info(`First profit target hit for ${shortenAddress(tokenMint)}: ${multiplier.toFixed(2)}x`);
          await this.sell(tokenMint, autoSell.sellPercentageAtFirstTarget);
          position.firstTargetHit = true;
          continue;
        }

        const timeSinceEntry = Date.now() - position.entryTime;
        const timeBasedExitMs = autoSell.timeBasedExitMinutes * 60 * 1000;
        
        if (timeSinceEntry >= timeBasedExitMs) {
          this.logger.info(`Time-based exit for ${shortenAddress(tokenMint)}`);
          await this.sell(tokenMint, 100);
          continue;
        }

        const stopLossMultiplier = 1 - (autoSell.stopLossPercent / 100);
        if (multiplier <= stopLossMultiplier) {
          this.logger.warn(`Stop-loss triggered for ${shortenAddress(tokenMint)}: ${multiplier.toFixed(2)}x`);
          await this.sell(tokenMint, 100);
          continue;
        }

        const trailingStopValue = position.peakValue * (1 - autoSell.trailingStopLossPercent / 100);
        if (currentValue <= trailingStopValue && position.peakValue > position.entryAmountSOL * 1.1) {
          this.logger.warn(`Trailing stop triggered for ${shortenAddress(tokenMint)}`);
          await this.sell(tokenMint, 100);
          continue;
        }

      } catch (error) {
        this.logger.error(`Auto-sell check failed for ${tokenMint}`, { error: error.message });
      }
    }
  }

  /**
   * Get current value of a position in SOL
   */
  async getPositionValue(tokenMint, position) {
    try {
      const quoteResponse = await this.jupiter.quoteGet({
        inputMint: tokenMint,
        outputMint: KNOWN_MINTS.SOL,
        amount: position.entryTokenAmount.toString(),
        slippageBps: 100
      });

      if (!quoteResponse) return null;

      return Number(quoteResponse.outAmount) / LAMPORTS_PER_SOL;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all open positions
   */
  getPositions() {
    return Array.from(this.positions.values());
  }

  /**
   * Get trade history
   */
  getTradeHistory() {
    return this.tradeHistory;
  }

  /**
   * Calculate total P&L
   */
  getTotalPnL() {
    return this.tradeHistory
      .filter(t => t.type === 'SELL')
      .reduce((total, trade) => total + (trade.profit || 0), 0);
  }

  /**
   * Stop trading engine
   */
  stop() {
    if (this.autoSellMonitorInterval) {
      clearInterval(this.autoSellMonitorInterval);
      this.autoSellMonitorInterval = null;
    }
    this.logger.info('Trading engine stopped');
  }
}

export default TradingEngine;
