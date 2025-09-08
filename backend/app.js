// app.js - API Server Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PDFDocument = require('pdfkit');
const pdf = require('pdf-parse');
const fs = require('fs');

const config = require('./config');
const { DatabaseManager } = require('./db-utils');
const { logger, FileManager, ValidationHelper, RetryHelper, TextProcessor, ErrorHandler } = require('./utils');

// --- EXPRESS & API SETUP ---
const app = express();
app.use(cors());
app.use(express.json());

// --- FIX: Serve static files from the 'public' directory ---
app.use(express.static(path.join(__dirname, 'public')));

// --- BUSINESS LOGIC CLASSES ---

class AusbildungScraperAdvanced {
    constructor(searchTerm, location = '') {
        this.searchTerm = encodeURIComponent(searchTerm);
        this.location = encodeURIComponent(location);
        this.baseUrl = config.scraping.baseUrl;
        this.dbManager = new DatabaseManager();
        this.browser = null;
        this.page = null;
    }
    
    async extractFieldWithSelectors(selectors, labelTexts = []) {
        try {
            for (const selector of selectors) {
                try {
                    const text = await this.page.$eval(selector, el => el.textContent?.trim());
                    if (text) return ValidationHelper.sanitizeString(text);
                } catch (e) { /* continue */ }
            }
            for (const label of labelTexts) {
                try {
                    const element = await this.page.$x(`//dt[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${label.toLowerCase()}')]/following-sibling::dd[1]`);
                    if (element.length > 0) {
                        const text = await this.page.evaluate(el => el.textContent?.trim(), element[0]);
                        if (text) return ValidationHelper.sanitizeString(text);
                    }
                } catch (e) { /* continue */ }
            }
            return 'N/A';
        } catch (error) {
            logger.error(`Error extracting field:`, { error: error.message });
            return 'N/A';
        }
    }

    async startScraping(numPages = 3) {
        logger.info('🕷️ Starting scraping process...');
        let totalResults = 0;
        try {
            this.browser = await puppeteer.launch(config.scraping.puppeteerOptions);
            this.page = await this.browser.newPage();
            await this.page.setRequestInterception(true);
            this.page.on('request', (req) => {
                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            await this.dbManager.connect();

            for (let page = 1; page <= numPages; page++) {
                const searchUrl = `${this.baseUrl}?search=${this.searchTerm}&location=${this.location}&page=${page}`;
                logger.info(`📄 Processing page ${page}/${numPages}`);
                
                await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });
                const jobUrls = await this.page.$$eval("a[href^='/stellen/']", links => [...new Set(links.map(link => link.href))]);
                if (jobUrls.length === 0) {
                    logger.warn('No more job listings found. Ending scrape.');
                    break;
                }

                for (const jobUrl of jobUrls) {
                    try {
                        const jobData = await this.scrapeJobDetails(jobUrl);
                        if (jobData && jobData.emails && jobData.emails.length > 0) {
                            const existingJob = await this.dbManager.findJobByUrl(jobData.url);
                            if (existingJob) {
                                await this.dbManager.updateJobByUrl(jobData.url, jobData);
                            } else {
                                await this.dbManager.createJob(jobData);
                            }
                            totalResults++;
                        }
                    } catch (error) { /* Handled in scrapeJobDetails */ }
                }
            }
        } catch (error) {
            logger.error('Critical scraping error:', { error: error.message });
        } finally {
            if (this.browser) await this.browser.close();
            await this.dbManager.disconnect();
            logger.info('Scraping finished.');
        }
        return totalResults;
    }

    async scrapeJobDetails(url) {
        return await RetryHelper.withRetry(async () => {
          try {
            if (!this.page) throw new Error("Browser page is not initialized.");
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: config.scraping.requestTimeout });
    
            const title = await this.page.$eval('h1', el => el.textContent?.trim()).catch(() => 'N/A');
    
            let institution = await this.extractFieldWithSelectors(['h4[data-testid="jp-customer"]', '.company-name']);
            if (institution?.toLowerCase().startsWith('bei ')) institution = institution.substring(4);
            if (!institution || institution === 'N/A') {
                const urlMatch = url.match(/bei-(.*?)-in-/);
                if (urlMatch) institution = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
    
            const location = await this.extractFieldWithSelectors(['[data-testid="jp-branches"]'], ['Standort', 'Ort']);
            let startDate = await this.extractFieldWithSelectors(['[data-testid="jp-starting-at"]'], ['Beginn', 'Start']);
            let vacancies = await this.extractFieldWithSelectors(['[data-testid="jp-vacancies"]'], ['Freie Plätze']);
            
            const pageContent = await this.page.content();
            const emails = TextProcessor.extractEmails(pageContent);
            const phones = TextProcessor.extractPhoneNumbers(pageContent);
            const description = TextProcessor.truncateText(TextProcessor.cleanHTML(pageContent), 1000);
    
            return ValidationHelper.sanitizeJobData({ title, institution, location, start_date: startDate, vacancies, description, emails, phones, url });
    
          } catch (error) {
            ErrorHandler.handleScrapingError(error, url);
            throw error;
          }
        });
      }
}

