# mexty

React + Firebase + Gemini AI application with secure API key management

## Overview

This is a modern web application built with React, Firebase, and Google's Gemini AI, designed based on Figma specifications. The project includes secure API key management to protect sensitive credentials.

## Features

- ⚛️ React-based frontend
- 🔥 Firebase backend integration (Firestore, Authentication, Hosting)
- 🤖 Google Gemini AI integration
- 🔒 Secure API key management with .env files
- 📱 Responsive design based on Figma specifications

## Prerequisites

Before you begin, ensure you have:

- Node.js (v16 or higher)
- npm or yarn
- Firebase CLI installed (`npm install -g firebase-tools`)
- A Google Cloud account with Gemini API access
- A Firebase project

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Jerronce/mexty.git
cd mexty
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory (this file is already included in .gitignore to keep your keys secure):

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id

# Gemini AI Configuration
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Get Your API Keys

#### Firebase Configuration:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > General
4. Scroll down to "Your apps" section
5. Copy your Firebase configuration values

#### Gemini API Key:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create or select a project
3. Generate an API key
4. Copy the API key to your `.env` file

### 5. Run Development Server

```bash
npm start
```

The application will open at `http://localhost:3000`

### 6. Firebase Setup

Initialize Firebase in your project:

```bash
firebase login
firebase init
```

During initialization:
- Select "Hosting" and "Firestore"
- Use existing project
- **Set build directory to `dist`**
- Configure as single-page app: Yes
- Set up automatic builds with GitHub: Optional

### 7. Build and Deploy

```bash
# Build the project
npm run build

# Deploy to Firebase Hosting
firebase deploy
```

## Security Best Practices

- ✅ **Never commit your `.env` file** - it's already in `.gitignore`
- ✅ Use Firebase security rules to protect your database
- ✅ Implement proper authentication and authorization
- ✅ Restrict API keys to specific domains in production
- ❌ Don't share API keys publicly
- ❌ Don't use production keys in development

## Project Structure

```
mexty/
├── public/
├── src/
│   ├── components/
│   ├── services/
│   │   ├── firebase.js
│   │   └── gemini.js
│   ├── App.js
│   └── index.js
├── .env (not tracked by git)
├── .gitignore
├── firebase.json
├── firestore.rules
├── package.json
└── README.md
```

## Environment Variables in Production

For Firebase Hosting, set environment variables using Firebase Functions configuration:

```bash
firebase functions:config:set gemini.api_key="your_key"
```

## Troubleshooting

- **API keys not working:** Ensure your `.env` variables start with `REACT_APP_`
- **Firebase errors:** Check your Firebase configuration in the console
- **Build fails:** Clear cache with `npm cache clean --force` and reinstall dependencies

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

This project is private and proprietary.

## Support

For issues or questions, please open a GitHub issue in this repository.
