/**
 * ============================================
 * WALLET GENERATOR UTILITY
 * ============================================
 * Standalone script to generate a new Solana wallet.
 * Run with: npm run generate-wallet
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

function generateWallet() {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toString();
  const privateKeyBase58 = bs58.encode(keypair.secretKey);

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              🔐 NEW SOLANA WALLET GENERATED 🔐                    ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                  ║');
  console.log('║ PUBLIC KEY (Wallet Address):                                     ║');
  console.log(`║ ${publicKey.padEnd(66)}║`);
  console.log('║                                                                  ║');
  console.log('║ PRIVATE KEY (Keep Secret!):                                      ║');
  console.log(`║ ${privateKeyBase58.slice(0, 66).padEnd(66)}║`);
  if (privateKeyBase58.length > 66) {
    console.log(`║ ${privateKeyBase58.slice(66).padEnd(66)}║`);
  }
  console.log('║                                                                  ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║                        ⚠️  IMPORTANT ⚠️                          ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║ 1. SAVE these keys somewhere safe immediately!                   ║');
  console.log('║ 2. Add PRIVATE_KEY to your .env file:                            ║');
  console.log('║    PRIVATE_KEY=<your_private_key_here>                           ║');
  console.log('║ 3. NEVER share your private key with anyone!                     ║');
  console.log('║ 4. Fund this wallet with SOL before using the bot                ║');
  console.log('║ 5. Use devnet for testing first!                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log('Environment variable format:');
  console.log(`PRIVATE_KEY=${privateKeyBase58}`);
  console.log('\n');
}

generateWallet();
