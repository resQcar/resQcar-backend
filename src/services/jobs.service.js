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