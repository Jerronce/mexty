import { useState, useEffect } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sendMessageToOpenAI, isOpenAIConfigured } from '../services/openai'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

function AIInterview() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [aiEngine, setAiEngine] = useState('gemini') // 'gemini' or 'openai'
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition()

  // Update input with transcript
  useEffect(() => {
    if (transcript) {
      setInput(transcript)
    }
  }, [transcript])

  // Text-to-Speech function
  const speak = (text) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    
    window.speechSynthesis.speak(utterance)
  }

  // Stop speaking
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  // Start listening
  const startListening = () => {
    resetTranscript()
    setIsListening(true)
    SpeechRecognition.startListening({ continuous: true })
  }

  // Stop listening
  const stopListening = () => {
    setIsListening(false)
    SpeechRecognition.stopListening()
  }

  const startInterview = async () => {
    setInterviewStarted(true)
    const welcomeMsg = {
      role: 'ai',
      content: `Welcome to your AI-powered interview practice! I'm here to help you prepare for your next job interview using ${aiEngine === 'gemini' ? 'Google Gemini' : 'OpenAI'}. Tell me about the position you're interviewing for, and I'll ask you relevant questions.`
    }
    setMessages([welcomeMsg])
    
    // Speak welcome message if voice is enabled
    if (voiceEnabled) {
      speak(welcomeMsg.content)
    }
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

    // Stop listening when sending
    if (isListening) {
      stopListening()
    }

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    resetTranscript()
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
      
      // Speak AI response if voice is enabled
      if (voiceEnabled) {
        speak(aiResponse)
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = `Sorry, I encountered an error with ${aiEngine === 'gemini' ? 'Google Gemini' : 'OpenAI'}. Please make sure your API key is configured correctly in the .env file. Error: ${error.message}`
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: errorMessage
      }])
      
      if (voiceEnabled) {
        speak(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-interview">
      <h1>AI Interview Practice</h1>
      <p>Practice your interview skills with our advanced AI interviewer</p>
      
      {!browserSupportsSpeechRecognition && (
        <div style={{ padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '5px', marginBottom: '20px' }}>
          ⚠️ Your browser doesn't support speech recognition. Voice input will not be available.
        </div>
      )}

      {/* AI Engine Selector */}
      {!interviewStarted && (
        <div className="ai-engine-selector" style={{ textAlign: 'center', marginBottom: '20px' }}>
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
          <p>
            Click the button below to begin your AI-powered interview practice session with {aiEngine === 'gemini' ? 'Google Gemini' : 'OpenAI'}.
          </p>
          <button className="cta-button" onClick={startInterview}>Start Interview</button>
        </div>
      ) : (
        <div className="interview-card">
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Using: {aiEngine === 'gemini' ? 'Google Gemini' : 'OpenAI'}</span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={voiceEnabled} 
                  onChange={(e) => {
                    setVoiceEnabled(e.target.checked)
                    if (!e.target.checked) {
                      stopSpeaking()
                    }
                  }}
                />
                🔊 Voice Output
              </label>
              {isSpeaking && (
                <button 
                  onClick={stopSpeaking}
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  ⏹ Stop Speaking
                </button>
              )}
            </div>
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
              placeholder="Type your response or use voice input..."
              rows="3"
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              {browserSupportsSpeechRecognition && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={loading}
                  style={{
                    flex: '1',
                    padding: '10px',
                    backgroundColor: isListening ? '#ef4444' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  {isListening ? '🎤 Stop Listening' : '🎤 Start Voice Input'}
                </button>
              )}
              <button 
                onClick={sendMessage} 
                disabled={loading || !input.trim()}
                style={{
                  flex: '2',
                  padding: '10px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !input.trim()) ? 0.5 : 1
                }}
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
            {listening && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '5px', fontSize: '14px' }}>
                🎤 Listening... Speak now!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AIInterview
