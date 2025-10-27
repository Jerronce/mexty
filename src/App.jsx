import React from 'react';
import Chat from './components/Chat';

const App = () => (
  <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-purple-800 to-gray-900">
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-2xl bg-white/90 md:rounded-xl shadow-xl px-2 py-4 flex flex-col flex-1 min-h-[65vh] md:min-h-[80vh]">
        <Chat />
      </div>
    </div>
    <footer className="w-full bg-gray-900 text-gray-200 p-4 text-center text-xs md:text-sm">
      Powered by Mexty • Digital AI Twin
    </footer>
  </div>
);

export default App;
