import { useState, useRef, useEffect } from 'react';
import { generateResponse as openaiResponse } from '../services/openai';
import { generateResponse as geminiResponse } from '../services/gemini';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('text'); // text, voice, video
  const [isListening, setIsListening] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Text-to-Speech function
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start/Stop Voice Recognition
  const toggleVoiceRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Start/Stop Video
  const toggleVideo = async () => {
    if (isVideoActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsVideoActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setIsVideoActive(true);
        }
      } catch (err) {
        console.error('Error accessing camera/microphone:', err);
        alert('Camera access denied. Please enable camera permissions.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await openaiResponse([...messages, userMessage]);
      const aiMessage = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, aiMessage]);

      // Streaming effect
      for (let i = 0; i < response.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = response.slice(0, i + 1);
          return newMessages;
        });
      }

      // Speak response in voice mode
      if (mode === 'voice') {
        speakText(response);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Mode Toggle */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={() => setMode('text')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            mode === 'text'
              ? 'bg-blue-600 text-white shadow-lg scale-105'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          💬 Text
        </button>
        <button
          onClick={() => setMode('voice')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            mode === 'voice'
              ? 'bg-blue-600 text-white shadow-lg scale-105'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🎤 Voice
        </button>
        <button
          onClick={() => setMode('video')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            mode === 'video'
              ? 'bg-blue-600 text-white shadow-lg scale-105'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📹 Video
        </button>
      </div>

      {/* Video Mode */}
      {mode === 'video' && (
        <div className="mb-4 rounded-lg overflow-hidden bg-gray-900">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-96 object-cover"
          />
          <div className="flex justify-center gap-4 p-4">
            <button
              onClick={toggleVideo}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                isVideoActive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isVideoActive ? '⏹️ Stop Camera' : '▶️ Start Camera'}
            </button>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-lg">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p className="text-xl">👋 Hello! I'm your AI assistant.</p>
            <p className="mt-2">Start a conversation in text, voice, or video mode!</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] p-4 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 rounded-bl-none shadow-md'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-md">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        {mode === 'voice' && (
          <button
            type="button"
            onClick={toggleVoiceRecognition}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              isListening
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isListening ? '🔴 Listening...' : '🎤 Speak'}
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'voice' ? 'Voice input or type...' : 'Type your message...'}
          className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </form>
    </div>
  );
};

export default Chat;