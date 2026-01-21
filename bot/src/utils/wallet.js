/**
 * ============================================
 * WALLET MANAGEMENT MODULE
 * ============================================
 * Handles wallet generation, import, and secure key management.
 * 
 * SECURITY WARNINGS:
 * - Never share or expose your private key
 * - Use a dedicated trading wallet with limited funds
 * - Consider encrypting .env file in production
 * - For large sums, use hardware wallet + watch-only mode
 */

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLogger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WalletManager {
  constructor(connection) {
    this.connection = connection;
    this.keypair = null;
    this.logger = getLogger();
  }

  /**
   * Initialize wallet from private key or generate new one
   * @param {string|null} privateKeyBase58 - Base58 encoded private key
   * @returns {Keypair} Solana Keypair
   */
  async initialize(privateKeyBase58 = null) {
    if (privateKeyBase58 && privateKeyBase58 !== 'your_base58_encoded_private_key_here') {
      this.keypair = this.importFromPrivateKey(privateKeyBase58);
      this.logger.info(`Wallet loaded: ${this.keypair.publicKey.toString()}`);
    } else {
      this.logger.warn('No private key provided. Generating new wallet...');
      this.keypair = this.generateNewWallet();
    }

    await this.logBalance();
    return this.keypair;
  }

  /**
   * Import wallet from Base58 encoded private key
   * @param {string} privateKeyBase58 - Base58 encoded private key (64 bytes)
   * @returns {Keypair} Solana Keypair
   */
  importFromPrivateKey(privateKeyBase58) {
    try {
      const privateKeyBytes = bs58.decode(privateKeyBase58);
      
      if (privateKeyBytes.length !== 64) {
        throw new Error(`Invalid private key length: expected 64 bytes, got ${privateKeyBytes.length}`);
      }

      return Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
      this.logger.error('Failed to import private key', { error: error.message });
      throw new Error(`Invalid private key format: ${error.message}`);
    }
  }

  /**
   * Generate a new random wallet
   * WARNING: Save the generated keys immediately!
   * @returns {Keypair} New Solana Keypair
   */
  generateNewWallet() {
    const keypair = Keypair.generate();
    
    const privateKeyBase58 = bs58.encode(keypair.secretKey);
    const publicKey = keypair.publicKey.toString();

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║          🚨 NEW WALLET GENERATED - SAVE THESE KEYS! 🚨           ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log('║                                                                  ║');
    console.log(`║ Public Key:  ${publicKey.padEnd(50)}║`);
    console.log('║                                                                  ║');
    console.log('║ Private Key (KEEP SECRET):                                       ║');
    console.log(`║ ${privateKeyBase58.slice(0, 64).padEnd(66)}║`);
    console.log(`║ ${(privateKeyBase58.slice(64) || '').padEnd(66)}║`);
    console.log('║                                                                  ║');
    console.log('║ ⚠️  WARNINGS:                                                     ║');
    console.log('║ • Save these keys NOW - they won\'t be shown again!              ║');
    console.log('║ • Add PRIVATE_KEY to your .env file                              ║');
    console.log('║ • Fund this wallet with SOL before trading                       ║');
    console.log('║ • Use devnet for testing first!                                  ║');
    console.log('║                                                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    this.saveKeysToFile(publicKey, privateKeyBase58);

    return keypair;
  }

  /**
   * Save generated keys to a backup file (for safety)
   */
  saveKeysToFile(publicKey, privateKey) {
    const backupDir = path.join(__dirname, '../../');
    const backupFile = path.join(backupDir, '.wallet-backup.json');
    
    const backup = {
      generatedAt: new Date().toISOString(),
      publicKey,
      privateKey,
      warning: 'DELETE THIS FILE AFTER SAVING KEYS SECURELY!'
    };

    try {
      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
      this.logger.warn(`Wallet backup saved to ${backupFile} - DELETE AFTER SAVING!`);
    } catch (error) {
      this.logger.error('Could not save wallet backup file', { error: error.message });
    }
  }

  /**
   * Get current wallet balance
   * @returns {number} Balance in SOL
   */
  async getBalance() {
    if (!this.keypair) {
      throw new Error('Wallet not initialized');
    }

    const balance = await this.connection.getBalance(this.keypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Log current balance
   */
  async logBalance() {
    try {
      const balance = await this.getBalance();
      this.logger.info(`Wallet balance: ${balance.toFixed(4)} SOL`);
      
      if (balance < 0.01) {
        this.logger.warn('⚠️ Low balance! Fund your wallet before trading.');
      }
    } catch (error) {
      this.logger.error('Failed to fetch balance', { error: error.message });
    }
  }

  /**
   * Get public key string
   */
  getPublicKey() {
    return this.keypair?.publicKey.toString() || null;
  }

  /**
   * Get keypair for signing transactions
   */
  getKeypair() {
    return this.keypair;
  }

  /**
   * Check if wallet has sufficient balance
   * @param {number} requiredSOL - Required SOL amount
   * @returns {boolean}
   */
  async hasSufficientBalance(requiredSOL) {
    const balance = await this.getBalance();
    return balance >= requiredSOL;
  }
}

export default WalletManager;
