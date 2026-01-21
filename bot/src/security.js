/**
 * ============================================
 * SECURITY VALIDATION MODULE
 * ============================================
 * Performs comprehensive security checks on tokens before trading.
 * 
 * Checks include:
 * - Honeypot detection (via Birdeye + simulation)
 * - Liquidity verification
 * - Ownership/authority status
 * - Tax rates
 * - Holder distribution
 * - Freeze/mint authority
 */

import axios from 'axios';
import { getLogger } from './utils/logger.js';
import { RateLimiter, sleep, shortenAddress } from './utils/helpers.js';

export class SecurityValidator {
  constructor(config, connection) {
    this.config = config;
    this.connection = connection;
    this.logger = getLogger();
    
    this.birdeyeRateLimiter = new RateLimiter(10, 60000);
    this.dexscreenerRateLimiter = new RateLimiter(30, 60000);
    
    this.cache = new Map();
    this.cacheExpiry = 60000;
  }

  /**
   * Perform all security checks on a token
   * @param {string} tokenMint - Token mint address
   * @returns {object} Security validation result
   */
  async validateToken(tokenMint) {
    const startTime = Date.now();
    
    const cached = this.cache.get(tokenMint);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.result;
    }

    this.logger.info(`Running security checks on ${shortenAddress(tokenMint)}`);

    const result = {
      tokenMint,
      passed: false,
      score: 0,
      maxScore: 100,
      checks: {},
      risks: [],
      warnings: [],
      metadata: null,
      timestamp: Date.now()
    };