class AdvancedMotivationLetterGenerator {
    constructor() {
        this.apiKey = config.apis.geminiApiKey;
        if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY_HERE') throw new Error('Missing Gemini API key.');
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.apis.geminiModel });
        this.dbManager = new DatabaseManager();
    }

    async generateAllMotivationLetters(cvPath) {
        logger.info('📝 Starting motivation letter generation...');
        let successCount = 0;
        try {
            await FileManager.ensureDirectory(config.paths.outputDir);
            const cvText = await this.extractCVText(cvPath);
            await this.dbManager.connect();
            const jobs = await this.dbManager.findJobsWithoutMotivationLetter();
            logger.info(`📊 Found ${jobs.length} jobs that need letters.`);

            for (const job of jobs) {
                try {
                    const letterText = await this.generateLetterText(job, cvText);
                    const filename = `Bewerbung_${FileManager.cleanFilename(job.institution)}_${job.id}.pdf`;
                    const filepath = path.join(config.paths.outputDir, filename);
                    await this.createPDF(letterText, filepath, job.title, job.institution);
                    await this.dbManager.updateMotivationLetterPath(job.id, filepath);
                    await this.dbManager.updateJobStatus(job.id, 'Ready to Send');
                    logger.success(`✅ Letter created for ${job.institution}`);
                    successCount++;
                } catch (error) {
                    logger.error(`❌ Failed to process a letter for ${job.institution}:`, { error: error.message });
                }
                await RetryHelper.sleep(config.letterGeneration.delayBetweenGenerations);
            }
        } catch (error) {
            logger.error('Critical error during letter generation:', { error: error.message, stack: error.stack });
        } finally {
            await this.dbManager.disconnect();
            logger.info('Letter generation process finished.');
        }
        return successCount;
    }
    
    async extractCVText(cvPath) {
        try {
            if (!await FileManager.fileExists(cvPath)) {
                throw new Error(`CV file not found at path: ${cvPath}`);
            }
            const dataBuffer = fs.readFileSync(cvPath);
            const data = await pdf(dataBuffer);
            logger.success(`CV parsed successfully. Character count: ${data.text.trim().length}`);
            return data.text.trim();
        } catch (error) {
            logger.error(`Failed during CV extraction: ${error.message}`);
            throw new Error(`Failed to read or parse the PDF file. Details: ${error.message}`);
        }
    }

    async generateLetterText(jobInfo, cvText) {
        return await RetryHelper.withRetry(async () => {
          const { title, institution, description, location, startDate } = jobInfo;
          const context = `Ausbildungsposition: ${title}\nStandort: ${location}\nAusbildungsbeginn: ${startDate}`;
          const prompt = `Ich bewerbe mich um eine Ausbildung bei "${institution}".\n\nStellenausschreibung:\n${context}\n\nStellenbeschreibung: ${description}\n\nMein Lebenslauf:\n${cvText}\n\nBitte verfasse ein professionelles Bewerbungsschreiben. Anforderungen: Deutsch, 300-450 Wörter, professioneller Ton, auf die Ausbildung und Firma zugeschnitten. Beginne mit "Bewerbung um einen Ausbildungsplatz als..." und schließe mit "Mit freundlichen Grüßen".`;
          const result = await this.model.generateContent(prompt);
          return result.response.text();
        });
    }
      
    async createPDF(letterText, filename, jobTitle, company) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margins: config.pdf.pageMargins });
            const stream = fs.createWriteStream(filename);
            doc.pipe(stream);
            doc.fontSize(14).font('Helvetica-Bold').text(`Bewerbung: ${jobTitle}`, { align: 'center' });
            doc.fontSize(12).font('Helvetica').text(`bei ${company}`, { align: 'center' }).moveDown(2);
            doc.fontSize(config.pdf.fontSize).font(config.pdf.fontFamily);
            letterText.split('\n').forEach(line => doc.text(line, { align: 'left' }));
            doc.end();
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    }
}

