// src/controllers/users.controller.js
const { admin, auth, db } = require('../config/firebase');

// Helpers
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidE164(phone) {
  return typeof phone === 'string' && /^\+\d{10,15}$/.test(phone);
}

function isValidUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// POST /api/users/documents
async function uploadUserDocuments(req, res) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    const files = [];

    if (req.file) files.push(req.file);

    if (req.files && typeof req.files === 'object') {
      for (const arr of Object.values(req.files)) {
        if (Array.isArray(arr)) files.push(...arr);
      }
    }

    if (!files.length) {
      return res.status(400).json({
        message: 'No files uploaded. Use multipart/form-data with fields: vehicleDocs and/or license.',
      });
    }

    const batch = db.batch();
    const created = [];

    for (const f of files) {
      const fieldName = (f.fieldname || 'document').toString();
      const docType = fieldName.toLowerCase();

      const docRef = db
        .collection('users')
        .doc(uid)
        .collection('documents')
        .doc();

      const normalized = f.path.split('uploads').pop().replace(/\\/g, '/');
      const publicUrl = `/uploads${normalized}`;

      const data = {
        docType,
        field: fieldName,
        originalName: f.originalname,
        fileName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        url: publicUrl,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      batch.set(docRef, data);
      created.push({ id: docRef.id, ...data });
    }

    await batch.commit();

    return res.status(201).json({
      message: 'Documents uploaded successfully.',
      count: created.length,
      documents: created,
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to upload documents.',
      error: err?.message || String(err),
    });
  }
}

// GET /api/users/documents
async function getUserDocuments(req, res) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('documents')
      .orderBy('uploadedAt', 'desc')
      .get();

    const documents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return res.status(200).json({
      message: 'User documents fetched successfully.',
      count: documents.length,
      documents,
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch documents.',
      error: err?.message || String(err),
    });
  }
}

// GET /api/users/profile
async function getUserProfile(req, res) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    const userRecord = await auth.getUser(uid);
    const claims = userRecord.customClaims || {};

    // Also get extra fields from Firestore
    const firestoreDoc = await db.collection('users').doc(uid).get();
    const firestoreData = firestoreDoc.exists ? firestoreDoc.data() : {};

    return res.status(200).json({
      message: 'User profile fetched successfully.',
      user: {
        uid: userRecord.uid,
        email: userRecord.email || null,
        fullName: userRecord.displayName || firestoreData.fullName || null,
        phoneNumber: userRecord.phoneNumber || firestoreData.phone || null,
        photoURL: userRecord.photoURL || null,
        userType: claims.userType ?? req.user?.userType ?? null,
        name: firestoreData.name || null,
        address: firestoreData.address || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch user profile.',
      error: err?.message || String(err),
    });
  }
}

// PUT /api/users/profile
async function updateUserProfile(req, res) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    const { fullName, phoneNumber, photoURL, name, phone, address } = req.body || {};
    const authUpdateData = {};
    const firestoreUpdateData = {};

    // Update Firebase Auth fields
    if (fullName !== undefined) {
      if (fullName === '' || fullName === null) authUpdateData.displayName = null;
      else if (!isNonEmptyString(fullName) || fullName.trim().length < 2) {
        return res.status(400).json({ message: 'fullName must be 2+ characters.' });
      } else authUpdateData.displayName = fullName.trim();
    }

    if (phoneNumber !== undefined) {
      if (phoneNumber === '' || phoneNumber === null) authUpdateData.phoneNumber = null;
      else if (!isValidE164(phoneNumber)) {
        return res.status(400).json({
          message: 'phoneNumber must be E.164 like +94771234567 (no spaces).',
        });
      } else authUpdateData.phoneNumber = phoneNumber;
    }

    if (photoURL !== undefined) {
      if (photoURL === '' || photoURL === null) authUpdateData.photoURL = null;
      else if (!isValidUrl(photoURL)) {
        return res.status(400).json({ message: 'photoURL must be a valid URL.' });
      } else authUpdateData.photoURL = photoURL;
    }

    // Update Firestore fields (from user.controller.js)
    if (name !== undefined) firestoreUpdateData.name = name;
    if (phone !== undefined) firestoreUpdateData.phone = phone;
    if (address !== undefined) firestoreUpdateData.address = address;

    if (Object.keys(authUpdateData).length === 0 && Object.keys(firestoreUpdateData).length === 0) {
      return res.status(400).json({
        message: 'Send at least one field: fullName, phoneNumber, photoURL, name, phone, address',
      });
    }

    // Update Firebase Auth if needed
    if (Object.keys(authUpdateData).length > 0) {
      await auth.updateUser(uid, authUpdateData);
    }

    // Update Firestore if needed
    if (Object.keys(firestoreUpdateData).length > 0) {
      await db.collection('users').doc(uid).set(firestoreUpdateData, { merge: true });
    }

    const userRecord = await auth.getUser(uid);
    return res.status(200).json({
      message: 'User profile updated successfully.',
      user: {
        uid: userRecord.uid,
        email: userRecord.email || null,
        fullName: userRecord.displayName || null,
        phoneNumber: userRecord.phoneNumber || null,
        photoURL: userRecord.photoURL || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to update user profile.',
      error: err?.message || String(err),
      code: err?.code || null,
    });
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadUserDocuments,
  getUserDocuments,
};
