import { useState, useRef, useEffect } from 'react';
import { generateResponse } from '../services/openai';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [mode, setMode] = useState('text'); // 'text', 'voice', or 'video'
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedResponse]);

  const simulateTyping = async (text) => {
    setIsTyping(true);
    setDisplayedResponse('');
    const chars = text.split('');
    
    for (let i = 0; i < chars.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
      setDisplayedResponse(prev => prev + chars[i]);
    }
    
    setIsTyping(false);
    return text;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await generateResponse([...messages, userMessage]);
      await simulateTyping(response);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setDisplayedResponse('');
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-white mb-2">Chat with Jerry's AI Twin</h1>
        
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('text')}
            className={`px-4 py-2 rounded-lg transition-all ${
              mode === 'text'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📝 Text
          </button>
          <button
            onClick={() => setMode('voice')}
            className={`px-4 py-2 rounded-lg transition-all ${
              mode === 'voice'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎤 Voice
          </button>
          <button
            onClick={() => setMode('video')}
            className={`px-4 py-2 rounded-lg transition-all ${
              mode === 'video'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📹 Video
          </button>
        </div>

        {/* Mode-specific notifications */}
        {mode === 'voice' && (
          <p className="text-yellow-400 text-sm mt-2">🚧 Voice mode coming soon!</p>
        )}
        {mode === 'video' && (
          <p className="text-yellow-400 text-sm mt-2">🚧 Video mode coming soon!</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-xl mb-2">👋 Hi! I'm Mexty, Jerry's digital twin.</p>
            <p>Ask me anything about Jerry's work, projects, skills, or just chat!</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] p-4 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {/* Typing animation */}
        {isTyping && displayedResponse && (
          <div className="flex justify-start">
            <div className="max-w-[70%] p-4 rounded-lg bg-gray-700 text-gray-100">
              <p className="whitespace-pre-wrap">{displayedResponse}<span className="animate-pulse">▊</span></p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isTyping || mode !== 'text'}
            className="flex-1 p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim() || mode !== 'text'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;