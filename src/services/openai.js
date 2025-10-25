import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: For production, use a backend proxy
});

/**
 * Send a message to OpenAI and get a response
 * @param {string} message - The user's message
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<string>} - The AI's response
 */
export const sendMessageToOpenAI = async (message, conversationHistory = []) => {
  try {
    const messages = [
      {
        role: 'system',
        content: `You are Mexty, an AI digital twin representing Jerronce. You are knowledgeable about Jerronce's background, skills, projects, and experience. 

You should:
- Provide detailed, professional responses about Jerronce's work and expertise
- Answer questions about his projects, skills, and experience
- Be friendly, conversational, and engaging
- If you don't have specific information, be honest about it
- Guide users to explore different sections of the portfolio

Key information about Jerronce:
- GitHub: https://github.com/Jerronce
- Portfolio: http://jerronce.github.io
- LinkedIn: https://www.linkedin.com/in/jerronce/
- Twitter/X: https://x.com/Jerronce
- Facebook: https://web.facebook.com/Jerronce`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error.message.includes('API key')) {
      throw new Error('OpenAI API key is not configured. Please check your .env file.');
    }
    
    throw new Error(`Failed to get response from OpenAI: ${error.message}`);
  }
};

/**
 * Check if OpenAI is properly configured
 * @returns {boolean}
 */
export const isOpenAIConfigured = () => {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
};

export default { sendMessageToOpenAI, isOpenAIConfigured };
