// Gemini AI Service - Client-side wrapper
// Note: This does NOT expose API keys - all calls are proxied through backend

/**
 * Send a chat message to Gemini AI via backend proxy
 * @param {string} message - The user's message
 * @param {Array} history - Chat history for context
 * @returns {Promise<string>} - AI response
 */
export const sendMessageToGemini = async (message, history = []) => {
  try {
    const response = await fetch('/api/chat/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error communicating with Gemini AI:', error);
    throw error;
  }
};

/**
 * Stream response from Gemini AI (for real-time chat)
 * @param {string} message - The user's message
 * @param {Array} history - Chat history for context
 * @param {Function} onChunk - Callback for each response chunk
 * @returns {Promise<void>}
 */
export const streamGeminiResponse = async (message, history = [], onChunk) => {
  try {
    const response = await fetch('/api/chat/gemini/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      onChunk(chunk);
    }
  } catch (error) {
    console.error('Error streaming from Gemini AI:', error);
    throw error;
  }
};

export default {
  sendMessageToGemini,
  streamGeminiResponse,
};
