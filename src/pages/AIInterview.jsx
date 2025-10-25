import { useState } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sendMessageToOpenAI, isOpenAIConfigured } from '../services/openai'

function AIInterview() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [aiEngine, setAiEngine] = useState('gemini') // 'gemini' or 'openai'

  const startInterview = async () => {
    setInterviewStarted(true)
    const welcomeMsg = {
      role: 'ai',
      content: `Welcome to your AI-powered interview practice! I'm here to help you prepare for your next job interview using ${aiEngine === 'gemini' ? 'Google Gemini' : 'OpenAI'}. Tell me about the position you're interviewing for, and I'll ask you relevant questions.`
    }
    setMessages([welcomeMsg])
  }

  const sendMessageWithGemini = async (userInput, conversationHistory) => {
    // Initialize Gemini AI with API key from environment variable
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    // Build conversation context
    const context = conversationHistory.map(msg => 
      `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`
    ).join('\n')
    
    const prompt = `You are a professional interview coach conducting a mock interview. ${context}\nCandidate: ${userInput}\n\nProvide a thoughtful, professional response. Ask follow-up questions to help the candidate practice. Be encouraging but constructive.`
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      let aiResponse

      if (aiEngine === 'openai') {
        // Use OpenAI
        const conversationHistory = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
        aiResponse = await sendMessageToOpenAI(input, conversationHistory)
      } else {
        // Use Gemini
        aiResponse = await sendMessageWithGemini(input, messages)
      }

      const aiMessage = { 
        role: 'ai', 
        content: aiResponse
      }
      
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `Sorry, I encountered an error with ${aiEngine === 'gemini' ? 'Google Gemini' : 'OpenAI'}. Please make sure your API key is configured correctly in the .env file. Error: ${error.message}` 
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-interview">
      <h1>AI Interview Practice</h1>
      <p>Practice your interview skills with our advanced AI interviewer</p>
      
      {/* AI Engine Selector */}
      {!interviewStarted && (
        <div className="ai-engine-selector" style={{ marginBottom: '20px', textAlign: 'center' }}>
          <label htmlFor="ai-engine" style={{ marginRight: '10px', fontWeight: 'bold' }}>
            Choose AI Engine:
          </label>
          <select 
            id="ai-engine"
            value={aiEngine} 
            onChange={(e) => setAiEngine(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '16px',
              borderRadius: '5px',
              border: '2px solid #6366f1',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai" disabled={!isOpenAIConfigured()}>
              OpenAI {!isOpenAIConfigured() && '(Not Configured)'}
            </option>
          </select>
        </div>
      )}

      {!interviewStarted ? (
        <div className="interview-card">
          <h2>Ready to start?</h2>
          <p>Click the button below to begin your AI-powered interview practice session with {aiEngine === 'gemini' ? 'Google Gemini' : 'OpenAI'}.</p>
          <button className="cta-button" onClick={startInterview}>Start Interview</button>
        </div>
      ) : (
        <div className="interview-card">
          <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
            Using: {aiEngine === 'gemini' ? 'Google Gemini' : 'OpenAI'}
          </div>
          <div className="chat-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}-message`}>
                <strong>{msg.role === 'user' ? 'You' : 'AI Interviewer'}:</strong>
                <p>{msg.content}</p>
              </div>
            ))}
            {loading && <div className="ai-message">AI is thinking...</div>}
          </div>
          <div className="input-group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Type your response..."
              rows="3"
            />
            <button onClick={sendMessage} disabled={loading}>Send</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIInterview
