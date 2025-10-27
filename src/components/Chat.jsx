import React, { useState } from 'react';

const Chat = () => {
  const [mode, setMode] = useState('text');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "👋 Hello! I'm your AI assistant. Start a conversation in text, voice, or video mode!" }
  ]);

  const handleModeChange = (m) => setMode(m);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessages([...messages, { sender: 'user', text: message }]);
    setMessage('');
    // TODO: send message to AI and append response with setMessages
  };

  return (
    <div className="flex flex-col w-full flex-1 min-h-[65vh]">
      {/* Mode Select */}
      <div className="flex justify-center my-4 gap-2">
        <button
          className={`px-4 py-2 rounded-full transition-all font-semibold shadow ${mode === 'text'
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
            : 'bg-gray-200 text-gray-800 hover:bg-blue-100'}`}
          onClick={() => handleModeChange('text')}
          type="button"
        >
          📝 Text
        </button>
        <button
          className={`px-4 py-2 rounded-full transition-all font-semibold shadow ${mode === 'voice'
            ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
            : 'bg-gray-200 text-gray-800 hover:bg-purple-100'}`}
          onClick={() => handleModeChange('voice')}
          type="button"
        >
          🎤 Voice
        </button>
        <button
          className={`px-4 py-2 rounded-full transition-all font-semibold shadow ${mode === 'video'
            ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white'
            : 'bg-gray-200 text-gray-800 hover:bg-green-100'}`}
          onClick={() => handleModeChange('video')}
          type="button"
        >
          📹 Video
        </button>
      </div>

      {/* Main Chat/Video Area */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto px-2">
        {mode === 'video' ? (
          <div className="flex flex-col w-full items-center justify-center gap-4">
            <div className="w-full flex flex-col md:flex-row gap-4">
              <div className="flex-1 aspect-video bg-gray-900 rounded-xl shadow-md flex items-center justify-center text-white text-xl">
                Video Feed
              </div>
              <div className="w-full md:w-1/3 aspect-[3/4] bg-gray-800 rounded-3xl shadow flex items-center justify-center text-white">
                Side Video/AI
              </div>
            </div>
            <div className="w-full text-center mt-4 font-semibold text-lg text-gray-700">Start a conversation with AI</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full max-h-[60vh] overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] px-4 py-2 rounded-xl shadow text-base ${
                  m.sender === 'user'
                    ? 'ml-auto bg-gradient-to-r from-blue-400 to-blue-700 text-white'
                    : 'mr-auto bg-gray-200 text-gray-800'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 left-0 right-0 flex gap-2 bg-white/90 px-2 py-2 border-t items-center w-full rounded-b-xl shadow mt-2"
      >
        {mode === 'voice' && (
          <button
            className="px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg font-bold"
            // onClick={} // connect to your mic logic
            type="button"
          >
            🎤
          </button>
        )}
        <input
          className="flex-1 border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 transition"
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-800 text-white rounded-lg font-bold"
          type="submit"
          disabled={!message.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
