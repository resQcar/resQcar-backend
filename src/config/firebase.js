// src/config/firebase.js
const admin = require("firebase-admin");
const path = require("path");

function initFirebase() {
  if (admin.apps.length) return admin.apps[0];

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    console.log("🔍 Looking for key at:", serviceAccountPath);

    if (!serviceAccountPath) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is missing in .env");
    }

    const resolvedPath = path.resolve(serviceAccountPath);
    console.log("🔍 Resolved path:", resolvedPath);

    const serviceAccount = require(resolvedPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`,
    });

  } catch (error) {
    console.error("❌ Firebase init error:", error.message);
    throw error;
  }
}

initFirebase();

const auth = admin.auth();
const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, auth, db, bucket };
