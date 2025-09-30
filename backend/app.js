import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import PDFParser from "pdf2json";
import fs from "fs";
import multer from "multer";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import authRouter from "./routes/auth.routes.js";
import addAusbildung from "./routes/ausbildung.routes.js";
import settingsRouter from "./routes/settings.routes.js";
import config from "./config.js";
import DatabaseManager from "./db-utils.js";
import { authenticateToken, getUserIdFromToken } from "./middleware/auth.js";


const prisma = new PrismaClient();

import {
  logger,
  FileManager,
  RetryHelper,
  SimpleProgressTracker,
} from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();


function createTransporter({ smtpHost, smtpPort, smtpUser, smtpPass }) {
  const port = Number(smtpPort ?? 587);
  return nodemailer.createTransport({
    host: smtpHost || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    // Add connection options to fix network issues
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    // Force IPv4 to avoid IPv6 connection issues
    family: 4,
    // Add pool configuration for better connection management
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 14, // max 14 messages per second
  });
}

const clientOrigins = process.env.CLIENT_ORIGIN || "http://localhost:8080";
const allowedOriginSet = new Set(
  clientOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const serverPort = Number(process.env.PORT || config.app.port || 3000);
allowedOriginSet.add(`http://localhost:${serverPort}`);
allowedOriginSet.add(`http://127.0.0.1:${serverPort}`);
// Add Vite dev server origin
allowedOriginSet.add("http://localhost:5173");
allowedOriginSet.add("https://beautiful-puffpuff-29e6f6.netlify.app/");
allowedOriginSet.add("http://127.0.0.1:5173");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOriginSet.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


 


const runtimeDirectories = [
  config.paths.outputDir,
  config.paths.tempDir,
  config.paths.logsDir,
  config.paths.exportsDir,
  config.paths.cvUploadsDir,
  path.resolve(__dirname, "uploads"),
];

runtimeDirectories.forEach((dir) => {
  FileManager.ensureDirectory(dir);
});

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage(); // Store files in memory instead of disk

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Allow only PDF files for CVs and documents
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
  }
});

class AdvancedMotivationLetterGenerator {
  constructor({ apiKey, model, dbManager, userId }) {
    if (!apiKey) {
      throw new Error("Missing Gemini API key for this user.");
    }

    this.apiKey = apiKey;
    this.modelName = model || config.apis.geminiModel;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    this.dbManager = dbManager || new DatabaseManager();
    this.manageConnection = !dbManager;
    this.userId = userId;
  }

  async generateAllMotivationLetters(cvPath) {
    if (!this.userId) {
      throw new Error("Missing user context for letter generation.");
    }

    logger.info("📝 Starting motivation letter generation...");
    
    // Validate user profile before generating letters
    await this.validateUserProfile();
    
    let successCount = 0;
    const shouldDisconnect = this.manageConnection;

    try {
      const cvText = await this.extractCVText(cvPath);
      if (shouldDisconnect) {
        await this.dbManager.connect();
      }
      const jobs = await this.dbManager.findJobsWithoutMotivationLetter(this.userId);
      logger.info(`📊 Found ${jobs.length} jobs that need letters.`);
      const progress = new SimpleProgressTracker(jobs.length, "Generating motivation letters");

      for (const job of jobs) {
        try {
          const letterText = await this.generateLetterText(job, cvText);
          
          // Create PDF in memory instead of writing to file
          const pdfBuffer = await this.createPDFBuffer(letterText, job.title, job.institution);
          
          // Store PDF directly in database
          await this.dbManager.updateMotivationLetterData(job.id, pdfBuffer);
          await this.dbManager.updateJobStatus(job.id, "Ready to Send");
          
          logger.success(`✅ Letter created for ${job.institution}`);
          successCount++;
        } catch (error) {
          logger.error(`❌ Failed to process a letter for ${job.institution}:`, { error: error.message });
        }
        progress.increment();
        await RetryHelper.sleep(config.letterGeneration.delayBetweenGenerations);
      }
      progress.complete();
    } catch (error) {
      logger.error("Critical error during letter generation:", { error: error.message, stack: error.stack });
    } finally {
      if (shouldDisconnect) {
        await this.dbManager.disconnect();
      }
      logger.info("Letter generation process finished.");
    }
    return successCount;
  }

