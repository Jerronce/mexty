/**
 * Firebase Cloud Functions for Mexty Application
 * 
 * This file contains secure backend endpoints that proxy API calls to external services
 * keeping API keys and secrets secure on the server-side.
 * 
 * Required Firebase Secrets (set using Firebase CLI):
 * - OPENAI_API_KEY: OpenAI API key for GPT models and TTS
 * - GEMINI_API_KEY: Google Gemini API key
 * - GMAIL_USER: Gmail address for sending emails
 * - GMAIL_APP_PASSWORD: Gmail app-specific password
 * - ELEVENLABS_API_KEY: ElevenLabs API key (optional)
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
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Firebase Admin for Storage signed URLs
const admin = require('firebase-admin');
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    // ignore duplicate init in emulator
  }
}
const storage = admin.storage();

/**
 * CORS Configuration
 * Only allow requests from production app and Chrome extension
 * Production-ready with strict origin checking
 */
const allowedOrigins = [
  'https://mexty101.web.app',
  'https://mexty101.firebaseapp.com',
  /^chrome-extension:\/\/[a-z]{32}$/
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return origin === allowed;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    if (isAllowed) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};
const corsMiddleware = cors(corsOptions);

/**
 * Initialize AI clients with environment variables
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Initialize Nodemailer transporter for Gmail
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
 */
exports.ai = functions.https.onRequest(async (req, res) => {
  return corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed', message: 'Only POST requests are accepted' });
    }
    try {
      const { message, model = 'gemini', history = [] } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid input', message: 'Message is required and must be a string' });
      }
      let response;
      if (model === 'gemini') {
        const genModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const chat = genModel.startChat({
          history: history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          })),
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        });
        const result = await chat.sendMessage(message);
        const geminiResponse = await result.response;
        response = geminiResponse.text();
      } else if (model === 'openai') {
        const messages = [
          ...history.map(msg => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: message },
        ];
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages,
          max_tokens: 2000,
          temperature: 0.7,
        });
        response = completion.choices[0].message.content;
      } else {
        return res.status(400).json({ error: 'Invalid model', message: 'Model must be either "gemini" or "openai"' });
      }
      return res.status(200).json({ response, model, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('AI API Error:', error);
      return res.status(500).json({ error: 'Failed to process request', message: error.message, timestamp: new Date().toISOString() });
    }
  });
});

/**
 * /api/generateResume - Resume Generation Endpoint
 */
exports.generateResume = functions.https.onRequest(async (req, res) => {
  return corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed', message: 'Only POST requests are accepted' });
    }
    try {
      const { userData, model = 'gemini' } = req.body;
      if (!userData || typeof userData !== 'object') {
        return res.status(400).json({ error: 'Invalid input', message: 'userData is required and must be an object' });
      }
      const prompt = `Generate a professional resume based on the following information:\nName: ${userData.name || 'Not provided'}\nEmail: ${userData.email || 'Not provided'}\nPhone: ${userData.phone || 'Not provided'}\nExperience: ${userData.experience || 'Not provided'}\nEducation: ${userData.education || 'Not provided'}\nSkills: ${userData.skills || 'Not provided'}\nSummary: ${userData.summary || 'Not provided'}\nPlease generate a well-formatted, professional resume with clear sections for Summary, Experience, Education, and Skills. Use professional language and formatting.`;
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
        return res.status(400).json({ error: 'Invalid model', message: 'Model must be either "gemini" or "openai"' });
      }
      return res.status(200).json({ resume: response, model, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Resume Generation Error:', error);
      return res.status(500).json({ error: 'Failed to generate resume', message: error.message, timestamp: new Date().toISOString() });
    }
  });
});

/**
 * /api/sendMail - Email Sending Endpoint
 */
exports.sendMail = functions.https.onRequest(async (req, res) => {
  return corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed', message: 'Only POST requests are accepted' });
    }
    try {
      const { to, subject, text, html } = req.body;
      if (!to || !subject || !text) {
        return res.status(400).json({ error: 'Invalid input', message: 'to, subject, and text are required fields' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({ error: 'Invalid email', message: 'Please provide a valid email address' });
      }
      const mailOptions = {
        from: `Mexty <${process.env.GMAIL_USER}>`,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br/>')
      };
      const info = await mailTransporter.sendMail(mailOptions);
      return res.status(200).json({ success: true, messageId: info.messageId, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Email Sending Error:', error);
      return res.status(500).json({ error: 'Failed to send email', message: error.message, timestamp: new Date().toISOString() });
    }
  });
});

/**
 * /api/tts - Text-to-Speech Endpoint
 * Generates speech audio using OpenAI or ElevenLabs, stores to Firebase Storage, and returns a signed URL
 * Request body: { text: string, voice?: string, provider?: 'openai'|'elevenlabs', format?: 'mp3'|'wav' }
 */
exports.tts = functions.https.onRequest(async (req, res) => {
  return corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed', message: 'Only POST requests are accepted' });
    }
    try {
      const { text, voice = 'alloy', provider = 'openai', format = 'mp3' } = req.body || {};
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid input', message: 'text is required' });
      }

      let audioBuffer;

      if (provider === 'openai') {
        // Use OpenAI TTS (gpt-4o-mini-tts) if available
        const ttsResp = await openai.audio.speech.create({
          model: 'gpt-4o-mini-tts',
          voice,
          input: text,
          format,
        });
        const arrayBuf = await ttsResp.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuf);
      } else if (provider === 'elevenlabs') {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ error: 'Missing ELEVENLABS_API_KEY' });
        }
        const voiceId = voice || '21m00Tcm4TlvDq8ikWAM';
        const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.55, similarity_boost: 0.6 },
          })
        });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`ElevenLabs error: ${resp.status} ${errText}`);
        }
        const arrayBuf = await resp.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuf);
      } else {
        return res.status(400).json({ error: 'Invalid provider', message: 'provider must be openai or elevenlabs' });
      }

      // Store in Firebase Storage
      const bucket = storage.bucket();
      const fileId = uuidv4();
      const ext = format === 'wav' ? 'wav' : 'mp3';
      const filePath = `tts/${fileId}.${ext}`;
      const file = bucket.file(filePath);
      await file.save(audioBuffer, {
        contentType: ext === 'wav' ? 'audio/wav' : 'audio/mpeg',
        public: false,
        metadata: { cacheControl: 'public, max-age=31536000' }
      });

      // Signed URL valid for 24 hours
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({ url: signedUrl, path: filePath, provider, format: ext, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('TTS Error:', error);
      return res.status(500).json({ error: 'Failed to synthesize speech', message: error.message, timestamp: new Date().toISOString() });
    }
  });
});

/**
 * Legacy Endpoints (Backward Compatibility)
 */
exports.chatGemini = functions.https.onRequest(async (req, res) => { req.body.model = 'gemini'; return exports.ai(req, res); });
exports.chatOpenAI = functions.https.onRequest(async (req, res) => { req.body.model = 'openai'; return exports.ai(req, res); });
exports.chat = exports.ai;
