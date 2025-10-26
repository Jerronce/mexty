# Chat Component Setup Guide

## Overview

The Chat.jsx component provides a modular, production-ready voice and text chat interface for Mexty. It integrates with both Google's Gemini AI and OpenAI's GPT models through secure backend proxies.

## Features

✅ **Text & Voice Input**: Toggle between typing messages or using voice input via Web Speech API
✅ **Dual AI Support**: Choose between Gemini AI or OpenAI GPT-3.5-turbo
✅ **Real-time Transcription**: Live speech-to-text with interim results
✅ **Text-to-Speech**: Voice mode reads AI responses aloud
✅ **Secure Backend**: All API keys hidden server-side in Firebase Functions
✅ **Modern UI**: Tailwind CSS with glassmorphism design matching project style
✅ **Chat History**: Maintains conversation context for better responses

## Architecture

```
Client (Browser)
├── Chat.jsx (React Component)
│   ├── Web Speech API (voice input)
│   └── SpeechSynthesis API (voice output)
│
└── Services
    ├── gemini.js (Gemini API wrapper)
    └── openai.js (OpenAI API wrapper)

Backend (Firebase Functions)
├── /api/chat (Unified endpoint)
├── /api/chat/gemini (Gemini-specific)
└── /api/chat/openai (OpenAI-specific)
```

## Files Created

### Frontend
- `/src/components/Chat.jsx` - Main chat component
- `/src/services/gemini.js` - Gemini service wrapper
- `/src/services/openai.js` - OpenAI service wrapper (existing)

### Backend
- `/functions/index.js` - Firebase Cloud Functions
- `/functions/package.json` - Dependencies

## Setup Instructions

### 1. Install Dependencies

**Frontend (root directory):**
```bash
npm install lucide-react
```

**Backend (functions directory):**
```bash
cd functions
npm install
```

### 2. Configure Environment Variables

**Set Firebase Functions Environment Variables:**
```bash
firebase functions:config:set \
  gemini.api_key="YOUR_GEMINI_API_KEY" \
  openai.api_key="YOUR_OPENAI_API_KEY"
```

**For local development (.env in functions directory):**
```env
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Deploy Firebase Functions

**Deploy to production:**
```bash
firebase deploy --only functions
```

**Test locally (optional):**
```bash
cd functions
npm run serve
```

### 4. Update Firebase Hosting Rewrite Rules

Add to `firebase.json`:
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/**",
        "function": "chat"
      }
    ]
  }
}
```

### 5. Use the Chat Component

In your React app (e.g., `App.jsx` or a page):
```jsx
import Chat from './components/Chat';

function ChatPage() {
  return <Chat />;
}
```

Or add a route:
```jsx
import { BrowserRouter, Route } from 'react-router-dom';
import Chat from './components/Chat';

<Route path="/chat" element={<Chat />} />
```

## API Endpoints

### POST /api/chat
Unified chat endpoint that routes to either Gemini or OpenAI based on the `model` parameter.

**Request:**
```json
{
  "message": "Hello, how are you?",
  "model": "gemini",  // or "openai"
  "history": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response:**
```json
{
  "response": "I'm doing well, thank you for asking!"
}
```

### POST /api/chat/gemini
Direct Gemini AI endpoint.

### POST /api/chat/openai
Direct OpenAI endpoint.

## Component Props

The Chat component is self-contained and doesn't require props, but you can extend it:

```jsx
// Example customization
const Chat = ({ initialModel = 'gemini', theme = 'dark' }) => {
  // Component logic
};
```

## Browser Compatibility

**Web Speech API support:**
- ✅ Chrome/Edge (full support)
- ✅ Safari (iOS 12+, macOS 10.15+)
- ⚠️ Firefox (limited support)

**Fallback:** Component automatically disables voice features if Web Speech API is unavailable.

## Security Notes

1. **API Keys**: Never exposed to client-side code
2. **CORS**: Configured to accept requests from your Firebase domain
3. **Rate Limiting**: Consider adding rate limiting in Firebase Functions
4. **Authentication**: Add Firebase Auth checks if needed:

```javascript
// In functions/index.js
const admin = require('firebase-admin');

const verifyUser = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

## Customization

### Styling
The component uses Tailwind CSS. Customize colors in the JSX:
```jsx
className="bg-purple-600 hover:bg-purple-700"
// Change to your brand colors
```

### AI Models
Switch models in `functions/index.js`:
```javascript
// For Gemini
model: 'gemini-pro'  // or 'gemini-pro-vision'

// For OpenAI
model: 'gpt-3.5-turbo'  // or 'gpt-4', 'gpt-4-turbo'
```

### Voice Settings
Adjust speech synthesis in `Chat.jsx`:
```javascript
const utterance = new SpeechSynthesisUtterance(data.response);
utterance.rate = 1.0;  // Speed (0.1 to 10)
utterance.pitch = 1.0;  // Pitch (0 to 2)
utterance.volume = 1.0;  // Volume (0 to 1)
```

## Troubleshooting

### Issue: "Speech recognition not supported"
**Solution:** Use Chrome/Edge or enable Web Speech API in browser settings.

### Issue: "Failed to get response"
**Solutions:**
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify API keys are set correctly
3. Ensure billing is enabled on Firebase (Blaze plan required for external API calls)
4. Check CORS configuration

### Issue: Voice input not working
**Solutions:**
1. Grant microphone permissions
2. Use HTTPS (required for Web Speech API)
3. Test in incognito/private mode (extensions may interfere)

### Issue: Firebase Functions not deploying
**Solutions:**
1. Run `firebase login`
2. Check `firebase.json` configuration
3. Ensure Node.js version matches `functions/package.json` (Node 18)

## Performance Optimization

1. **Add caching** for repeated queries
2. **Implement streaming** for faster perceived response time
3. **Lazy load** the Chat component
4. **Add message pagination** for long conversations

## Next Steps

- [ ] Add user authentication
- [ ] Implement chat history persistence (Firestore)
- [ ] Add streaming responses for real-time output
- [ ] Create mobile-optimized version
- [ ] Add multi-language support
- [ ] Implement file upload for vision models

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Review browser console for client errors
3. Test API endpoints with Postman/curl
4. Verify environment variables are set

## License

This component is part of the Mexty project. See main README for license information.

---

**Created:** 2024
**Last Updated:** 2024
**Commit:** feat: restore Chat.jsx voice/text UI