  async extractCVText(cvPath) {
    try {
      if (!(await FileManager.fileExists(cvPath))) {
        throw new Error(`CV file not found at path: ${cvPath}`);
      }
      const pdfText = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(this, 1);
        pdfParser.on("pdfParser_dataError", (errData) => reject(new Error(errData.parserError)));
        pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent().trim()));
        pdfParser.loadPDF(cvPath);
      });
      logger.success(`CV parsed successfully. Character count: ${pdfText.length}`);
      return pdfText;
    } catch (error) {
      logger.error(`Failed during CV extraction: ${error.message}`);
      throw new Error(`Failed to read or parse the PDF file. Details: ${error.message}`);
    }
  }

  async generateLetterText(jobInfo, cvText) {
    return await RetryHelper.withRetry(async () => {
      const { institution, description, location, startDate } = jobInfo;

      const title = "Ausbildung Pflegefachmann/-frau";

      // Get user profile information from database
      const userProfile = await this.getUserProfile();

      // Get current date in German format
      const currentDate = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const context = `Ausbildungsposition: ${title}\nStandort: ${location}\nAusbildungsbeginn: ${startDate || "N.N."}`;
      const prompt =
        `Sie sind ein professioneller Bewerbungsexperte. Erstellen Sie ein deutsches Bewerbungsschreiben.\n\n` +
        `BEWERBUNGSDETAILS:\n` +
        `Unternehmen: ${institution}\n` +
        `Position: ${title}\n` +
        `Standort: ${location}\n` +
        `Ausbildungsbeginn: ${startDate || "N.N."}\n` +
        `Heute: ${currentDate}\n\n` +
        `STELLENBESCHREIBUNG:\n${description}\n\n` +
        `BEWERBER-LEBENSLAUF:\n${cvText}\n\n` +
        `BRIEFFORMAT - Erstellen Sie ein deutsches Bewerbungsschreiben in folgendem Format:\n\n` +
        `Absender:\n` +
        `${userProfile.name}\n` +
        `${userProfile.street}\n` +
        `${userProfile.postalCode} ${userProfile.city}\n` +
        `Tel.: ${userProfile.phone}\n` +
        `E-Mail: ${userProfile.email}\n\n` +
        `Empfänger:\n` +
        `${institution}\n` +
        `Personalabteilung\n` +
        `${location}\n\n` +
        `${userProfile.city}, ${currentDate}\n\n` +
        `Betreff: Bewerbung um eine Ausbildung als ${title}\n\n` +
        `FORMATVORGABEN:\n` +
        `- Verwenden Sie das oben angegebene deutsche Briefformat\n` +
        `- Fügen Sie SOWOHL Absender ALS AUCH Empfänger hinzu\n` +
        `- Jede Sektion (Absender, Empfänger, Datum, Betreff, Anrede) muss durch eine LEERE ZEILE getrennt werden\n` +
        `- Verwenden Sie "${userProfile.city}" als Ortsangabe beim Datum\n` +
        `- KEINE Backslashes (\\) oder \\n Zeichen\n` +
        `- KEINE Markdown-Formatierung (**text**)\n` +
        `- Normale Absätze durch Leerzeilen trennen\n` +
        `- Enden mit: "Mit freundlichen Grüßen\\n\\n(Unterschrift)\\n${userProfile.name}"\n\n` +
        `BEISPIEL FÜR KORREKTE FORMATIERUNG:\n` +
        `Absender:\n` +
        `Max Mustermann\n` +
        `Musterstraße 10\n` +
        `12345 Musterstadt\n` +
        `Tel.: 0123 456789\n` +
        `E-Mail: max@email.de\n\n` +
        `Empfänger:\n` +
        `Firma Beispiel GmbH\n` +
        `Personalabteilung\n` +
        `12345 Beispielstadt\n\n` +
        `Musterstadt, 30.09.2025\n\n` +
        `Betreff: Bewerbung um eine Ausbildung als Pflegefachmann/-frau\n\n` +
        `Sehr geehrte Damen und Herren,\n\n` +
        `[Haupttext der Bewerbung...]\n\n` +
        `Mit freundlichen Grüßen\n\n` +
        `(Unterschrift)\n` +
        `Max Mustermann\n\n` +
        `INHALTLICHE ANFORDERUNGEN:\n` +
        `- 300-450 Wörter Haupttext\n` +
        `- Professioneller, höflicher Ton\n` +
        `- Bezug zur spezifischen Ausbildung und zum Unternehmen\n` +
        `- Relevante Erfahrungen aus dem Lebenslauf einbauen\n` +
        `- Interesse und Motivation zeigen\n\n` +
        `WICHTIG:\n` +
        `Schreiben Sie den kompletten Brief mit der angegebenen Kopfzeile inklusive Empfängeradresse und korrekter Formatierung mit Leerzeilen.`;
      
      let result;
      try {
        result = await this.model.generateContent(prompt);
      } catch (error) {
        // If the current model fails, try with different model names
        logger.warn(`Model ${this.modelName} failed, trying fallback models:`, error.message);
        
        const fallbackModels = [
          "gemini-pro",
          "gemini-1.5-pro-latest", 
          "gemini-1.0-pro"
        ];
        
        for (const fallbackModel of fallbackModels) {
          try {
            logger.info(`Trying fallback model: ${fallbackModel}`);
            const fallbackGenAI = new GoogleGenerativeAI(this.apiKey);
            const fallbackModelInstance = fallbackGenAI.getGenerativeModel({ model: fallbackModel });
            result = await fallbackModelInstance.generateContent(prompt);
            this.model = fallbackModelInstance; // Update the model for subsequent calls
            this.modelName = fallbackModel;
            logger.success(`Successfully switched to model: ${fallbackModel}`);
            break;
          } catch (fallbackError) {
            logger.warn(`Fallback model ${fallbackModel} also failed:`, fallbackError.message);
          }
        }
        
        if (!result) {
          throw new Error(`All Gemini models failed. Last error: ${error.message}`);
        }
      }
      
      let letterText = result.response.text();
      
      // Post-process to remove any AI introductory text and formatting issues
      letterText = this.cleanAIResponse(letterText, userProfile);
      
      return letterText;
    });
  }

  // Validate that user has filled required profile information
  async validateUserProfile() {
    const user = await this.dbManager.prisma.user.findUnique({
      where: { id: this.userId },
      select: {
        firstName: true,
        lastName: true,
        street: true,
        postalCode: true,
        city: true,
        phone: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const missingFields = [];
    if (!user.firstName?.trim()) missingFields.push("Prénom");
    if (!user.lastName?.trim()) missingFields.push("Nom de famille");
    if (!user.street?.trim()) missingFields.push("Adresse");
    if (!user.postalCode?.trim()) missingFields.push("Code postal");
    if (!user.city?.trim()) missingFields.push("Ville");
    if (!user.phone?.trim()) missingFields.push("Téléphone");

    if (missingFields.length > 0) {
      const fieldsText = missingFields.join(", ");
      throw new Error(
        `Veuillez compléter votre profil dans les paramètres avant de générer des lettres de motivation. ` +
        `Champs manquants: ${fieldsText}. ` +
        `Allez dans Paramètres > Informations du profil pour remplir ces informations.`
      );
    }
  }

  // Get user profile information from database
  async getUserProfile() {
    const user = await this.dbManager.prisma.user.findUnique({
      where: { id: this.userId },
      select: {
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        street: true,
        postalCode: true,
        city: true,
        phone: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Return formatted profile with fallbacks
    return {
      name: user.name || `${user.firstName} ${user.lastName}`,
      street: user.street || 'Musterstraße 10',
      postalCode: user.postalCode || '12345',
      city: user.city || 'Musterstadt', 
      phone: user.phone || '0123 456789',
      email: user.email,
    };
  }

  // Extract personal information from CV text
  extractPersonalInfoFromCV(cvText) {
    const personalInfo = {
      name: '',
      address: '',
      phone: '',
      email: '',
      city: 'Kenitra' // Default fallback
    };

    // Extract name (usually appears early in CV)
    const nameMatch = cvText.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
    if (nameMatch) {
      personalInfo.name = nameMatch[1];
    }

    // Extract email
    const emailMatch = cvText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      personalInfo.email = emailMatch[1];
    }

    // Extract phone number (international format or local)
    const phoneMatch = cvText.match(/(\+?\d{1,4}[\s-]?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4})/);
    if (phoneMatch) {
      personalInfo.phone = phoneMatch[1];
    }

    // Extract address (look for patterns that include street, city, postal code)
    const addressPatterns = [
      /([A-Z\s\d]+(?:straße|str\.?|avenue|boulevard|allee)[^\n]*)/i,
      /(N\s?\d+[^\n]*)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+[^\n]*)/
    ];

    let fullAddress = '';
    for (const pattern of addressPatterns) {
      const match = cvText.match(pattern);
      if (match && match[1]) {
        fullAddress += match[1].trim() + '\n';
      }
    }

    if (fullAddress) {
      personalInfo.address = fullAddress.trim();
    }

    // Extract city (look for common patterns)
    const cityMatch = cvText.match(/(Kenitra|Berlin|München|Hamburg|Köln|Frankfurt|Stuttgart|Düsseldorf|Dortmund|Essen|Leipzig|Bremen|Dresden|Hannover|Nürnberg|Duisburg|Bochum|Wuppertal|Bonn|Bielefeld|Mannheim)/i);
    if (cityMatch) {
      personalInfo.city = cityMatch[1];
    }

    // Fallback values if extraction fails
    if (!personalInfo.name) personalInfo.name = 'Anass Ahfidi';
    if (!personalInfo.address) personalInfo.address = 'N 128 LOTIS ALLIANCE DARNA\nTR2 PHASE B MEHDIA KENITRA';
    if (!personalInfo.phone) personalInfo.phone = '+212 603501378';
    if (!personalInfo.email) personalInfo.email = 'anassahfidi.aussbildung@gmail.com';

    return personalInfo;
  }

  // Enhanced helper method to clean AI response while preserving sender and recipient information
  cleanAIResponse(text, userProfile) {
    // Remove common AI introduction patterns
    const introPatterns = [
      /^Absolut\..*?basiert\.\s*/s,
      /^Hier ist.*?Bewerbungsschreiben.*?\.\s*/s,
      /^Gerne.*?verfasse.*?\.\s*/s,
      /^Selbstverständlich.*?\.\s*/s,
      /^Natürlich.*?\.\s*/s,
      /^Sehr gerne.*?\.\s*/s,
      /^Ich erstelle.*?\.\s*/s,
      /^Das ist.*?Bewerbungsschreiben.*?\.\s*/s
    ];

    let cleanedText = text;
    
    // Apply each pattern to remove introductory text
    for (const pattern of introPatterns) {
      cleanedText = cleanedText.replace(pattern, '');
    }
    
    // Clean up formatting but preserve sender and recipient address
    cleanedText = cleanedText
      // Remove backslashes and \n sequences but preserve structure
      .replace(/\\\n/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\\/g, '')
      
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      
      // Clean up multiple newlines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+/gm, '')
      .trim();
    
    // Ensure proper structure starting with sender info
    if (!cleanedText.startsWith('Absender:') && !cleanedText.startsWith(userProfile.name)) {
      // Find the sender info or create it with recipient
      const dateStr = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const header = `Absender:
${userProfile.name}
${userProfile.street}
${userProfile.postalCode} ${userProfile.city}
Tel.: ${userProfile.phone}
E-Mail: ${userProfile.email}

Empfänger:
[Firmenname]
Personalabteilung
[Adresse]

${userProfile.city}, ${dateStr}

`;
      
      // Find where the actual letter content starts
      const bewerbungIndex = cleanedText.search(/Bewerbung um einen Ausbildungsplatz|Betreff:|Sehr geehrte/i);
      if (bewerbungIndex !== -1) {
        cleanedText = header + cleanedText.substring(bewerbungIndex);
      } else {
        cleanedText = header + cleanedText;
      }
    }
    
    return cleanedText;
  }

  createPDF(letterText, filename, jobTitle, company) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margins: config.pdf.pageMargins });
      const stream = fs.createWriteStream(filename);
      doc.pipe(stream);
      doc.fontSize(14).font("Helvetica-Bold").text(`Bewerbung: ${jobTitle}`, { align: "center" });
      doc.fontSize(12).font("Helvetica").text(`bei ${company}`, { align: "center" }).moveDown(2);
      doc.fontSize(config.pdf.fontSize).font(config.pdf.fontFamily);
      letterText.split("\n").forEach((line) => doc.text(line, { align: "left" }));
      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    });
  }

  createPDFBuffer(letterText, jobTitle, company) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margins: config.pdf.pageMargins });
      const buffers = [];
      
      // Collect PDF data in memory
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Generate PDF content
      doc.fontSize(14).font("Helvetica-Bold").text(`Bewerbung: ${jobTitle}`, { align: "center" });
      doc.fontSize(12).font("Helvetica").text(`bei ${company}`, { align: "center" }).moveDown(2);
      doc.fontSize(config.pdf.fontSize).font(config.pdf.fontFamily);
      letterText.split("\n").forEach((line) => doc.text(line, { align: "left" }));
      doc.end();
    });
  }
}

