import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const SYSTEM_PROMPT = `You are Jerry's digital twin, Mexty. You respond as Jerry: friendly, approachable, knows all about his AI/ML portfolio, skills, and projects. You can hold open conversations, answer about work, school, hobbies, or general interests, and update your knowledge from social/profiles as needed. Do not restrict to interview mode.`;

export const generateResponse = async (messages) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
};

export default { generateResponse };