import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Loader2, MessageSquare, Volume2 } from 'lucide-react';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini'); // 'gemini' or 'openai'
  const [mode, setMode] = useState('text'); // 'text' or 'voice'
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        } else {
          setTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (transcript.trim()) {
        setInputText(transcript.trim());
      }
      setTranscript('');
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = async () => {
    const messageText = inputText.trim() || transcript.trim();
    if (!messageText || isProcessing) return;

    // Add user message
    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setTranscript('');
    setIsProcessing(true);

    try {
      // Call backend proxy endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          model: selectedModel,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantMessage = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);

      // Text-to-speech for voice mode
      if (mode === 'voice' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-4 border border-white/20">
          <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-8 h-8" />
            Chat with Mexty
          </h1>
          
          {/* Mode Toggle */}
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setMode('text')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                mode === 'text'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Text Chat
            </button>
            <button
              onClick={() => setMode('voice')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                mode === 'voice'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              Voice Chat
            </button>
          </div>

          {/* Model Selection */}
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedModel('gemini')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedModel === 'gemini'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Gemini AI
            </button>
            <button
              onClick={() => setSelectedModel('openai')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedModel === 'openai'
                  ? 'bg-green-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              OpenAI
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-4 border border-white/20 h-[500px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/50">
              <p className="text-center">
                Start a conversation by typing or using voice input.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
          {/* Live Transcript Display */}
          {isListening && transcript && (
            <div className="mb-3 p-3 bg-white/10 rounded-lg border border-purple-500">
              <p className="text-sm text-white/70 mb-1">Live transcript:</p>
              <p className="text-white">{transcript}</p>
            </div>
          )}

          <div className="flex gap-3">
            {mode === 'voice' && (
              <button
                onClick={toggleListening}
                disabled={isProcessing}
                className={`p-3 rounded-full transition-all ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isListening ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>
            )}

            <input
              type="text"
              value={inputText || transcript}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={mode === 'voice' ? 'Or type your message...' : 'Type your message...'}
              disabled={isProcessing || isListening}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />

            <button
              onClick={sendMessage}
              disabled={(!inputText.trim() && !transcript.trim()) || isProcessing}
              className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
