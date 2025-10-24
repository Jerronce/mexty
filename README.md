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
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Gemini AI Configuration
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

**Important:** Never commit the `.env` file to the repository. The `.gitignore` file is configured to exclude it automatically.

### 4. Initialize React App

If starting from scratch:

```bash
npx create-react-app .
```

### 5. Install Required Packages

```bash
npm install firebase @google/generative-ai
```

### 6. Firebase Setup

Initialize Firebase in your project:

```bash
firebase login
firebase init
```

Select:
- Firestore
- Hosting
- Choose your existing Firebase project
- Set build directory to `build`
- Configure as single-page app: Yes

### 7. Development

Run the development server:

```bash
npm start
```

Your app will be available at `http://localhost:3000`

## Deployment to Firebase Hosting

### 1. Build the Production App

```bash
npm run build
```

### 2. Deploy to Firebase

```bash
firebase deploy
```

Your app will be deployed to: `https://your-project-id.web.app`

## Security Best Practices

✅ **DO:**
- Keep `.env` file locally and never commit it
- Use Firebase Hosting environment configuration for production
- Regularly rotate API keys
- Use Firebase Security Rules to protect your database

❌ **DON'T:**
- Commit `.env` files to version control
- Share API keys publicly
- Use production keys in development

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