class EmailSender {
    constructor() {
        this.transporter = nodemailer.createTransport(config.email.smtp);
        this.dbManager = new DatabaseManager();
    }

    async sendApplicationEmail({ jobId, userName, userEmail }) {
        await this.dbManager.connect();
        try {
            const job = await this.dbManager.findJobById(jobId);
            if (!job) throw new Error(`Job with ID ${jobId} not found.`);
            if (!job.motivationLetterPath) throw new Error(`Motivation letter for job ${jobId} not generated.`);
            if (!job.emails || job.emails.length === 0) throw new Error(`No recipient email for job ${jobId}.`);

            const mailOptions = {
                from: config.email.fromAddress,
                to: job.emails.join(', '),
                subject: `Bewerbung: ${job.title} - ${userName}`,
                html: `<p>Sehr geehrte Damen und Herren,</p><p>anbei übersende ich Ihnen meine Bewerbungsunterlagen für die Ausbildungsstelle als <strong>${job.title}</strong>.</p><p>Mit freundlichen Grüßen,</p><p><strong>${userName}</strong><br><i>${userEmail}</i></p>`,
                attachments: [{ filename: `Bewerbung_${userName}.pdf`, path: job.motivationLetterPath }]
            };
            const info = await this.transporter.sendMail(mailOptions);
            await this.dbManager.updateJobStatus(jobId, 'Applied');
            logger.success(`Email sent to ${mailOptions.to}. Message ID: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } finally {
            await this.dbManager.disconnect();
        }
    }
}

// --- MULTER SETUP ---
FileManager.ensureDirectory(config.paths.cvUploadsDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.paths.cvUploadsDir),
  filename: (req, file, cb) => cb(null, `cv-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// --- API ENDPOINTS ---
app.get('/', (req, res) => res.send('Ausbildung Scraper API is running!'));

app.post('/api/scrape', async (req, res) => {
    const { searchTerm, location, numPages } = req.body;
    if (!searchTerm) return res.status(400).json({ error: 'searchTerm is required.' });
    try {
        const scraper = new AusbildungScraperAdvanced(searchTerm, location);
        const savedJobs = await scraper.startScraping(numPages);
        res.status(200).json({ message: 'Scraping completed.', savedJobs });
    } catch (error) {
        res.status(500).json({ error: 'Scraping failed.', details: error.message });
    }
});

app.post('/api/generate-letters', upload.single('cv'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'CV file upload is required.' });
    try {
        const generator = new AdvancedMotivationLetterGenerator();
        const generatedCount = await generator.generateAllMotivationLetters(req.file.path);
        res.status(200).json({ message: 'Letter generation completed.', generatedCount });
    } catch (error) {
        res.status(500).json({ error: 'Letter generation failed.', details: error.message });
    }
});

app.post('/api/send-email', async (req, res) => {
    const { jobId, userName, userEmail } = req.body;
    if (!jobId || !userName || !userEmail) return res.status(400).json({ error: 'jobId, userName, and userEmail are required.' });
    try {
        const emailSender = new EmailSender();
        const result = await emailSender.sendApplicationEmail({ jobId, userName, userEmail });
        res.status(200).json({ message: 'Email sent successfully!', ...result });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email.', details: error.message });
    }
});

app.get('/api/jobs', async (req, res) => {
    const dbManager = new DatabaseManager();
    try {
        await dbManager.connect();
        const jobs = await dbManager.findAllJobs();
        res.json(jobs);
    } catch (error) {
        logger.error('API Error in /api/jobs:', { details: error.message });
        res.status(500).json({ error: 'Failed to retrieve jobs.', details: error.message });
    } finally {
        await dbManager.disconnect();
    }
});

app.get('/api/stats', async (req, res) => {
    const dbManager = new DatabaseManager();
    try {
        await dbManager.connect();
        const stats = await dbManager.getJobStats();
        res.json(stats);
    } catch (error) {
        logger.error('API Error in /api/stats:', { details: error.message });
        res.status(500).json({ error: 'Failed to retrieve stats.', details: error.message });
    } finally {
        await dbManager.disconnect();
    }
});


// --- START SERVER ---
const PORT = config.app.port;
app.listen(PORT, () => {
  logger.success(`🚀 API Server is running on http://localhost:${PORT}`);
});
