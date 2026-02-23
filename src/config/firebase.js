const admin = require("firebase-admin");
const path = require("path");

function initFirebase() {
  if (admin.apps.length) return;

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    console.log("🔍 Looking for key at:", serviceAccountPath);

    if (!serviceAccountPath) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT in .env");
    }

    const resolvedPath = path.resolve(serviceAccountPath);
    console.log("🔍 Resolved path:", resolvedPath);

    const serviceAccount = require(resolvedPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase connected");
  } catch (error) {
    console.error("❌ Firebase error:", error.message);
  }
}

initFirebase();

const db = admin.firestore();

module.exports = { admin, db };