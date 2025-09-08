// config.js
const path = require('path');

module.exports = {
  // Database Configuration
  database: {
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  },

  // API Configuration
  apis: {
    geminiApiKey: process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE',
    geminiModel: 'gemini-1.5-flash'
  },

  // Scraping Configuration
  scraping: {
    baseUrl: 'https://www.ausbildung.de/suche/',
    delayBetweenRequests: 1000, // 1 second
    delayBetweenPages: 2000, // 2 seconds
    requestTimeout: 20000, // 20 seconds
    maxRetries: 3,
    puppeteerOptions: {
      headless: "new",
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
    }
  },

  // File and Directory Configuration
  paths: {
    outputDir: path.join(__dirname, 'bewerbungsschreiben'),
    tempDir: path.join(__dirname, 'temp'),
    logsDir: path.join(__dirname, 'logs'),
    exportsDir: path.join(__dirname, 'exports'),
    cvUploadsDir: path.join(__dirname, 'cv_uploads') // Directory for uploaded CVs
  },

  // PDF Generation Configuration
  pdf: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    pageMargins: { top: 50, bottom: 50, left: 50, right: 50 }
  },

  // Letter Generation Configuration
  letterGeneration: {
    delayBetweenGenerations: 20000, // Increased to 20 seconds to respect API limits
    maxRetries: 3,
    letterStructure: { minWords: 300, maxWords: 450 }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableFileLogging: true,
    enableConsoleLogging: true,
  },

  // Email Configuration
  email: {
    fromAddress: process.env.SMTP_FROM_ADDRESS || '"Your Name" <no-reply@example.com>',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: (parseInt(process.env.SMTP_PORT, 10) === 465), // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },

  // Application Settings
  app: {
    name: 'Ausbildung Scraper API',
    version: '2.0.0',
    port: process.env.PORT || 8080 // Port for the API server
  }
};