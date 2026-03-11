const { db } = require('../config/firebase');

// Update job status
exports.updateJobStatus = async (jobId, status) => {
  const jobRef = db.collection('jobs').doc(jobId);
  const job = await jobRef.get();
  if (!job.exists) throw new Error('Job not found');
  await jobRef.update({
    status,
    updatedAt: new Date().toISOString()
  });
  const updatedJob = await jobRef.get();
  return { id: updatedJob.id, ...updatedJob.data() };
};

// Complete job
exports.completeJob = async (jobId, totalAmount, notes) => {
  const jobRef = db.collection('jobs').doc(jobId);
  const job = await jobRef.get();
  if (!job.exists) throw new Error('Job not found');
  await jobRef.update({
    status: 'completed',
    totalAmount,
    notes: notes || '',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const completedJob = await jobRef.get();
  return { id: completedJob.id, ...completedJob.data() };
};
// Request additional work
exports.requestAdditionalWork = async (jobId, description, estimatedCost) => {
  const jobRef = db.collection('jobs').doc(jobId);
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
const path = require('path');
const fs = require('fs');

// Upload job photos to local storage
exports.uploadJobPhotos = async (jobId, files) => {
  const uploadDir = path.join(__dirname, '../../uploads/jobs', jobId);

  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const photoUrls = [];

  for (const file of files) {
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);
    photoUrls.push(`/uploads/jobs/${jobId}/${filename}`);
  }

  // Save photo URLs to Firestore
  const jobRef = db.collection('jobs').doc(jobId);
  await jobRef.update({
    photos: photoUrls,
    updatedAt: new Date().toISOString()
  });

  return photoUrls;
};