app.post("/api/ausbildung/generate-letters", upload.any(), async (req, res) => {
  const userId = getUserIdFromToken(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
  }

  console.log("📝 Generate letters request:", {
    files: req.files?.length || 0,
    body: req.body,
    useExistingCv: req.body.useExistingCv,
    existingCvId: req.body.existingCvId,
  });

  const dbManager = new DatabaseManager();
  let tempFilePath = null;

  try {
    await dbManager.connect();

    const integration = await dbManager.getUserIntegration(userId);
    if (!integration?.geminiApiKey) {
      return res.status(400).json({
        error: "Missing Gemini API key. Please configure it in your settings before generating letters.",
      });
    }

    const existingCVs = await dbManager.prisma.document.findMany({
      where: {
        userId,
        OR: [
          { originalName: { contains: "cv" } },
          { originalName: { contains: "lebenslauf" } },
          { originalName: { contains: "CV" } },
          { originalName: { contains: "Lebenslauf" } },
          { originalName: { endsWith: ".pdf" } },
        ],
      },
      select: {
        id: true,
        filename: true,
        originalName: true,
        fileSize: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let cvData = null;
    let cvSource = "uploaded";

    // Check if a new CV is uploaded (files array will contain the cv file)
    const uploadedFile = req.files?.find((file) => file.fieldname === "cv");

    if (uploadedFile?.buffer) {
      await dbManager.saveDocument(userId, uploadedFile);
      cvData = uploadedFile.buffer;
      cvSource = "uploaded";
      console.log("🔍 Using uploaded CV:", uploadedFile.originalname);
    } else if (req.body.useExistingCv && req.body.existingCvId) {
      const existingCV = await dbManager.getDocumentWithData(req.body.existingCvId, userId);

      if (!existingCV) {
        return res.status(404).json({
          error: "Selected CV not found or access denied.",
          existingCVs,
        });
      }

      cvData = existingCV.fileData;
      cvSource = "existing";
      console.log("🔍 Using existing CV:", existingCV.originalName);
    } else {
      return res.status(400).json({
        error: "CV file upload is required or select an existing CV.",
        existingCVs,
      });
    }

    if (cvData) {
      tempFilePath = path.join(os.tmpdir(), `temp_cv_${Date.now()}.pdf`);
      await fs.promises.writeFile(tempFilePath, cvData);
    }

    const generator = new AdvancedMotivationLetterGenerator({
      apiKey: integration.geminiApiKey,
      model: integration.geminiModel,
      dbManager,
      userId,
    });

    const generatedCount = await generator.generateAllMotivationLetters(tempFilePath);

    if (tempFilePath && (await fs.promises.access(tempFilePath).then(() => true).catch(() => false))) {
      await fs.promises.unlink(tempFilePath);
    }

    res.status(200).json({
      message: "Letter generation completed successfully.",
      generatedCount,
      cvSource,
      success: true,
    });
  } catch (error) {
    if (tempFilePath) {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (unlinkError) {
        console.warn("Could not clean up temporary file:", unlinkError.message);
      }
    }

    logger.error("API Letter Generation Error:", { error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Letter generation failed.",
      details: error.message,
      success: false,
    });
  } finally {
    await dbManager.disconnect();
  }
});

app.get("/api/ausbildung/documents", async (req, res) => {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.connect();
    
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    }

    const documents = await dbManager.getUserDocuments(userId);
    
    res.status(200).json(documents);
  } catch (error) {
    logger.error("Failed to fetch documents:", { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: "Failed to fetch documents.", 
      details: error.message 
    });
  } finally {
    await dbManager.disconnect();
  }
});

app.post("/api/ausbildung/documents/upload", upload.single("file"), async (req, res) => {
    
  // 1. Instantiate the DatabaseManager inside the route handler
  const dbManager = new DatabaseManager(); 
  
  try {
    // 2. Connect to the database
    await dbManager.connect(); 

    // 3. Extract userId with debugging
    const userId = getUserIdFromToken(req);
    console.log('🔍 DEBUG - Raw userId:', userId);
    console.log('🔍 DEBUG - typeof userId:', typeof userId);
    console.log('🔍 DEBUG - userId stringified:', JSON.stringify(userId));
    
    if (!userId || typeof userId !== 'string') {
      console.log('❌ Invalid userId detected:', { userId, type: typeof userId });
      return res.status(401).json({ 
        error: "Unauthorized: Invalid User ID in token.",
        debug: { userId, type: typeof userId }
      });
    }

    // Handle file upload
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: "No file was uploaded or file data is missing." });
    }
    
    console.log('🔍 DEBUG - File info:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bufferLength: file.buffer.length
    });
    
    // 4. File validation is now handled by multer filter
    
    // 5. Save to database with binary data
    console.log('🔍 DEBUG - About to save document with userId:', userId);
    const savedDoc = await dbManager.saveDocument(String(userId), file);

    res.status(200).json({
      success: true,
      message: "Document uploaded and saved successfully.",
      document: {
        id: savedDoc.id,
        filename: savedDoc.filename,
        originalName: savedDoc.originalName,
        mimeType: savedDoc.mimeType,
        fileSize: savedDoc.fileSize,
        createdAt: savedDoc.createdAt
      },
    });

  } catch (err) {
    logger.error("File upload DB save error:", { 
      error: err.message, 
      stack: err.stack,
      userId: getUserIdFromToken(req)
    });
    res.status(500).json({ 
      success: false, 
      error: "Failed to save the document.",
      details: err.message
    });
  } finally {
    // 3. Always ensure the database connection is closed
    await dbManager.disconnect(); 
  }
}
);

