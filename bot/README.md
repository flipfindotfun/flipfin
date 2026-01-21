# Solana Sniper Trading Bot

A production-ready Solana sniper trading bot inspired by GMGN.ai. This bot monitors the Solana blockchain in real-time for new token launches (pump.fun, Raydium, PumpSwap), conducts security validations, and automates buy/sell trades using the Jupiter Aggregator.

## Features

- **Real-time Monitoring**: WebSocket subscriptions via Helius RPC to detect new liquidity pools and token launches
- **Security Validation**: Honeypot detection, liquidity verification, ownership checks, freeze/mint authority validation
- **Automated Trading**: Buy/sell execution via Jupiter Swap API v1 with configurable slippage and priority fees
- **Auto-Sell Logic**: Profit targets (2x, 5x), trailing stop-loss, time-based exits, and stop-loss protection
- **Copy Trading**: Monitor and replicate trades from "smart money" wallet addresses
- **Modular Architecture**: Clean separation of concerns for easy customization

## ⚠️ Important Warnings

1. **NEVER share your private key** with anyone or commit it to version control
2. **Use a dedicated trading wallet** with limited funds - only trade what you can afford to lose
3. **Start with devnet** for testing before moving to mainnet
4. **Cryptocurrency trading carries significant risk** - this bot is for educational purposes
5. **API keys in this README** are examples - replace with your own secure keys

## Project Structure

```
bot/
├── src/
│   ├── index.js           # Main entry point
│   ├── monitor.js         # Blockchain monitoring module
│   ├── security.js        # Security validation module
│   ├── trader.js          # Trading engine with Jupiter
│   ├── copytrader.js      # Copy trading module
│   └── utils/
│       ├── config.js      # Configuration loader
│       ├── logger.js      # Logging utility
│       ├── wallet.js      # Wallet management
│       ├── helpers.js     # Common utilities
│       └── generateWallet.js  # Wallet generator
├── logs/                  # Log files (auto-created)
├── config.json            # Trading configuration
├── .env.example           # Environment variables template
├── .env                   # Your environment variables (create this)
└── package.json           # Node.js dependencies
```

## Quick Start

### Prerequisites

- **Node.js 18+** (required for native fetch support)
- **npm** or **yarn**
- **Solana wallet** with SOL for trading

### 1. Installation

```bash
# Navigate to the bot directory
cd bot

# Install dependencies
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
```

Required environment variables in `.env`:

```env
# Network: mainnet or devnet
NETWORK=devnet  # Start with devnet for testing!

# Your wallet private key (Base58 encoded)
# Export from Phantom: Settings > Security > Export Private Key
PRIVATE_KEY=your_base58_encoded_private_key_here

# Helius RPC (your API key)
HELIUS_API_KEY=your_helius_api_key
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_api_key
HELIUS_WS_URL=wss://mainnet.helius-rpc.com/?api-key=your_api_key

# Jupiter (optional but recommended)
JUPITER_API_KEY=your_jupiter_api_key

# Birdeye (for security checks)
BIRDEYE_API_KEY=your_birdeye_api_key

# Copy trading wallets (optional, comma-separated)
SMART_MONEY_WALLETS=wallet1,wallet2,wallet3
```

### 3. Generate a New Wallet (Optional)

If you don't have a wallet yet:

```bash
npm run generate-wallet
```

**IMPORTANT**: Save the generated keys immediately and add the private key to your `.env` file.

### 4. Fund Your Wallet

**For Devnet:**
```bash
# Get free devnet SOL from the faucet
# Visit: https://faucet.solana.com/
# Or use Solana CLI: solana airdrop 2 <your-public-key> --url devnet
```

**For Mainnet:**
- Transfer SOL from an exchange or another wallet
- Recommended: Start with 0.5-1 SOL for testing

### 5. Configure Trading Parameters

Edit `config.json` to customize:

```json
{
  "trading": {
    "buyAmountSOL": 0.1,        // Amount to spend per trade
    "maxBuyAmountSOL": 1.0,     // Maximum allowed buy
    "slippageBps": 1500,        // 15% slippage
    "autoSell": {
      "enabled": true,
      "profitTargetMultiplier": 2.0,   // Sell 50% at 2x
      "secondProfitTargetMultiplier": 5.0,  // Sell rest at 5x
      "trailingStopLossPercent": 20,   // Trailing stop
      "stopLossPercent": 50            // Hard stop loss
    }
  }
}
```

### 6. Run the Bot

```bash
# Start on mainnet (default)
npm start

# Start on devnet (recommended for testing)
npm run start:devnet

# Development mode with auto-reload
npm run dev
```

## Configuration Guide

