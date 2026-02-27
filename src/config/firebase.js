const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),

    // VERY IMPORTANT (replace with your real project id)
    storageBucket: `${serviceAccount.project_id}.appspot.com`,
  });
}

const auth = admin.auth();
const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, auth, db, bucket };