const { db } = require('../config/firebase');

exports.updateJobStatus = async (jobId, status) => {
  const jobRef = db.collection('jobs').doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    throw new Error('Job not found');
  }

  await jobRef.update({
    status,
    updatedAt: new Date().toISOString()
  });

  const updated = await jobRef.get();
  return updated.data();
};

exports.completeJob = async (jobId, totalAmount, notes) => {
  const jobRef = db.collection('jobs').doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    throw new Error('Job not found');
  }

  await jobRef.update({
    status: 'completed',
    totalAmount,
    notes: notes || '',
    completedAt: new Date().toISOString()
  });

  const updated = await jobRef.get();
  return updated.data();
};
