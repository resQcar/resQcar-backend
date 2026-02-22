// src/config/firebase.js
const admin = require("firebase-admin");
const path = require("path");

function initFirebase() {
  if (admin.apps.length) return;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountPath) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT in .env");
  }

  const resolvedPath = path.resolve(serviceAccountPath);
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const serviceAccount = require(resolvedPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

initFirebase();

const db = admin.firestore();

module.exports = { admin, db };