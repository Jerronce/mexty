// Mexty Extension - Popup.js
// React-based UI with Ready Player Me Avatar, Chat/Voice Toggle, and Action Buttons

const API_BASE_URL = 'https://us-central1-mexty101.cloudfunctions.net/api';

// State Management
let state = {
  mode: 'chat', // 'chat' or 'voice'
  messages: [],
  isLoading: false,
  isListening: false,
  avatarUrl: null,
  user: null
};

// Speech Recognition & Synthesis
let recognition = null;
let synthesis = window.speechSynthesis;

// Initialize Speech Recognition
function initSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleUserMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      state.isListening = false;
      render();
    };

    recognition.onend = () => {
      state.isListening = false;
      render();
    };
  }
}

// Text-to-Speech
function speak(text) {
  if (synthesis && state.mode === 'voice') {
    synthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Select a voice (preferably a male voice for Jerry)
    const voices = synthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Male'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    synthesis.speak(utterance);
  }
}

// Start/Stop Voice Listening
function toggleVoice() {
  if (!recognition) {
    alert('Speech recognition is not supported in your browser.');
    return;
  }

  if (state.isListening) {
    recognition.stop();
    state.isListening = false;
  } else {
    recognition.start();
    state.isListening = true;
  }
  render();
}

// Handle User Message
async function handleUserMessage(message) {
  if (!message.trim()) return;

  // Add user message
  state.messages.push({ role: 'user', content: message });
  state.isLoading = true;
  render();

  try {
    // Get auth token from background
    const { token } = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    
    // Send to backend
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        conversationHistory: state.messages.slice(-10) // Last 10 messages for context
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Add Mexty's response
      state.messages.push({ role: 'mexty', content: data.reply });
      
      // Speak response if in voice mode
      if (state.mode === 'voice') {
        speak(data.reply);
      }
    } else {
      throw new Error(data.error || 'Failed to get response');
    }
  } catch (error) {
    console.error('Error:', error);
    state.messages.push({ 
      role: 'mexty', 
      content: 'Sorry, I encountered an error. Please try again.' 
    });
  } finally {
    state.isLoading = false;
    render();
    scrollToBottom();
  }
}

// Send Chat Message
function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (message) {
    handleUserMessage(message);
    input.value = '';
  }
}

// Toggle Mode (Chat/Voice)
function toggleMode(mode) {
  state.mode = mode;
  
  // Stop listening if switching from voice
  if (mode !== 'voice' && state.isListening) {
    recognition.stop();
    state.isListening = false;
  }
  
  render();
}

// Action Buttons
async function generateResume() {
  try {
    const { token } = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    
    const response = await fetch(`${API_BASE_URL}/generate-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      // Open resume in new tab
      chrome.tabs.create({ url: data.resumeUrl });
    } else {
      alert('Failed to generate resume: ' + data.error);
    }
  } catch (error) {
    console.error('Error generating resume:', error);
    alert('Failed to generate resume. Please try again.');
  }
}

async function generateCoverLetter() {
  try {
    const { token } = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    
    // Get current job posting URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await fetch(`${API_BASE_URL}/generate-cover-letter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ jobUrl: tab.url })
    });

    const data = await response.json();
    
    if (data.success) {
      chrome.tabs.create({ url: data.coverLetterUrl });
    } else {
      alert('Failed to generate cover letter: ' + data.error);
    }
  } catch (error) {
    console.error('Error generating cover letter:', error);
    alert('Failed to generate cover letter. Please try again.');
  }
}

async function autoFillForm() {
  try {
    // Send message to content script to auto-fill
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'autoFillForm' }, (response) => {
      if (response && response.success) {
        alert('Form auto-filled successfully!');
      } else {
        alert('No fillable form detected on this page.');
      }
    });
  } catch (error) {
    console.error('Error auto-filling form:', error);
    alert('Failed to auto-fill form. Please try again.');
  }
}

