// src/config/firebase.js
const admin = require('firebase-admin');
const path = require('path');

// FIX: Ensure GOOGLE_APPLICATION_CREDENTIALS is an absolute path
// This prevents ENOENT errors when running scripts from subdirectories (like src/)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../', process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

// Initialize Firebase Admin
// Ensure GOOGLE_APPLICATION_CREDENTIALS env var is set to your service account key path
// OR set FIREBASE_CONFIG env var
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('Firebase Admin Initialized');
  } catch (error) {
    console.error('Firebase Admin Initialization Failed:', error);
  }
}

module.exports = admin;