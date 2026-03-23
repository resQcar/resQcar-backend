// src/config/firebase.js
const admin = require("firebase-admin");

function initFirebase() {
  if (admin.apps.length) return admin.apps[0];
  try {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Production: read from environment variable (Railway)
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log("Firebase: using env variable credentials");
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Local dev: read from file path
      const path = require("path");
      const resolvedPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT);
      serviceAccount = require(resolvedPath);
      console.log("Firebase: using file credentials from", resolvedPath);
    } else {
      throw new Error("No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    console.log("Firebase connected successfully");
  } catch (error) {
    console.error("Firebase init error:", error.message);
    process.exit(1); // crash fast so Railway shows a clear error
  }
}

initFirebase();
const auth = admin.auth();
const db = admin.firestore();
const bucket = null;
module.exports = { admin, auth, db, bucket };