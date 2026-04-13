// src/services/jobs.service.js
const { db, admin } = require('../config/firebase');
const path = require('path');
const fsp = require('fs').promises;
const crypto = require('crypto');

// Update job status - PUT /api/jobs/:id/status
exports.updateJobStatus = async (jobId, status) => {
  const jobRef = db.collection('bookings').doc(jobId);
  const job = await jobRef.get();
  if (!job.exists) throw new Error('Job not found');
  await jobRef.update({
    status,
    updatedAt: new Date().toISOString()
  });
  const updatedJob = await jobRef.get();
  return { id: updatedJob.id, ...updatedJob.data() };
};

// Complete job - PUT /api/jobs/:id/complete
exports.completeJob = async (jobId, totalAmount, notes) => {
  const jobRef = db.collection('bookings').doc(jobId);
  const job = await jobRef.get();
  if (!job.exists) throw new Error('Job not found');
  await jobRef.update({
    status: 'COMPLETED',
    totalAmount,
    notes: notes || '',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const completedJob = await jobRef.get();
  return { id: completedJob.id, ...completedJob.data() };
};

// Request additional work - POST /api/jobs/:id/additional-work
exports.requestAdditionalWork = async (jobId, description, estimatedCost) => {
  const jobRef = db.collection('bookings').doc(jobId);
  const job = await jobRef.get();
  if (!job.exists) throw new Error('Job not found');
  const additionalWorkRef = db.collection('additionalWork').doc();
  const additionalWork = {
    id: additionalWorkRef.id,
    jobId,
    description,
    estimatedCost,
    status: 'pending',
    requestedAt: new Date().toISOString()
  };
  await additionalWorkRef.set(additionalWork);
  return additionalWork;
};

// Upload job photos - POST /api/jobs/:id/photos
exports.uploadJobPhotos = async (jobId, files) => {
  const uploadDir = path.join(__dirname, '../../uploads/jobs', jobId);
  await fsp.mkdir(uploadDir, { recursive: true });

  const photoUrls = [];
  for (const file of files) {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${file.originalname}`;
    const filepath = path.join(uploadDir, uniqueName);
    await fsp.writeFile(filepath, file.buffer);
    photoUrls.push(`/uploads/jobs/${jobId}/${uniqueName}`);
  }

  const jobRef = db.collection('bookings').doc(jobId);
  await jobRef.update({
    photos: admin.firestore.FieldValue.arrayUnion(...photoUrls),
    updatedAt: new Date().toISOString(),
  });
  return photoUrls;
};
