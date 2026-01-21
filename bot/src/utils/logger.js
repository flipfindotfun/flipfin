/**
 * ============================================
 * LOGGER MODULE
 * ============================================
 * Handles all logging with timestamps, levels, and file output.
 * Supports: debug, info, warn, error levels
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class Logger {
  constructor(options = {}) {
    this.level = LOG_LEVELS[options.level || 'info'];
    this.toFile = options.toFile || false;
    this.logDir = options.logDir || path.join(__dirname, '../../logs');
    this.maxFileSizeMB = options.maxFileSizeMB || 10;
    this.currentLogFile = null;

    if (this.toFile) {
      this.ensureLogDirectory();
      this.createNewLogFile();
    }
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  createNewLogFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentLogFile = path.join(this.logDir, `bot-${timestamp}.log`);
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  writeToFile(formattedMessage) {
    if (!this.toFile || !this.currentLogFile) return;

    try {
      const stats = fs.existsSync(this.currentLogFile) 
        ? fs.statSync(this.currentLogFile) 
        : { size: 0 };

      if (stats.size > this.maxFileSizeMB * 1024 * 1024) {
        this.createNewLogFile();
      }

      fs.appendFileSync(this.currentLogFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  debug(message, data = null) {
    if (this.level > LOG_LEVELS.debug) return;
    const formatted = this.formatMessage('debug', message, data);
    console.log(`${COLORS.dim}${formatted}${COLORS.reset}`);
    this.writeToFile(formatted);
  }

  info(message, data = null) {
    if (this.level > LOG_LEVELS.info) return;
    const formatted = this.formatMessage('info', message, data);
    console.log(`${COLORS.cyan}${formatted}${COLORS.reset}`);
    this.writeToFile(formatted);
  }

  success(message, data = null) {
    if (this.level > LOG_LEVELS.info) return;
    const formatted = this.formatMessage('success', message, data);
    console.log(`${COLORS.green}${COLORS.bright}${formatted}${COLORS.reset}`);
    this.writeToFile(formatted);
  }

  warn(message, data = null) {
    if (this.level > LOG_LEVELS.warn) return;
    const formatted = this.formatMessage('warn', message, data);
    console.log(`${COLORS.yellow}${formatted}${COLORS.reset}`);
    this.writeToFile(formatted);
  }

  error(message, data = null) {
    const formatted = this.formatMessage('error', message, data);
    console.log(`${COLORS.red}${COLORS.bright}${formatted}${COLORS.reset}`);
    this.writeToFile(formatted);
  }

  trade(action, tokenMint, details = {}) {
    const message = `[TRADE] ${action}: ${tokenMint}`;
    const formatted = this.formatMessage('trade', message, details);
    console.log(`${COLORS.magenta}${COLORS.bright}${formatted}${COLORS.reset}`);
    this.writeToFile(formatted);
  }

  security(result, tokenMint, details = {}) {
    const icon = result === 'PASS' ? '✓' : '✗';
    const color = result === 'PASS' ? COLORS.green : COLORS.red;
    const message = `[SECURITY ${icon}] ${result}: ${tokenMint}`;
    const formatted = this.formatMessage('security', message, details);
    console.log(`${color}${formatted}${COLORS.reset}`);
    this.writeToFile(formatted);
  }

  newToken(platform, tokenMint, details = {}) {
    const message = `[NEW TOKEN] ${platform}: ${tokenMint}`;
    const formatted = this.formatMessage('token', message, details);
    console.log(`${COLORS.blue}${COLORS.bright}${formatted}${COLORS.reset}`);
    this.writeToFile(formatted);
  }

  copyTrade(wallet, tokenMint, details = {}) {
    const message = `[COPY] From ${wallet.slice(0, 8)}...: ${tokenMint}`;
    const formatted = this.formatMessage('copy', message, details);
    console.log(`${COLORS.yellow}${COLORS.bright}${formatted}${COLORS.reset}`);
    this.writeToFile(formatted);
  }
}

let loggerInstance = null;

export function initLogger(config = {}) {
  loggerInstance = new Logger({
    level: config.level || process.env.LOG_LEVEL || 'info',
    toFile: config.toFile ?? process.env.LOG_TO_FILE === 'true',
    logDir: config.logDir,
    maxFileSizeMB: config.maxFileSizeMB
  });
  return loggerInstance;
}

export function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

export default Logger;
