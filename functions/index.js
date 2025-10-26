const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

// Import AI SDK libraries
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');

// Initialize AI clients with environment variables
// Note: These are securely stored in Firebase environment config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gemini AI Chat Endpoint
 * Proxies requests to Google's Gemini AI API
 * Keeps API keys secure on server-side
 */
exports.chatGemini = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { message, history = [] } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Initialize Gemini Pro model
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      // Format history for Gemini
      const chat = model.startChat({
        history: history.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      // Send message and get response
      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      return res.status(200).json({ response: text });
    } catch (error) {
      console.error('Gemini API Error:', error);
      return res.status(500).json({
        error: 'Failed to process request',
        details: error.message,
      });
    }
  });
});

/**
 * OpenAI Chat Endpoint
 * Proxies requests to OpenAI's GPT API
 * Keeps API keys secure on server-side
 */
exports.chatOpenAI = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { message, history = [] } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Format messages for OpenAI
      const messages = [
        ...history.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: message },
      ];

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 1000,
      });

      const response = completion.choices[0].message.content;

      return res.status(200).json({ response });
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return res.status(500).json({
        error: 'Failed to process request',
        details: error.message,
      });
    }
  });
});

/**
 * Unified Chat Endpoint
 * Routes to either Gemini or OpenAI based on model parameter
 */
exports.chat = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { message, model = 'gemini', history = [] } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
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
            maxOutputTokens: 1000,
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
          max_tokens: 1000,
        });

        response = completion.choices[0].message.content;
      } else {
        return res.status(400).json({ error: 'Invalid model specified' });
      }

      return res.status(200).json({ response });
    } catch (error) {
      console.error('Chat API Error:', error);
      return res.status(500).json({
        error: 'Failed to process request',
        details: error.message,
      });
    }
  });
});