### Trading Configuration (`config.json`)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `trading.buyAmountSOL` | SOL to spend per trade | 0.1 |
| `trading.maxBuyAmountSOL` | Maximum buy limit | 1.0 |
| `trading.slippageBps` | Slippage in basis points (100 = 1%) | 1500 |
| `trading.priorityFeeLamports` | Priority fee for faster execution | 10000000 |
| `trading.maxRetries` | Retry attempts for failed trades | 3 |

### Auto-Sell Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoSell.enabled` | Enable automatic selling | true |
| `autoSell.profitTargetMultiplier` | First profit target (e.g., 2x) | 2.0 |
| `autoSell.sellPercentageAtFirstTarget` | % to sell at first target | 50 |
| `autoSell.secondProfitTargetMultiplier` | Second target (sell 100%) | 5.0 |
| `autoSell.trailingStopLossPercent` | Trailing stop from peak | 20 |
| `autoSell.stopLossPercent` | Hard stop loss % | 50 |
| `autoSell.timeBasedExitMinutes` | Sell after X minutes | 15 |

### Security Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `security.enabled` | Enable security checks | true |
| `security.checks.honeypotDetection` | Check for honeypots | true |
| `security.checks.liquidityLockCheck` | Verify liquidity | true |
| `security.checks.ownershipRenounced` | Check ownership | true |
| `security.checks.minLiquidityUSD` | Minimum liquidity | 1000 |

### Copy Trading

| Parameter | Description | Default |
|-----------|-------------|---------|
| `copyTrading.enabled` | Enable copy trading | false |
| `copyTrading.maxCopyAmountSOL` | Max amount to copy | 0.5 |
| `copyTrading.requireSecurityCheck` | Run security before copy | true |

## Supported Platforms

- **pump.fun** - New token launches
- **PumpSwap** - pump.fun migrations to AMM
- **Raydium AMM V4** - New liquidity pools

## API Keys Setup

### 1. Helius RPC (Required)

1. Visit [helius.dev](https://helius.dev/)
2. Create a free account
3. Create a new project
4. Copy your API key

### 2. Jupiter Aggregator (Recommended)

1. Visit [portal.jup.ag](https://portal.jup.ag/)
2. Create a free account
3. Generate an API key
4. Free tier: 100 requests/minute

### 3. Birdeye (Recommended)

1. Visit [bds.birdeye.so](https://bds.birdeye.so/)
2. Create an account
3. Generate an API key from the Security tab

## Security Best Practices

### Protecting Your Private Key

1. **Never commit `.env` to Git** - It's already in `.gitignore`
2. **Use environment variables** - Don't hardcode keys
3. **Encrypt at rest** - Consider encrypting your `.env` file
4. **Dedicated wallet** - Use a separate wallet with limited funds
5. **Hardware wallet** - For large amounts, use a hardware wallet

### Recommended Wallet Setup

```bash
# Generate a new dedicated trading wallet
npm run generate-wallet

# Save the keys securely (password manager, encrypted file)
# Fund with only what you're willing to lose
# Never use your main wallet with significant holdings
```

## Deployment to VPS

### DigitalOcean Droplet Setup

1. **Create a Droplet**
   - Choose Ubuntu 22.04 LTS
   - Minimum: 1 GB RAM / 1 CPU
   - Recommended: 2 GB RAM / 2 CPU

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and Setup**
   ```bash
   git clone <your-repo>
   cd bot
   npm install
   cp .env.example .env
   nano .env  # Configure your settings
   ```

4. **Run with PM2**
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name sniper-bot
   pm2 save
   pm2 startup
   ```

5. **Monitor Logs**
   ```bash
   pm2 logs sniper-bot
   ```

### Security Hardening

```bash
# Enable firewall
sudo ufw allow OpenSSH
sudo ufw enable

# Secure .env file
chmod 600 .env

# Use non-root user
sudo adduser botuser
sudo usermod -aG sudo botuser
```

## Troubleshooting

### Common Issues

**1. "WebSocket connection timeout"**
- Check your Helius API key
- Verify internet connection
- Try a different RPC endpoint

**2. "Insufficient SOL balance"**
- Fund your wallet with more SOL
- Account for transaction fees (~0.01 SOL per trade)

**3. "Failed to get quote from Jupiter"**
- Token may not have liquidity yet
- Try increasing slippage
- Check if Jupiter API is operational

**4. "Security check failed"**
- Token failed safety checks (good - you were protected!)
- Review the security logs for details

**5. "Transaction failed"**
- Increase priority fee in config
- Increase slippage
- Check for network congestion

### Logs

Logs are saved to `./logs/` directory:
- Console output with colors
- File logs with timestamps
- Error tracking for debugging

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Disclaimer

This software is provided for educational purposes only. Trading cryptocurrencies involves substantial risk of loss. The developers are not responsible for any financial losses incurred through the use of this bot. Always do your own research and never invest more than you can afford to lose.

## License

MIT License - see LICENSE file for details
