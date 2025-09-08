// utils.js
const fs = require('fs');
const path = require('path');
const config = require('./config');

class Logger {
  constructor() {
    this.logDir = config.paths.logsDir;
    this.initializeLogDirectory();
  }

  async initializeLogDirectory() {
    try {
      await fs.promises.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Error creating log directory:', error);
    }
  }

  formatMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    return JSON.stringify({ timestamp, level: level.toUpperCase(), message, ...metadata });
  }

  async writeToFile(level, message, metadata = {}) {
    if (!config.logging.enableFileLogging) return;
    try {
      const filename = `${new Date().toISOString().split('T')[0]}.log`;
      const filepath = path.join(this.logDir, filename);
      const logMessage = this.formatMessage(level, message, metadata) + '\n';
      await fs.promises.appendFile(filepath, logMessage);
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  log(level, message, metadata = {}) {
    const formattedMessage = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
    if (config.logging.enableConsoleLogging) {
      const colorMap = { error: '🔴', warn: '🟡', success: '🟢', info: 'ℹ️' };
      console.log(`${colorMap[level] || 'ℹ️'} ${formattedMessage}`);
    }
    this.writeToFile(level, message, metadata);
  }

  info(message, metadata = {}) { this.log('info', message, metadata); }
  error(message, metadata = {}) { this.log('error', message, metadata); }
  warn(message, metadata = {}) { this.log('warn', message, metadata); }
  success(message, metadata = {}) { this.log('success', message, metadata); }
}

const logger = new Logger();

class FileManager {
  static async ensureDirectory(dirPath) {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.error(`Error creating directory ${dirPath}:`, { error: error.message });
    }
  }

  static async fileExists(filePath) {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static cleanFilename(filename) {
    return filename
      .replace(/[^\w\s-]/g, '')
      .replace(/[-\s]+/g, '_')
      .substring(0, 50);
  }
}

class ValidationHelper {
  static isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(String(email).toLowerCase());
  }

  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  static sanitizeString(str, maxLength = 255) {
    if (!str || typeof str !== 'string') return '';
    let sanitized = str.trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim() + '...';
    }
    return sanitized;
  }
  
  static sanitizeJobData(jobData) {
    return {
      title: this.sanitizeString(jobData.title) || 'N/A',
      institution: this.sanitizeString(jobData.institution) || 'N/A',
      url: jobData.url,
      location: this.sanitizeString(jobData.location) || 'N/A',
      start_date: this.sanitizeString(jobData.start_date) || 'N/A',
      vacancies: this.sanitizeString(jobData.vacancies) || 'N/A',
      description: this.sanitizeString(jobData.description, 1000) || 'N/A',
      emails: (jobData.emails || []).filter(this.isValidEmail),
      phones: jobData.phones || []
    };
  }

  static validateJobData(jobData) {
    const errors = [];
    if (!jobData.title || jobData.title.trim().length === 0) errors.push('Title is required');
    if (!jobData.institution || jobData.institution.trim().length === 0) errors.push('Institution is required');
    if (!jobData.url || !this.isValidUrl(jobData.url)) errors.push('Valid URL is required');
    return { isValid: errors.length === 0, errors };
  }
}

class RetryHelper {
  static async withRetry(fn, maxRetries = 3, initialDelayMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) throw error;

        let delay = initialDelayMs * Math.pow(2, attempt - 1);
        if (error.message && error.message.includes('retryDelay')) {
          const match = error.message.match(/"retryDelay":"(\d+)s"/);
          if (match && match[1]) {
            delay = (parseInt(match[1], 10) * 1000) + Math.floor(Math.random() * 2000);
            logger.warn(`API suggested a retry delay. Waiting for ${Math.round(delay / 1000)}s.`);
          }
        }
        
        logger.warn(`Attempt ${attempt} failed, retrying in ${Math.round(delay/1000)}s.`);
        await this.sleep(delay);
      }
    }
    throw lastError;
  }
  static sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

class TextProcessor {
  static cleanHTML(html) { return html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''; }
  static truncateText(text, len) { return (text && text.length > len) ? text.substring(0, len) + '...' : text; }
  static extractEmails(text) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return [...new Set(text.match(emailRegex) || [])];
  }
  static extractPhoneNumbers(text) { return []; } // Placeholder for future implementation
}

class ErrorHandler {
  static handleScrapingError(error, url) { logger.error(`Scraping error for ${url}: ${error.message}`); }
  static handleDatabaseError(error, op) { logger.error(`Database error during ${op}: ${error.message}`); }
}

module.exports = { logger, FileManager, ValidationHelper, RetryHelper, TextProcessor, ErrorHandler };