// Download file from database
app.get("/api/ausbildung/documents/:documentId/download", async (req, res) => {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.connect();
    
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    }
    
    const { documentId } = req.params;
    
    // Get document with file data
    const document = await dbManager.getDocumentWithData(documentId, userId);
    
    if (!document) {
      return res.status(404).json({ error: "Document not found or access denied." });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Length', document.fileSize);
    
    // Send the file data
    res.send(document.fileData);
    
  } catch (error) {
    logger.error("File download error:", { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: "Failed to download document.", 
      details: error.message 
    });
  } finally {
    await dbManager.disconnect();
  }
});

app.delete("/api/ausbildung/documents/:documentId", async (req, res) => {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.connect();
    
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    }

    const { documentId } = req.params;
    if (!documentId) {
      return res.status(400).json({ error: "Document ID is required." });
    }

    const deletedDocument = await dbManager.deleteDocument(documentId, userId);
    
    res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
      document: deletedDocument
    });
    
  } catch (error) {
    logger.error("Document deletion error:", { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete document.",
      details: error.message
    });
  } finally {
    await dbManager.disconnect();
  }
});

// Download motivation letter for a specific job
app.get("/api/ausbildung/jobs/:jobId/motivation-letter", async (req, res) => {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.connect();
    
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    }
    
    const { jobId } = req.params;
    
    // Get job with motivation letter
    const job = await dbManager.prisma.ausbildung.findFirst({
      where: { 
        id: jobId,
        userId: userId
      },
      select: {
        id: true,
        title: true,
        institution: true,
        motivationLetter: true
      }
    });
    
    if (!job || !job.motivationLetter) {
      return res.status(404).json({ error: "Motivation letter not found for this job." });
    }
    
    const filename = `Bewerbung_${job.institution.replace(/[^a-zA-Z0-9]/g, '_')}_${job.id}.pdf`;
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', job.motivationLetter.length);
    
    // Send the PDF data
    res.send(job.motivationLetter);
    
  } catch (error) {
    logger.error("Motivation letter download error:", { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: "Failed to download motivation letter.", 
      details: error.message 
    });
  } finally {
    await dbManager.disconnect();
  }
});