async function syncData() {
  try {
    const { token } = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    
    const response = await fetch(`${API_BASE_URL}/sync-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Profile synced successfully!');
    } else {
      alert('Failed to sync profile: ' + data.error);
    }
  } catch (error) {
    console.error('Error syncing data:', error);
    alert('Failed to sync profile. Please try again.');
  }
}

// Load Avatar URL
async function loadAvatar() {
  try {
    const { token } = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    
    const response = await fetch(`${API_BASE_URL}/get-avatar`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (data.success && data.avatarUrl) {
      state.avatarUrl = data.avatarUrl;
      render();
    }
  } catch (error) {
    console.error('Error loading avatar:', error);
  }
}

// Scroll to Bottom of Chat
function scrollToBottom() {
  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

// Render UI
function render() {
  const root = document.getElementById('root');
  
  root.innerHTML = `
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div>
          <h1>Mexty</h1>
          <div class="subtitle">Jerry's AI Twin</div>
        </div>
        <div class="status-indicator"></div>
      </div>

      <!-- Avatar Container -->
      <div class="avatar-container">
        ${state.avatarUrl ? 
          `<iframe class="avatar-iframe" src="${state.avatarUrl}" allow="camera *; microphone *"></iframe>` :
          '<div class="avatar-placeholder">M</div>'
        }
        <div class="voice-indicator ${state.isListening ? 'active' : ''}"></div>
      </div>

      <!-- Mode Toggle -->
      <div class="mode-toggle">
        <button class="mode-btn ${state.mode === 'chat' ? 'active' : ''}" onclick="toggleMode('chat')">
          💬 Chat
        </button>
        <button class="mode-btn ${state.mode === 'voice' ? 'active' : ''}" onclick="toggleMode('voice')">
          🎤 Voice
        </button>
      </div>

      <!-- Chat Container -->
      <div class="chat-container" id="chatContainer">
        ${state.messages.length === 0 ? 
          '<div class="message mexty">Hi! I\'m Mexty, Jerry\'s AI twin. How can I help you today?</div>' :
          state.messages.map(msg => 
            `<div class="message ${msg.role}">${msg.content}</div>`
          ).join('')
        }
        ${state.isLoading ? 
          '<div class="message mexty"><div class="loading"><span></span><span></span><span></span></div></div>' :
          ''
        }
      </div>

      <!-- Input Container -->
      ${state.mode === 'chat' ? `
        <div class="input-container">
          <input 
            type="text" 
            class="input-field" 
            id="messageInput" 
            placeholder="Type your message..."
            onkeypress="if(event.key==='Enter') sendMessage()"
          />
          <button class="send-btn" onclick="sendMessage()">Send</button>
        </div>
      ` : `
        <div class="input-container">
          <button 
            class="send-btn" 
            style="flex: 1; ${state.isListening ? 'background: rgba(255, 0, 0, 0.3);' : ''}" 
            onclick="toggleVoice()"
          >
            ${state.isListening ? '🛑 Stop Listening' : '🎤 Start Speaking'}
          </button>
        </div>
      `}

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="action-btn" onclick="generateResume()">📄 Resume</button>
        <button class="action-btn" onclick="generateCoverLetter()">✉️ Cover Letter</button>
        <button class="action-btn" onclick="autoFillForm()">⚡ Auto-Fill</button>
        <button class="action-btn" onclick="syncData()">🔄 Sync Data</button>
      </div>
    </div>
  `;
  
  // Focus input if in chat mode
  if (state.mode === 'chat') {
    setTimeout(() => {
      const input = document.getElementById('messageInput');
      if (input) input.focus();
    }, 100);
  }
}

// Make functions globally available
window.toggleMode = toggleMode;
window.sendMessage = sendMessage;
window.toggleVoice = toggleVoice;
window.generateResume = generateResume;
window.generateCoverLetter = generateCoverLetter;
window.autoFillForm = autoFillForm;
window.syncData = syncData;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initSpeechRecognition();
  loadAvatar();
  render();
  
  // Load voices for speech synthesis
  if (synthesis) {
    synthesis.onvoiceschanged = () => {
      synthesis.getVoices();
    };
  }
  
  // Add welcome message
  setTimeout(() => {
    if (state.messages.length === 0) {
      scrollToBottom();
    }
  }, 500);
});