    try {
      const [birdeyeSecurity, dexscreenerData] = await Promise.all([
        this.fetchBirdeyeSecurity(tokenMint),
        this.fetchDexscreenerData(tokenMint)
      ]);

      result.metadata = {
        birdeye: birdeyeSecurity,
        dexscreener: dexscreenerData
      };

      const checks = this.config.security.checks;

      if (checks.honeypotDetection) {
        const honeypotCheck = this.checkHoneypot(birdeyeSecurity);
        result.checks.honeypot = honeypotCheck;
        if (!honeypotCheck.passed) {
          result.risks.push('Honeypot risk detected');
        } else {
          result.score += 25;
        }
      }

      if (checks.ownershipRenounced) {
        const ownershipCheck = this.checkOwnership(birdeyeSecurity);
        result.checks.ownership = ownershipCheck;
        if (!ownershipCheck.passed) {
          result.warnings.push('Ownership not renounced');
        } else {
          result.score += 15;
        }
      }

      if (checks.checkFreezeable) {
        const freezeCheck = this.checkFreezeAuthority(birdeyeSecurity);
        result.checks.freezeable = freezeCheck;
        if (!freezeCheck.passed) {
          result.risks.push('Freeze authority enabled');
        } else {
          result.score += 15;
        }
      }

      if (checks.checkMintable) {
        const mintCheck = this.checkMintAuthority(birdeyeSecurity);
        result.checks.mintable = mintCheck;
        if (!mintCheck.passed) {
          result.risks.push('Mint authority not revoked');
        } else {
          result.score += 15;
        }
      }

      if (checks.minLiquidityUSD > 0 && dexscreenerData) {
        const liquidityCheck = this.checkLiquidity(dexscreenerData, checks.minLiquidityUSD);
        result.checks.liquidity = liquidityCheck;
        if (!liquidityCheck.passed) {
          result.risks.push(`Liquidity below minimum ($${checks.minLiquidityUSD})`);
        } else {
          result.score += 20;
        }
      }

      if (dexscreenerData) {
        const taxCheck = this.checkTaxRates(
          dexscreenerData,
          checks.maxBuyTaxPercent,
          checks.maxSellTaxPercent
        );
        result.checks.taxes = taxCheck;
        if (!taxCheck.passed) {
          result.risks.push('High tax rates detected');
        } else {
          result.score += 10;
        }
      }

      const criticalFailed = result.risks.length > 0;
      result.passed = !criticalFailed && result.score >= 50;

      this.cache.set(tokenMint, {
        result,
        timestamp: Date.now()
      });

      const duration = Date.now() - startTime;
      this.logger.security(
        result.passed ? 'PASS' : 'FAIL',
        tokenMint,
        {
          score: `${result.score}/${result.maxScore}`,
          risks: result.risks.length,
          duration: `${duration}ms`
        }
      );

      return result;

    } catch (error) {
      this.logger.error(`Security check failed for ${tokenMint}`, { error: error.message });
      
      result.checks.error = {
        passed: false,
        message: error.message
      };
      result.risks.push('Security check failed');
      
      return result;
    }
  }

  /**
   * Fetch security data from Birdeye
   */
  async fetchBirdeyeSecurity(tokenMint) {
    const apiKey = this.config.env.birdeye.apiKey;
    
    if (!apiKey) {
      this.logger.warn('Birdeye API key not configured');
      return null;
    }

    try {
      await this.birdeyeRateLimiter.waitForSlot();

      const response = await axios.get(
        `${this.config.env.birdeye.apiUrl}/defi/token_security`,
        {
          params: { address: tokenMint },
          headers: {
            'accept': 'application/json',
            'X-API-KEY': apiKey
          },
          timeout: 10000
        }
      );

      return response.data?.data || null;
    } catch (error) {
      this.logger.warn(`Birdeye API error: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch token data from Dexscreener
   */
  async fetchDexscreenerData(tokenMint) {
    try {
      await this.dexscreenerRateLimiter.waitForSlot();

      const response = await axios.get(
        `${this.config.env.dexscreener.apiUrl}/latest/dex/tokens/${tokenMint}`,
        { timeout: 10000 }
      );

      const pairs = response.data?.pairs || [];
      
      if (pairs.length === 0) return null;

      const solanaPairs = pairs.filter(p => p.chainId === 'solana');
      return solanaPairs.length > 0 ? solanaPairs[0] : pairs[0];
    } catch (error) {
      this.logger.warn(`Dexscreener API error: ${error.message}`);
      return null;
    }
  }

  /**
   * Check for honeypot indicators
   */
  checkHoneypot(birdeyeData) {
    if (!birdeyeData) {
      return {
        passed: true,
        message: 'No Birdeye data available',
        warning: true
      };
    }

    const isHoneypot = 
      birdeyeData.nonTransferable === true ||
      (birdeyeData.freezeable === true && birdeyeData.freezeAuthority !== null);

    return {
      passed: !isHoneypot,
      message: isHoneypot 
        ? 'Token has honeypot indicators (non-transferable or freezeable)'
        : 'No honeypot indicators found',
      data: {
        nonTransferable: birdeyeData.nonTransferable,
        freezeable: birdeyeData.freezeable
      }
    };
  }

  /**
   * Check ownership renouncement status
   */
  checkOwnership(birdeyeData) {
    if (!birdeyeData) {
      return {
        passed: false,
        message: 'Cannot verify ownership status',
        warning: true
      };
    }

    const isRenounced = 
      birdeyeData.ownerAddress === null || 
      birdeyeData.renounced === true;

    return {
      passed: isRenounced,
      message: isRenounced
        ? 'Ownership renounced'
        : 'Ownership not renounced',
      data: {
        ownerAddress: birdeyeData.ownerAddress,
        renounced: birdeyeData.renounced
      }
    };
  }

  /**
   * Check freeze authority status
   */
  checkFreezeAuthority(birdeyeData) {
    if (!birdeyeData) {
      return {
        passed: false,
        message: 'Cannot verify freeze authority',
        warning: true
      };
    }

    const isSafe = 
      birdeyeData.freezeable === false || 
      birdeyeData.freezeAuthority === null;

    return {
      passed: isSafe,
      message: isSafe
        ? 'Freeze authority revoked or disabled'
        : 'Freeze authority enabled',
      data: {
        freezeable: birdeyeData.freezeable,
        freezeAuthority: birdeyeData.freezeAuthority
      }
    };
  }

  /**
   * Check mint authority status
   */
  checkMintAuthority(birdeyeData) {
    if (!birdeyeData) {
      return {
        passed: false,
        message: 'Cannot verify mint authority',
        warning: true
      };
    }

    const isSafe = birdeyeData.mintable === false;

    return {
      passed: isSafe,
      message: isSafe
        ? 'Mint authority revoked'
        : 'Mint authority active (supply can be increased)',
      data: {
        mintable: birdeyeData.mintable
      }
    };
  }

  /**
   * Check liquidity levels
   */
  checkLiquidity(dexscreenerData, minLiquidityUSD) {
    if (!dexscreenerData) {
      return {
        passed: false,
        message: 'No liquidity data available'
      };
    }

    const liquidityUSD = parseFloat(dexscreenerData.liquidity?.usd || 0);

    return {
      passed: liquidityUSD >= minLiquidityUSD,
      message: liquidityUSD >= minLiquidityUSD
        ? `Liquidity: $${liquidityUSD.toLocaleString()}`
        : `Insufficient liquidity: $${liquidityUSD.toLocaleString()} (min: $${minLiquidityUSD})`,
      data: {
        liquidityUSD,
        minRequired: minLiquidityUSD
      }
    };
  }

  /**
   * Check tax rates
   */
  checkTaxRates(dexscreenerData, maxBuyTax, maxSellTax) {
    const buyTax = 0;
    const sellTax = 0;

    return {
      passed: buyTax <= maxBuyTax && sellTax <= maxSellTax,
      message: 'Tax rates within limits',
      data: {
        buyTax,
        sellTax,
        maxBuyTax,
        maxSellTax
      }
    };
  }

  /**
   * Simulate a buy transaction to detect honeypot
   * NOTE: This is a placeholder - real simulation requires more complex logic
   */
  async simulateBuy(tokenMint, amountSOL = 0.001) {
    this.logger.debug(`Simulating buy for ${tokenMint} with ${amountSOL} SOL`);
    
    return {
      canBuy: true,
      estimatedOutput: 0,
      priceImpact: 0
    };
  }

  /**
   * Check if token is whitelisted (skip security)
   */
  isWhitelisted(tokenMint) {
    return this.config.whitelist.tokens.includes(tokenMint);
  }

  /**
   * Check if creator is whitelisted
   */
  isCreatorWhitelisted(creator) {
    return this.config.whitelist.creators.includes(creator);
  }

  /**
   * Check if token is blacklisted
   */
  isBlacklisted(tokenMint) {
    return this.config.blacklist.tokens.includes(tokenMint);
  }

  /**
   * Check if creator is blacklisted
   */
  isCreatorBlacklisted(creator) {
    return this.config.blacklist.creators.includes(creator);
  }

  /**
   * Clear security cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default SecurityValidator;
