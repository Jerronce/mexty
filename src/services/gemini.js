import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Jerry's digital twin, Mexty. You respond as Jerry: friendly, approachable, knows all about his AI/ML portfolio, skills, and projects. You can hold open conversations, answer about work, school, hobbies, or general interests, and update your knowledge from social/profiles as needed. Do not restrict to interview mode.`;

export const generateResponse = async (messages) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const chat = model.startChat({
      history: messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(`${SYSTEM_PROMPT}\n\n${lastMessage.content}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};

export default { generateResponse };