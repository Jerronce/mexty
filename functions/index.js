/**
 * Firebase Cloud Functions for Mexty Application
 * 
 * This file contains secure backend endpoints that proxy API calls to external services
 * keeping API keys and secrets secure on the server-side.
 * 
 * Required Firebase Secrets (set using Firebase CLI):
 * - OPENAI_API_KEY: OpenAI API key for GPT models
 * - GEMINI_API_KEY: Google Gemini API key
 * - GMAIL_USER: Gmail address for sending emails
 * - GMAIL_APP_PASSWORD: Gmail app-specific password
 * 
 * To set secrets, use:
 * firebase functions:secrets:set SECRET_NAME
 * 
 * @requires firebase-functions
 * @requires @google/generative-ai
 * @requires openai
 * @requires nodemailer
 */

const functions = require('firebase-functions');
const cors = require('cors');

// Import AI SDK libraries
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const nodemailer = require('nodemailer');

/**
 * CORS Configuration
 * Only allow requests from production app and Chrome extension
 * Production-ready with strict origin checking
 */
const allowedOrigins = [
  'https://mexty101.web.app',
  'https://mexty101.firebaseapp.com',
  /^chrome-extension:\/\/[a-z]{32}$/  // Chrome extension pattern
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

const corsMiddleware = cors(corsOptions);

/**
 * Initialize AI clients with environment variables
 * Secrets are stored securely in Firebase Functions environment
 * Access via: process.env.SECRET_NAME
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Initialize Nodemailer transporter for Gmail
 * Uses app-specific password for security
 */
const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

/**
 * /api/ai - Unified AI Chat Endpoint
 * Proxies requests to either Gemini or OpenAI based on model parameter
 * Keeps API keys secure on server-side
 * 
 * @route POST /api/ai
 * @param {string} message - User message to send to AI
 * @param {string} model - AI model to use ('gemini' or 'openai')
 * @param {Array} history - Chat history (optional)
 * @returns {Object} { response: string }
 */
exports.ai = functions.https.onRequest(async (req, res) => {
  return corsMiddleware(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed',
        message: 'Only POST requests are accepted'
      });
    }

    try {
      const { message, model = 'gemini', history = [] } = req.body;

      // Validate input
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
          error: 'Invalid input',
          message: 'Message is required and must be a string'
        });
      }

      let response;

      if (model === 'gemini') {
        // Use Gemini API
        const genModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const chat = genModel.startChat({
          history: history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          })),
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
          },
        });

        const result = await chat.sendMessage(message);
        const geminiResponse = await result.response;
        response = geminiResponse.text();
      } else if (model === 'openai') {
        // Use OpenAI API
        const messages = [
          ...history.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: 'user', content: message },
        ];

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 2000,
          temperature: 0.7,
        });

        response = completion.choices[0].message.content;
      } else {
        return res.status(400).json({ 
          error: 'Invalid model',
          message: 'Model must be either "gemini" or "openai"'
        });
      }

      return res.status(200).json({ 
        response,
        model,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('AI API Error:', error);
      return res.status(500).json({
        error: 'Failed to process request',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
});

/**
 * /api/generateResume - Resume Generation Endpoint
 * Uses AI to generate professional resume content
 * Proxies to AI APIs with structured prompts
 * 
 * @route POST /api/generateResume
 * @param {Object} userData - User information for resume
 * @param {string} model - AI model to use ('gemini' or 'openai')
 * @returns {Object} { resume: string, sections: Object }
 */
exports.generateResume = functions.https.onRequest(async (req, res) => {
  return corsMiddleware(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed',
        message: 'Only POST requests are accepted'
      });
    }

    try {
      const { userData, model = 'gemini' } = req.body;

      // Validate input
      if (!userData || typeof userData !== 'object') {
        return res.status(400).json({ 
          error: 'Invalid input',
          message: 'userData is required and must be an object'
        });
      }

      // Create structured prompt for resume generation
      const prompt = `Generate a professional resume based on the following information:

Name: ${userData.name || 'Not provided'}
Email: ${userData.email || 'Not provided'}
Phone: ${userData.phone || 'Not provided'}
Experience: ${userData.experience || 'Not provided'}
Education: ${userData.education || 'Not provided'}
Skills: ${userData.skills || 'Not provided'}
Summary: ${userData.summary || 'Not provided'}

Please generate a well-formatted, professional resume with clear sections for Summary, Experience, Education, and Skills. Use professional language and formatting.`;

      let response;

      if (model === 'gemini') {
        const genModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await genModel.generateContent(prompt);
        const geminiResponse = await result.response;
        response = geminiResponse.text();
      } else if (model === 'openai') {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        });
        response = completion.choices[0].message.content;
      } else {
        return res.status(400).json({ 
          error: 'Invalid model',
          message: 'Model must be either "gemini" or "openai"'
        });
      }

      return res.status(200).json({ 
        resume: response,
        model,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Resume Generation Error:', error);
      return res.status(500).json({
        error: 'Failed to generate resume',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
});

/**
 * /api/sendMail - Email Sending Endpoint
 * Sends emails via Gmail SMTP
 * Uses secure app-specific password
 * 
 * @route POST /api/sendMail
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 * @returns {Object} { success: boolean, messageId: string }
 */
exports.sendMail = functions.https.onRequest(async (req, res) => {
  return corsMiddleware(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed',
        message: 'Only POST requests are accepted'
      });
    }

    try {
      const { to, subject, text, html } = req.body;

      // Validate input
      if (!to || !subject || !text) {
        return res.status(400).json({ 
          error: 'Invalid input',
          message: 'to, subject, and text are required fields'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({ 
          error: 'Invalid email',
          message: 'Please provide a valid email address'
        });
      }

      // Configure mail options
      const mailOptions = {
        from: `Mexty <${process.env.GMAIL_USER}>`,
        to: to,
        subject: subject,
        text: text,
        html: html || text.replace(/\n/g, '<br>')
      };

      // Send email
      const info = await mailTransporter.sendMail(mailOptions);

      return res.status(200).json({ 
        success: true,
        messageId: info.messageId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Email Sending Error:', error);
      return res.status(500).json({
        error: 'Failed to send email',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
});

/**
 * Legacy Endpoints (Backward Compatibility)
 * These maintain compatibility with existing client code
 */

// Legacy Gemini endpoint
exports.chatGemini = functions.https.onRequest(async (req, res) => {
  req.body.model = 'gemini';
  return exports.ai(req, res);
});

// Legacy OpenAI endpoint
exports.chatOpenAI = functions.https.onRequest(async (req, res) => {
  req.body.model = 'openai';
  return exports.ai(req, res);
});

// Legacy unified chat endpoint
exports.chat = exports.ai;