app.get("/api/ausbildung/documents/:documentId/download", async (req, res) => {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.connect();
    
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    }

    const { documentId } = req.params;
    const document = await dbManager.prisma.document.findFirst({
      where: { id: documentId, userId }
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found." });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: "File not found on server." });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType);
    
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    logger.error("Document download error:", { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: "Failed to download document.",
      details: error.message
    });
  } finally {
    await dbManager.disconnect();
  }
});
  
app.post("/api/ausbildung/email/send", async (req, res) => {
  console.log("🔍 DEBUG - Incoming request headers:", req.headers);
  console.log("🔍 DEBUG - Request body:", req.body);

  const userId = getUserIdFromToken(req);
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
  }

  // Get selected emails and files from request body
  const { selectedEmails = [], selectedFiles = [], jobIds = [] } = req.body;
  console.log("🔍 Selected emails:", selectedEmails);
  console.log("🔍 Selected files:", selectedFiles);
  console.log("🔍 Job IDs:", jobIds);

  const dbManager = new DatabaseManager();
  let integration;
  let transporter;

  try {
    await dbManager.connect();
    integration = await dbManager.getUserIntegration(userId);
  } finally {
    await dbManager.disconnect();
  }

  if (!integration?.smtpUser || !integration?.smtpPass) {
    return res.status(400).json({
      error: "SMTP credentials are missing. Please configure them in your settings before sending emails.",
    });
  }

  try {
    transporter = createTransporter({
      smtpHost: integration.smtpHost,
      smtpPort: integration.smtpPort,
      smtpUser: integration.smtpUser,
      smtpPass: integration.smtpPass,
    });

    console.log("🔍 SMTP Config:", {
      host: integration.smtpHost || "smtp.gmail.com",
      port: integration.smtpPort || 587,
      user: integration.smtpUser,
      hasPassword: !!integration.smtpPass
    });

    // Add timeout to verification
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('SMTP verification timeout after 30 seconds')), 30000);
    });
    
    await Promise.race([verifyPromise, timeoutPromise]);
    console.log("✅ SMTP connection verified successfully");
  } catch (err) {
    console.error("SMTP connection failed:", err.message);
    console.error("Full error:", err);
    
    // Provide more specific error messages
    let errorMessage = "SMTP connection failed. ";
    if (err.message.includes('EHOSTUNREACH')) {
      errorMessage += "Cannot reach the SMTP server. Check your internet connection and firewall settings.";
    } else if (err.message.includes('ENOTFOUND')) {
      errorMessage += "SMTP server not found. Check the SMTP host configuration.";
    } else if (err.message.includes('535') || err.message.includes('authentication')) {
      errorMessage += "Authentication failed. Check your email and password/app password.";
    } else if (err.message.includes('timeout')) {
      errorMessage += "Connection timeout. The server may be busy or unreachable.";
    } else {
      errorMessage += "Check your SMTP credentials and network.";
    }
    
    return res.status(500).json({
      error: errorMessage,
      details: err.message
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        ausbildungen: {
          where: {
            ...(jobIds.length > 0 ? { id: { in: jobIds } } : {}),
            motivationLetter: { not: null },
            status: { not: "Done" }
          }
        }, 
        documents: true 
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.ausbildungen.length === 0) {
      return res.status(200).json({
        sentCount: 0,
        errors: [],
        messageIds: [],
        message: "No pending jobs with motivation letters found to send."
      });
    }

    const results = {
      sentCount: 0,
      errors: [],
      messageIds: [],
    };

    // Filter documents by selectedFiles if provided and convert to attachments
    const additionalAttachments = user.documents
      .filter((doc) => {
        if (selectedFiles.length > 0) {
          return selectedFiles.includes(doc.id);
        }
        return true;
      })
      .map((doc) => ({ 
        filename: doc.originalName, 
        content: doc.fileData,
        contentType: doc.mimeType
      }));

    console.log("🔍 Filtered attachments:", additionalAttachments.map(a => a.filename));

    for (const job of user.ausbildungen) {
      try {
        if (!job.motivationLetter || job.motivationLetter.length === 0) {
          results.errors.push({ jobId: job.id, error: "Motivation letter not found." });
          continue;
        }

        if (!job.emails || job.emails.trim() === "") {
          results.errors.push({ jobId: job.id, error: "No recipient email." });
          continue;
        }

        // Use selectedEmails if provided and not empty, otherwise use all job emails
        let recipientEmails;
        if (selectedEmails.length > 0) {
          recipientEmails = selectedEmails;
        } else {
          // Parse job emails and filter out empty ones
          recipientEmails = job.emails.split(",")
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
        }
        
        // Skip if no valid emails found
        if (recipientEmails.length === 0) {
          results.errors.push({ jobId: job.id, error: "No valid recipient emails found." });
          continue;
        }

        console.log("🔍 Sending to emails:", recipientEmails);

        // Prepare attachments with motivation letter from database
        const attachments = [
          { 
            filename: `Bewerbung_${user.firstName}_${job.institution.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            content: job.motivationLetter,
            contentType: 'application/pdf'
          },
          ...additionalAttachments,
        ];

        let jobEmailsSent = 0;
        for (const to of recipientEmails) {
          try {
            const greeting = job.institution
              ? `Sehr geehrtes Ausbildungsteam der ${job.institution},`
              : "Sehr geehrte Damen und Herren,";

            const subject = `Bewerbung um einen Ausbildungsplatz als ${job.title} ab ${job.startDate || "N.N."}`;

            const htmlBody = `
              <p>${greeting}</p>
              <p>anbei übersende ich Ihnen meine Bewerbungsunterlagen für die Ausbildung als <strong>${job.title}</strong> ab ${job.startDate || "N.N."}.</p>
              <p>Im Anhang finden Sie meinen Lebenslauf sowie mein Bewerbungsschreiben.</p>
              <p>Ich freue mich auf Ihre Rückmeldung und die Möglichkeit zu einem persönlichen Gespräch.</p>
              <p>Mit freundlichen Grüßen</p>
              <p><strong>${user.firstName} ${user.lastName}</strong><br>
              <i>${user.email}</i></p>
            `;

            const textBody = `${greeting}\n\n` +
              `anbei übersende ich Ihnen meine Bewerbungsunterlagen für die Ausbildung als ${job.title} ab ${job.startDate || "N.N."}.\n\n` +
              `Im Anhang finden Sie meinen Lebenslauf sowie mein Bewerbungsschreiben.\n\n` +
              `Ich freue mich auf Ihre Rückmeldung und die Möglichkeit zu einem persönlichen Gespräch.\n\n` +
              `Mit freundlichen Grüßen\n` +
              `${user.firstName} ${user.lastName}\n${user.email}`;

            const info = await transporter.sendMail({
              from: `"${user.firstName} ${user.lastName}" <${integration.smtpUser}>`,
              to,
              subject,
              text: textBody,
              html: htmlBody,
              attachments,
            });

            results.sentCount++;
            jobEmailsSent++;
            results.messageIds.push({ jobId: job.id, messageId: info.messageId, to });
            console.log(`✅ Email sent to ${to} for job ${job.title}`);
          } catch (err) {
            console.error(`Failed to send email to ${to}:`, err.message);
            results.errors.push({ jobId: job.id, email: to, error: err.message });
          }
        }

        if (jobEmailsSent > 0) {
          await prisma.ausbildung.update({
            where: { id: job.id },
            data: { 
              status: "Done",
              updatedAt: new Date()
            }
          });
          console.log(`✅ Updated job ${job.id} status to "Done"`);
        }

      } catch (err) {
        results.errors.push({ jobId: job.id, error: err.message });
      }
    }

    console.log(`📊 Email sending completed: ${results.sentCount} sent, ${results.errors.length} errors`);
    res.json(results);
  } catch (err) {
    console.error("Email sending error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/ausbildung/ready-to-send", authenticateToken, async (req, res) => {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.connect();
    
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    }
    
    // ✅ ONLY GET JOBS THAT ARE READY TO SEND (HAVE MOTIVATION LETTERS BUT NOT SENT YET)
    const readyJobs = await dbManager.prisma.ausbildung.findMany({
      where: {
        userId: userId,
        motivationLetter: { not: null }, // Must have motivation letter
        status: { not: "Done" } // Not already sent (could be "Pending" or "Ready to Send")
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json(readyJobs);
  } catch (error) {
    logger.error("Failed to fetch ready to send jobs:", { 
      error: error.message, 
      stack: error.stack,
      userId: getUserIdFromToken(req) 
    });
    res.status(500).json({ 
      error: "Failed to fetch ready to send jobs.", 
      details: error.message 
    });
  } finally {
    await dbManager.disconnect();
  }
});

app.get("/api/ausbildung/stats", authenticateToken, async (req, res) => {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.connect();
    
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    }
    
    // Get all user jobs
    const allJobs = await dbManager.prisma.ausbildung.findMany({
      where: { userId: userId }
    });
    
    // Calculate stats based on status logic
    const stats = {
      totalJobs: allJobs.length,
      pendingJobs: allJobs.filter(job => !job.motivationLetter && job.status !== "Done").length,
      readyToSend: allJobs.filter(job => job.motivationLetter && job.status !== "Done").length,
      doneJobs: allJobs.filter(job => job.status === "Done").length,
      jobsWithMotivationLetters: allJobs.filter(job => job.motivationLetter).length,
      // Legacy field for compatibility
      applicationsSubmitted: allJobs.filter(job => job.status === "Done").length
    };

    res.status(200).json(stats);
  } catch (error) {
    logger.error("Failed to fetch stats:", { 
      error: error.message, 
      stack: error.stack,
      userId: getUserIdFromToken(req) 
    });
    res.status(500).json({ 
      error: "Failed to fetch stats.", 
      details: error.message 
    });
  } finally {
    await dbManager.disconnect();
  }
});

// Reset all motivation letters - DELETE all motivation letters and reset status to Pending
app.delete("/api/ausbildung/reset-letters", authenticateToken, async (req, res) => {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.connect();
    
    const userId = getUserIdFromToken(req);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    }

    // Get all jobs for the user to count them
    const allJobs = await dbManager.prisma.ausbildung.findMany({
      where: { userId: userId },
      select: { 
        id: true, 
        title: true, 
        institution: true,
        motivationLetter: true,
        status: true 
      }
    });

    // Count jobs with motivation letters before reset
    const jobsWithLetters = allJobs.filter(job => job.motivationLetter !== null);
    const jobsAlreadyPending = allJobs.filter(job => job.status === "Pending");

    // Reset all motivation letters and status to Pending
    const updateResult = await dbManager.prisma.ausbildung.updateMany({
      where: { 
        userId: userId 
      },
      data: {
        motivationLetter: null, // Remove motivation letter
        status: "Pending"       // Reset status to Pending
      }
    });

    logger.info(`Reset motivation letters for user ${userId}:`, {
      totalJobs: allJobs.length,
      jobsWithLettersBefore: jobsWithLetters.length,
      jobsAlreadyPending: jobsAlreadyPending.length,
      updatedCount: updateResult.count
    });

    res.status(200).json({
      success: true,
      message: "All motivation letters deleted and jobs reset to Pending status",
      stats: {
        totalJobs: allJobs.length,
        jobsWithLettersRemoved: jobsWithLetters.length,
        jobsUpdated: updateResult.count,
        previouslyPending: jobsAlreadyPending.length
      }
    });

  } catch (error) {
    logger.error("Failed to reset motivation letters:", { 
      error: error.message, 
      stack: error.stack,
      userId: getUserIdFromToken(req) 
    });
    res.status(500).json({ 
      error: "Failed to reset motivation letters.", 
      details: error.message 
    });
  } finally {
    await dbManager.disconnect();
  }
});

app.use("/api/users", authRouter);

app.use("/api/ausbildung", addAusbildung);
app.use("/api/settings", settingsRouter);

const frontendDistPath = path.resolve(__dirname, "public");

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.use((req, res, next) => {
    if (
      req.method !== "GET" ||
      req.path.startsWith("/api") ||
      path.extname(req.path)
    ) {
      return next();
    }

    return res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || config.app.port || 3000);
const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${displayHost}:${PORT}`);
});