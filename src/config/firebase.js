const admin = require("firebase-admin");
const path = require("path");

function initFirebase() {
  if (admin.apps.length) return admin;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountPath) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing in .env");
  }

  const resolvedPath = path.resolve(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(require(resolvedPath)),
  });

  console.log("✅ Firebase Admin initialized");
  return admin;
}

const firebaseAdmin = initFirebase();
const db = firebaseAdmin.firestore();

module.exports = { admin: firebaseAdmin, db };