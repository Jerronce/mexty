/**
 * Firebase Configuration and Initialization
 * Client-side Firebase setup for Mexty application
 * 
 * This module exports Firebase app and Firestore instances initialized with
 * configuration from environment variables. No secrets are hardcoded or exposed.
 * 
 * @requires firebase/app
 * @requires firebase/firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase configuration object
 * All values are read from environment variables (.env file)
 * 
 * Required environment variables:
 * - VITE_FIREBASE_API_KEY: Firebase API key
 * - VITE_FIREBASE_AUTH_DOMAIN: Firebase Auth domain
 * - VITE_FIREBASE_PROJECT_ID: Firebase project ID
 * - VITE_FIREBASE_STORAGE_BUCKET: Firebase storage bucket
 * - VITE_FIREBASE_MESSAGING_SENDER_ID: Firebase messaging sender ID
 * - VITE_FIREBASE_APP_ID: Firebase app ID
 * 
 * @constant {Object} firebaseConfig
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

/**
 * Validate Firebase configuration
 * Ensures all required environment variables are present
 * @throws {Error} If any required configuration is missing
 */
const validateConfig = () => {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase configuration: ${missingKeys.join(', ')}. ` +
      'Please ensure all VITE_FIREBASE_* environment variables are set in your .env file.'
    );
  }
};

// Validate configuration before initialization
validateConfig();

/**
 * Initialize Firebase app
 * @constant {FirebaseApp} app - Initialized Firebase app instance
 */
export const app = initializeApp(firebaseConfig);

/**
 * Initialize Firestore
 * @constant {Firestore} db - Initialized Firestore database instance
 */
export const db = getFirestore(app);

/**
 * Export Firebase configuration for debugging purposes (non-sensitive only)
 * DO NOT expose sensitive keys through this export
 * @constant {Object} config
 */
export const config = {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
};

export default app;
