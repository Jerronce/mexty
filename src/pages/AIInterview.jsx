import { useState } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'

function AIInterview() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [interviewStarted, setInterviewStarted] = useState(false)

  const startInterview = async () => {
    setInterviewStarted(true)
    const welcomeMsg = {
      role: 'ai',
      content: 'Welcome to your AI-powered interview practice! I\'m here to help you prepare for your next job interview. Tell me about the position you\'re interviewing for, and I\'ll ask you relevant questions.'
    }
    setMessages([welcomeMsg])
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Initialize Gemini AI with API key from environment variable
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

      // Build conversation context
      const context = messages.map(msg => 
        `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`
      ).join('\n')

      const prompt = `You are a professional interview coach conducting a mock interview. ${context}\nCandidate: ${input}\n\nProvide a thoughtful, professional response. Ask follow-up questions to help the candidate practice. Be encouraging but constructive.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const aiMessage = { 
        role: 'ai', 
        content: response.text() 
      }
      
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Sorry, I encountered an error. Please make sure your API key is configured correctly in the .env file.' 
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-interview">
      <h1>AI Interview Practice</h1>
      <p>Practice your interview skills with our advanced AI interviewer powered by Google Gemini</p>

      {!interviewStarted ? (
        <div className="interview-card">
          <h2>Ready to start?</h2>
          <p>Click the button below to begin your AI-powered interview practice session.</p>
          <button onClick={startInterview} className="cta-button">Start Interview</button>
        </div>
      ) : (
        <div className="interview-card">
          <div className="chat-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`}>
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
