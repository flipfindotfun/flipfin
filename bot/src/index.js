/**
 * ============================================
 * SOLANA SNIPER BOT - MAIN ENTRY POINT
 * ============================================
 * 
 * A production-ready Solana sniper trading bot inspired by GMGN.ai.
 * 
 * Features:
 * - Real-time monitoring for new token launches (pump.fun, Raydium, PumpSwap)
 * - Comprehensive security validation (honeypot, liquidity, ownership)
 * - Automated buy/sell with Jupiter Aggregator
 * - Copy trading from smart money wallets
 * - Configurable profit targets and stop-loss
 * 
 * DISCLAIMER:
 * Trading cryptocurrencies carries significant risk. This bot is provided
 * for educational purposes. Use at your own risk. Never trade with funds
 * you cannot afford to lose.
 */

import { Connection } from '@solana/web3.js';
import { loadConfig, validateConfig } from './utils/config.js';
import { initLogger, getLogger } from './utils/logger.js';
import { WalletManager } from './utils/wallet.js';
import { BlockchainMonitor } from './monitor.js';
import { SecurityValidator } from './security.js';
import { TradingEngine } from './trader.js';
import { CopyTrader } from './copytrader.js';
import { shortenAddress } from './utils/helpers.js';

class SniperBot {
  constructor() {
    this.config = null;
    this.logger = null;
    this.connection = null;
    this.wallet = null;
    this.monitor = null;
    this.security = null;
    this.trader = null;
    this.copyTrader = null;
    this.isRunning = false;
  }

  /**
   * Initialize all bot components
   */
  async initialize() {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ███████╗███╗   ██╗██╗██████╗ ███████╗██████╗     ██████╗  ██████╗ ████████╗ ║
║   ██╔════╝████╗  ██║██║██╔══██╗██╔════╝██╔══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝ ║
║   ███████╗██╔██╗ ██║██║██████╔╝█████╗  ██████╔╝    ██████╔╝██║   ██║   ██║    ║
║   ╚════██║██║╚██╗██║██║██╔═══╝ ██╔══╝  ██╔══██╗    ██╔══██╗██║   ██║   ██║    ║
║   ███████║██║ ╚████║██║██║     ███████╗██║  ██║    ██████╔╝╚██████╔╝   ██║    ║
║   ╚══════╝╚═╝  ╚═══╝╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝    ╚═════╝  ╚═════╝    ╚═╝    ║
║                                                                   ║
║                   Solana Sniper Trading Bot v1.0                  ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);

    this.config = loadConfig();

    this.logger = initLogger({
      level: this.config.logging.level,
      toFile: this.config.logging.toFile
    });

    const validation = validateConfig(this.config);
    
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => this.logger.warn(`Config warning: ${w}`));
    }

    if (!validation.valid) {
      validation.errors.forEach(e => this.logger.error(`Config error: ${e}`));
      throw new Error('Invalid configuration. Please check your .env and config.json files.');
    }

    this.logger.info(`Network: ${this.config.env.network.toUpperCase()}`);
    this.logger.info(`RPC: ${this.config.env.helius.rpcUrl?.replace(/api-key=.*/, 'api-key=***')}`);

    this.connection = new Connection(
      this.config.env.helius.rpcUrl,
      {
        commitment: this.config.advanced.commitment || 'confirmed',
        confirmTransactionInitialTimeout: 60000
      }
    );

    const slot = await this.connection.getSlot();
    this.logger.success(`Connected to Solana (slot: ${slot})`);

    this.wallet = new WalletManager(this.connection);
    await this.wallet.initialize(this.config.env.privateKey);

    this.security = new SecurityValidator(this.config, this.connection);

    this.trader = new TradingEngine(this.config, this.connection, this.wallet);
    await this.trader.initialize();

    this.monitor = new BlockchainMonitor(this.config);
    
    this.monitor.on('newToken', (tokenData) => this.handleNewToken(tokenData));
    this.monitor.on('error', (error) => this.handleMonitorError(error));

    this.copyTrader = new CopyTrader(this.config, this.security);
    await this.copyTrader.initialize();
    
    this.copyTrader.on('copyTrade', (tradeData) => this.handleCopyTrade(tradeData));

    this.setupGracefulShutdown();

    this.logger.success('Bot initialization complete!');
    this.logConfiguration();
  }

  /**
   * Log current configuration summary
   */
  logConfiguration() {
    console.log('\n');
    this.logger.info('═══════════════════════════════════════════════════════════');
    this.logger.info('                    CONFIGURATION SUMMARY                   ');
    this.logger.info('═══════════════════════════════════════════════════════════');
    this.logger.info(`Wallet: ${this.wallet.getPublicKey()}`);
    this.logger.info(`Buy Amount: ${this.config.trading.buyAmountSOL} SOL`);
    this.logger.info(`Max Buy: ${this.config.trading.maxBuyAmountSOL} SOL`);
    this.logger.info(`Slippage: ${this.config.trading.slippageBps / 100}%`);
    this.logger.info(`Platforms: ${this.config.monitoring.platforms.join(', ')}`);
    this.logger.info(`Security Checks: ${this.config.security.enabled ? 'ENABLED' : 'DISABLED'}`);
    this.logger.info(`Auto-Sell: ${this.config.trading.autoSell.enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (this.config.trading.autoSell.enabled) {
      this.logger.info(`  → First Target: ${this.config.trading.autoSell.profitTargetMultiplier}x (sell ${this.config.trading.autoSell.sellPercentageAtFirstTarget}%)`);
      this.logger.info(`  → Second Target: ${this.config.trading.autoSell.secondProfitTargetMultiplier}x (sell 100%)`);
      this.logger.info(`  → Stop Loss: ${this.config.trading.autoSell.stopLossPercent}%`);
      this.logger.info(`  → Trailing Stop: ${this.config.trading.autoSell.trailingStopLossPercent}%`);
      this.logger.info(`  → Time Exit: ${this.config.trading.autoSell.timeBasedExitMinutes} minutes`);
    }
    
    this.logger.info(`Copy Trading: ${this.config.copyTrading.enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (this.config.copyTrading.enabled) {
      const wallets = this.copyTrader.getMonitoredWallets();
      this.logger.info(`  → Monitoring ${wallets.length} wallet(s)`);
    }
    
    this.logger.info('═══════════════════════════════════════════════════════════');
    console.log('\n');
  }

  /**
   * Start the bot
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn('Bot is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting Sniper Bot...');

    try {
      await this.monitor.start();
      
      if (this.config.copyTrading.enabled) {
        await this.copyTrader.start();
      }

      this.logger.success('🚀 Bot is now running and monitoring for opportunities!');
      this.logger.info('Press Ctrl+C to stop the bot gracefully.');
      
    } catch (error) {
      this.logger.error('Failed to start bot', { error: error.message });
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Handle new token detection
   */
  async handleNewToken(tokenData) {
    const { platform, mint, creator, signature } = tokenData;

    if (!mint) {
      this.logger.warn('Received token data without mint address');
      return;
    }

    if (this.security.isBlacklisted(mint)) {
      this.logger.info(`Token ${shortenAddress(mint)} is blacklisted. Skipping.`);
      return;
    }

    if (creator && this.security.isCreatorBlacklisted(creator)) {
      this.logger.info(`Creator ${shortenAddress(creator)} is blacklisted. Skipping.`);
      return;
    }

    const isWhitelisted = this.security.isWhitelisted(mint) || 
                          (creator && this.security.isCreatorWhitelisted(creator));

    if (this.config.security.enabled && !isWhitelisted) {
      this.logger.info(`Running security checks for ${shortenAddress(mint)}...`);
      
      const securityResult = await this.security.validateToken(mint);
      
      if (!securityResult.passed) {
        this.logger.warn(`Security check failed for ${shortenAddress(mint)}`, {
          risks: securityResult.risks,
          score: `${securityResult.score}/${securityResult.maxScore}`
        });
        return;
      }
    } else if (isWhitelisted) {
      this.logger.info(`Token ${shortenAddress(mint)} is whitelisted. Skipping security checks.`);
    }

    this.logger.info(`🎯 Attempting to buy ${shortenAddress(mint)} from ${platform}`);

    try {
      const result = await this.trader.buy(mint);
      
      if (result.success) {
        this.logger.success(`✅ Successfully bought ${shortenAddress(mint)}!`, {
          signature: shortenAddress(result.signature, 8),
          tokensReceived: result.outputAmount
        });
      } else {
        this.logger.error(`❌ Failed to buy ${shortenAddress(mint)}`, {
          error: result.error
        });
      }
    } catch (error) {
      this.logger.error(`Error during buy attempt`, { error: error.message });
    }
  }

  /**
   * Handle copy trade signal
   */
  async handleCopyTrade(tradeData) {
    const { wallet, tokenMint, type, signature } = tradeData;

    this.logger.info(`📋 Copy trade signal from ${shortenAddress(wallet)}: ${type} ${shortenAddress(tokenMint)}`);

    if (type !== 'BUY') {
      this.logger.info('Only copying buy trades. Skipping.');
      return;
    }

    const copyAmount = Math.min(
      this.config.copyTrading.maxCopyAmountSOL,
      this.config.trading.buyAmountSOL * (this.config.copyTrading.copyPercentage / 100)
    );

    try {
      const result = await this.trader.buy(tokenMint, copyAmount);
      
      if (result.success) {
        this.logger.success(`✅ Copy trade successful: ${shortenAddress(tokenMint)}`, {
          copiedFrom: shortenAddress(wallet),
          amount: `${copyAmount} SOL`
        });
      } else {
        this.logger.error(`❌ Copy trade failed: ${shortenAddress(tokenMint)}`, {
          error: result.error
        });
      }
    } catch (error) {
      this.logger.error('Copy trade error', { error: error.message });
    }
  }

  /**
   * Handle monitor errors
   */
  handleMonitorError(error) {
    this.logger.error('Monitor error', { error: error.message });
    
    if (error.message === 'Max reconnection attempts reached') {
      this.logger.error('Monitor failed to reconnect. Consider restarting the bot.');
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      this.logger.info(`\nReceived ${signal}. Shutting down gracefully...`);
      
      this.isRunning = false;

      if (this.monitor) {
        this.monitor.stop();
      }

      if (this.copyTrader) {
        this.copyTrader.stop();
      }

      if (this.trader) {
        this.trader.stop();
        
        const positions = this.trader.getPositions();
        if (positions.length > 0) {
          this.logger.warn(`You have ${positions.length} open position(s). Consider selling before shutdown.`);
          positions.forEach(p => {
            this.logger.info(`  → ${shortenAddress(p.tokenMint)}: ${p.entryAmountSOL} SOL`);
          });
        }

        const totalPnL = this.trader.getTotalPnL();
        this.logger.info(`Session P&L: ${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(4)} SOL`);
      }

      this.logger.info('Shutdown complete. Goodbye!');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled rejection', { reason });
    });
  }

  /**
   * Stop the bot
   */
  async stop() {
    this.logger.info('Stopping bot...');
    
    if (this.monitor) this.monitor.stop();
    if (this.copyTrader) this.copyTrader.stop();
    if (this.trader) this.trader.stop();
    
    this.isRunning = false;
    this.logger.info('Bot stopped');
  }
}

async function main() {
  const bot = new SniperBot();

  try {
    await bot.initialize();
    await bot.start();
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();

export { SniperBot };
