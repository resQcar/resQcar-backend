const admin = require("firebase-admin");
const path = require("path");

function initFirebase() {
  if (admin.apps.length) return admin.apps[0];
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    console.log("Looking for key at:", serviceAccountPath);
    if (!serviceAccountPath) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT in .env");
    }
    const resolvedPath = path.resolve(serviceAccountPath);
    console.log("Resolved path:", resolvedPath);
    const serviceAccount = require(resolvedPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log("Firebase connected");
  } catch (error) {
    console.error("Firebase error:", error.message);
  }
}

initFirebase();
const auth = admin.auth();
const db = admin.firestore();
const bucket = null;
module.exports = { admin, auth, db, bucket };
